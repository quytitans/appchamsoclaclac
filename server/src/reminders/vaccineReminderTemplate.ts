import type { VaccineProfileType } from "../types.js";

export interface ReminderDose {
  vaccineName: string;
  diseaseName: string;
  doseNumber: number;
  totalDoses: number | null;
  /** YYYY-MM-DD */
  date: string;
  daysLeft: number;
  location: string | null;
  note: string | null;
}

export interface ReminderEmailInput {
  profileName: string;
  profileType: VaccineProfileType;
  doses: ReminderDose[];
  appUrl: string;
}

const PROFILE_EMOJI: Record<VaccineProfileType, string> = {
  baby: "👶",
  male: "👨",
  female: "👩",
  cat: "🐱",
  dog: "🐶",
};

const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

// Every value below that came from the user (names, location, note) MUST go through
// esc() — it's rendered inside an HTML email.
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatViDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function daysLabel(daysLeft: number): string {
  return daysLeft === 1 ? "Ngày mai" : `Còn ${daysLeft} ngày`;
}

function urgency(daysLeft: number): { bg: string; fg: string; border: string } {
  if (daysLeft <= 1) return { bg: "#fde8e8", fg: "#c62828", border: "#ef5350" };
  if (daysLeft <= 3) return { bg: "#fff3e0", fg: "#e65100", border: "#ffa726" };
  return { bg: "#e8f1fd", fg: "#1565c0", border: "#64b5f6" };
}

function doseLabel(d: ReminderDose): string {
  return d.totalDoses ? `Mũi ${d.doseNumber}/${d.totalDoses}` : `Mũi ${d.doseNumber}`;
}

export function buildReminderSubject(input: ReminderEmailInput): string {
  const first = input.doses[0];
  if (input.doses.length === 1) {
    return `💉 Nhắc lịch tiêm ${input.profileName}: ${first.vaccineName} (${doseLabel(first).toLowerCase()}) — ${daysLabel(
      first.daysLeft
    ).toLowerCase()}`;
  }
  return `💉 Nhắc lịch tiêm ${input.profileName}: ${input.doses.length} mũi sắp tới, gần nhất ${daysLabel(
    first.daysLeft
  ).toLowerCase()}`;
}

function doseCard(d: ReminderDose): string {
  const u = urgency(d.daysLeft);
  const row = (icon: string, label: string, value: string) => `
              <tr>
                <td style="padding:4px 0;width:24px;vertical-align:top;font-size:15px">${icon}</td>
                <td style="padding:4px 0;color:#6b6b80;font-size:14px;width:76px;vertical-align:top">${label}</td>
                <td style="padding:4px 0;color:#2d2d3a;font-size:14px;vertical-align:top">${value}</td>
              </tr>`;
  return `
      <tr><td style="padding:0 0 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:#ffffff;border:1px solid #f0e4ea;border-left:5px solid ${u.border};border-radius:12px">
          <tr><td style="padding:18px 20px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:top">
                  <div style="font-size:18px;font-weight:700;color:#2d2d3a;line-height:1.3">${esc(d.vaccineName)}</div>
                  <div style="font-size:13px;color:#8a8a9e;margin-top:2px">Phòng: ${esc(d.diseaseName)}</div>
                </td>
                <td align="right" style="vertical-align:top;white-space:nowrap;padding-left:12px">
                  <span style="display:inline-block;background:${u.bg};color:${u.fg};font-weight:700;font-size:13px;padding:6px 12px;border-radius:999px">${daysLabel(
                    d.daysLeft
                  )}</span>
                </td>
              </tr>
            </table>
            <div style="margin:14px 0 10px;padding:12px 14px;background:#fff7fa;border-radius:10px">
              <div style="font-size:12px;color:#8a8a9e;text-transform:uppercase;letter-spacing:.5px">Ngày tiêm dự kiến</div>
              <div style="font-size:20px;font-weight:700;color:#d6336c;margin-top:2px">${formatViDate(d.date)}</div>
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${row(
              "💉",
              "Mũi tiêm",
              `<b>${doseLabel(d)}</b>`
            )}${d.location ? row("📍", "Địa điểm", esc(d.location)) : ""}${
              d.note ? row("📝", "Ghi chú", esc(d.note).replace(/\n/g, "<br>")) : ""
            }
            </table>
          </td></tr>
        </table>
      </td></tr>`;
}

export function buildReminderHtml(input: ReminderEmailInput): string {
  const emoji = PROFILE_EMOJI[input.profileType] ?? "💉";
  const name = esc(input.profileName);
  const first = input.doses[0];
  const preheader =
    input.doses.length === 1
      ? `${first.vaccineName} — ${formatViDate(first.date)} (${daysLabel(first.daysLeft).toLowerCase()})`
      : `${input.doses.length} mũi tiêm sắp tới, gần nhất ${formatViDate(first.date)}`;

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Nhắc lịch tiêm phòng</title>
</head>
<body style="margin:0;padding:0;background:#fdf2f6;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf2f6">
  <tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
      <tr><td style="background:linear-gradient(135deg,#f783ac,#e64980);background-color:#ec5f94;border-radius:16px 16px 0 0;padding:28px 24px;text-align:center">
        <div style="font-size:40px;line-height:1">${emoji}</div>
        <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:10px">Nhắc lịch tiêm phòng</div>
        <div style="color:#ffe3ee;font-size:15px;margin-top:4px">Sổ tiêm chủng: <b style="color:#ffffff">${name}</b></div>
      </td></tr>
      <tr><td style="background:#fffafc;padding:24px 20px 8px;border-left:1px solid #f6dbe6;border-right:1px solid #f6dbe6">
        <p style="margin:0 0 6px;font-size:15px;color:#2d2d3a">Em chào anh/chị,</p>
        <p style="margin:0 0 20px;font-size:15px;color:#2d2d3a;line-height:1.55">Em xin nhắc anh/chị lịch tiêm sắp tới của <b style="color:#d6336c">${name}</b>:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${input.doses
          .map(doseCard)
          .join("")}
        </table>
        <p style="margin:4px 0 20px;font-size:14px;color:#55556a;line-height:1.55">💡 Anh/chị nhớ mang theo sổ tiêm chủng khi đi tiêm nhé. Tiêm xong anh/chị cập nhật lại trong ứng dụng để em nhắc đúng những mũi tiếp theo ạ.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 24px">
          <tr><td style="background:#e64980;border-radius:999px">
            <a href="${esc(input.appUrl)}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">Mở sổ tiêm chủng</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="background:#fbe9f0;border-radius:0 0 16px 16px;padding:16px 20px;text-align:center;border:1px solid #f6dbe6;border-top:0">
        <p style="margin:0;font-size:12px;color:#8a7a84;line-height:1.6">Em là trợ lý nhắc lịch của <b>Lạc Lạc Bé Yêu</b> 💗<br>
        Anh/chị nhận được mail này vì email đã được thêm vào sổ tiêm chủng <b>${name}</b>.<br>
        Muốn ngừng nhận, anh/chị chỉ cần xoá email khỏi sổ trong ứng dụng ạ.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function buildReminderText(input: ReminderEmailInput): string {
  const lines = [
    "Em chào anh/chị,",
    "",
    `Em xin nhắc anh/chị lịch tiêm sắp tới của ${input.profileName}:`,
    "",
  ];
  for (const d of input.doses) {
    lines.push(`• ${d.vaccineName} — ${doseLabel(d)} (phòng ${d.diseaseName})`);
    lines.push(`  Ngày tiêm dự kiến: ${formatViDate(d.date)} — ${daysLabel(d.daysLeft)}`);
    if (d.location) lines.push(`  Địa điểm: ${d.location}`);
    if (d.note) lines.push(`  Ghi chú: ${d.note.replace(/\n/g, "\n           ")}`);
    lines.push("");
  }
  lines.push(
    "Anh/chị nhớ mang theo sổ tiêm chủng khi đi tiêm nhé.",
    `Mở sổ tiêm chủng: ${input.appUrl}`,
    "",
    "— Trợ lý nhắc lịch Lạc Lạc Bé Yêu",
    `Muốn ngừng nhận, anh/chị chỉ cần xoá email khỏi sổ "${input.profileName}" trong ứng dụng.`
  );
  return lines.join("\n");
}
