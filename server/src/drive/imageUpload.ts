import { Readable } from "node:stream";
import sharp from "sharp";
import { getDriveClient, getDriveFolderId } from "./client.js";

const FULL_MAX_DIMENSION = 1600;
const FULL_QUALITY = 82;
const THUMB_MAX_DIMENSION = 480;

export interface ProcessedImage {
  fullBuffer: Buffer;
  width: number;
  height: number;
}

export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
  const oriented = sharp(buffer).rotate();

  let metadata;
  try {
    metadata = await oriented.metadata();
  } catch {
    throw new Error("Không đọc được ảnh — định dạng có thể không được hỗ trợ (thử lại với JPEG/PNG/WebP)");
  }

  // Trước đây còn resize+encode thêm 1 bản "thumb" (480px) riêng để upload thành file thứ 2 trên
  // Drive. Dư thừa: Google đã tự resize theo tham số =w{N} khi hotlink qua lh3.googleusercontent.com
  // (xem driveImageUrl bên dưới), nên chỉ cần 1 file gốc — thumbUrl trỏ vào chính file đó với width
  // nhỏ hơn. Bỏ bản thumb giúp giảm một nửa số lần resize/encode (CPU) và số round-trip Drive/ảnh.
  const fullBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: FULL_MAX_DIMENSION, height: FULL_MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: FULL_QUALITY })
    .toBuffer();

  return {
    fullBuffer,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
  };
}

async function uploadBufferToDrive(buffer: Buffer, filename: string): Promise<string> {
  const drive = getDriveClient();
  const folderId = getDriveFolderId();

  const created = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType: "image/webp",
      body: Readable.from(buffer),
    },
    fields: "id",
  });

  const fileId = created.data.id;
  if (!fileId) {
    throw new Error("Google Drive không trả về file id sau khi upload");
  }

  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return fileId;
}

// `webContentLink` (drive.google.com/uc?...) bị Chrome chặn khi dùng làm src cho <img> thật
// (Google trả header Cross-Origin-Resource-Policy: same-site trên response cuối) — chỉ "hoạt động"
// khi test bằng curl vì curl không áp policy đó. Dùng định dạng lh3.googleusercontent.com để hotlink
// được thật sự, đồng thời tận dụng luôn khả năng resize theo tham số =w{N} của Google.
function driveImageUrl(fileId: string, width: number): string {
  return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`;
}

export interface UploadImageResult {
  fullFileId: string;
  fullUrl: string;
  thumbFileId: string;
  thumbUrl: string;
  width: number;
  height: number;
}

export async function uploadImage(buffer: Buffer): Promise<UploadImageResult> {
  const processed = await processImage(buffer);
  const stamp = Date.now();

  // 1 file duy nhất, 1 lần create + 1 lần permissions.create — full_url và thumb_url đều trỏ
  // vào cùng fileId, chỉ khác tham số width để Google CDN tự resize khi phục vụ.
  const fullFileId = await uploadBufferToDrive(processed.fullBuffer, `laclac_${stamp}_full.webp`);

  return {
    fullFileId,
    fullUrl: driveImageUrl(fullFileId, FULL_MAX_DIMENSION),
    thumbFileId: fullFileId,
    thumbUrl: driveImageUrl(fullFileId, THUMB_MAX_DIMENSION),
    width: processed.width,
    height: processed.height,
  };
}

export async function deleteDriveFiles(fileIds: string[]): Promise<void> {
  const drive = getDriveClient();
  // full_file_id và thumb_file_id nay thường trỏ cùng 1 file (xem uploadImage) — dedupe để không
  // gọi delete 2 lần trên cùng 1 fileId (lần 2 sẽ 404, chỉ gây log lỗi thừa chứ không hại gì,
  // nhưng dedupe vẫn sạch hơn và đỡ tốn 1 request Drive không cần thiết).
  const uniqueIds = [...new Set(fileIds)];
  await Promise.all(
    uniqueIds.map((fileId) =>
      drive.files.delete({ fileId }).catch((err) => {
        console.error(`Không xoá được file Drive ${fileId}:`, err);
      })
    )
  );
}
