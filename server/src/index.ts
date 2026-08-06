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
import { thawedMilkRouter } from "./routes/thawedMilk.js";
import { growthRouter } from "./routes/growth.js";
import { logError } from "./errorLog.js";
import { logUsage } from "./usageLog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

// Activity trail: any state-changing request (non-GET) counts as "using a feature".
// Reads `req.body`/`req.query` at response-finish time (not now), so this also picks
// up multipart uploads whose body multer only populates inside the route handler.
app.use((req, res, next) => {
  if (req.method !== "GET") {
    res.on("finish", () => {
      const account =
        (req.body?.account as string | undefined) ??
        (req.query?.account as string | undefined) ??
        (req.body?.targetAccount as string | undefined) ??
        null;
      logUsage(`${req.method} ${req.originalUrl.split("?")[0]}`, res.statusCode, account);
    });
  }
  next();
});

app.use("/api/records", recordsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/auth", authRouter);
app.use("/api/vaccines", vaccinesRouter);
app.use("/api/diary", diaryRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/thawed-milk", thawedMilkRouter);
app.use("/api/growth", growthRouter);

const webDist = path.join(__dirname, "..", "..", "web", "dist");
app.use(express.static(webDist));
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(webDist, "index.html"));
});

// Safety net for any exception a route handler didn't already catch — logs it and
// still returns JSON (never leaks a raw HTML/stack response to the client).
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : "Đã có lỗi xảy ra";
  const fullPath = req.originalUrl.split("?")[0];
  console.error(`Lỗi chưa được xử lý tại ${req.method} ${fullPath}:`, err);
  logError(`${req.method} ${fullPath}`, 500, message);
  res.status(500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Lạc Lạc Bé Yêu server đang chạy tại http://localhost:${PORT}`);
});
