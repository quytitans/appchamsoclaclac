import { auth, drive } from "@googleapis/drive";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Chưa cấu hình Google Drive: thiếu biến môi trường ${name} — xem hướng dẫn trong GOOGLE_DRIVE_SETUP.md`
    );
  }
  return value;
}

export function getDriveFolderId(): string {
  return requireEnv("GOOGLE_DRIVE_FOLDER_ID");
}

export function getDriveClient() {
  const clientId = requireEnv("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_OAUTH_CLIENT_SECRET");
  const refreshToken = requireEnv("GOOGLE_OAUTH_REFRESH_TOKEN");

  const oauth2Client = new auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return drive({ version: "v3", auth: oauth2Client });
}
