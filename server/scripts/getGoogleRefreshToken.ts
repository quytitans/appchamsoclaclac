import "dotenv/config";
import { createServer } from "node:http";
import { URL } from "node:url";
import { google } from "googleapis";

const PORT = 53682;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/oauth2callback`;
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

async function main() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      "Thiếu GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET trong server/.env.\n" +
        "Điền 2 giá trị này trước (xem GOOGLE_DRIVE_SETUP.md), rồi chạy lại: npm run drive:auth"
    );
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  console.log("\nMở link sau trong trình duyệt, đăng nhập Google và đồng ý cấp quyền:\n");
  console.log(authUrl + "\n");
  console.log(`Đang chờ trình duyệt redirect về ${REDIRECT_URI} ...\n`);

  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      if (!req.url) return;
      const url = new URL(req.url, REDIRECT_URI);
      const authCode = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.end("Cấp quyền thất bại, có thể đóng tab này.");
        server.close();
        reject(new Error(error));
        return;
      }

      if (authCode) {
        res.end("Đã nhận mã xác thực — có thể đóng tab này và quay lại terminal.");
        server.close();
        resolve(authCode);
      }
    });
    server.listen(PORT);
  });

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    console.error(
      "\nKhông nhận được refresh_token. Có thể Google account này đã từng cấp quyền cho app trước đó.\n" +
        "Vào https://myaccount.google.com/permissions , gỡ quyền của app, rồi chạy lại: npm run drive:auth"
    );
    process.exit(1);
  }

  console.log("\nThành công! Dán dòng sau vào server/.env:\n");
  console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}\n`);
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
