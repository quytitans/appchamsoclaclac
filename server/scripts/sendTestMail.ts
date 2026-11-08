/**
 * Manual smoke test for the mail module.
 *
 *   npm run mail:test -- you@example.com other@example.com
 *
 * With no addresses it only verifies the Gmail credentials (sends nothing).
 */
import "dotenv/config";
import { sendMail, verifyMailTransport } from "../src/mail/index.js";

const recipients = process.argv.slice(2);

await verifyMailTransport();
console.log("✓ Kết nối Gmail SMTP OK");

if (recipients.length > 0) {
  const result = await sendMail({
    title: "Lạc Lạc Bé Yêu — mail thử nghiệm",
    to: recipients,
    html: `<h2 style="color:#e86a92">Xin chào 👋</h2>
<p>Đây là mail thử nghiệm từ module gửi mail của <b>Lạc Lạc Bé Yêu</b>.</p>
<p>Gửi lúc: ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>`,
  });
  console.log(JSON.stringify(result, null, 2));
}

process.exit(0);
