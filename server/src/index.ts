import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./db/index.js";
import { recordsRouter } from "./routes/records.js";
import { statsRouter } from "./routes/stats.js";
import { authRouter } from "./routes/auth.js";
import { vaccinesRouter } from "./routes/vaccines.js";
import { diaryRouter } from "./routes/diary.js";
import { uploadsRouter } from "./routes/uploads.js";
import { logError } from "./errorLog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

app.use("/api/records", recordsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/auth", authRouter);
app.use("/api/vaccines", vaccinesRouter);
app.use("/api/diary", diaryRouter);
app.use("/api/uploads", uploadsRouter);

const webDist = path.join(__dirname, "..", "..", "web", "dist");
app.use(express.static(webDist));
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(webDist, "index.html"));
});

// Safety net for any exception a route handler didn't already catch — logs it and
// still returns JSON (never leaks a raw HTML/stack response to the client).
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : "Đã có lỗi xảy ra";
  console.error(`Lỗi chưa được xử lý tại ${req.method} ${req.path}:`, err);
  logError(`${req.method} ${req.path}`, 500, message);
  res.status(500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Lạc Lạc Bé Yêu server đang chạy tại http://localhost:${PORT}`);
});
