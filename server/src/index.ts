import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./db/index.js";
import { recordsRouter } from "./routes/records.js";
import { statsRouter } from "./routes/stats.js";
import { authRouter } from "./routes/auth.js";
import { vaccinesRouter } from "./routes/vaccines.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

app.use("/api/records", recordsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/auth", authRouter);
app.use("/api/vaccines", vaccinesRouter);

const webDist = path.join(__dirname, "..", "..", "web", "dist");
app.use(express.static(webDist));
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(webDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Lạc Lạc Bé Yêu server đang chạy tại http://localhost:${PORT}`);
});
