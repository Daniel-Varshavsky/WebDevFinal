// server/src/index.ts
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { authRouter } from "./routes_auth";

/**
 * Boots the Express authentication server.
 */
async function main() {
  const app = express();

  // If you later call Express directly from the browser, enable CORS with credentials.
  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/health", (_, res) => res.json({ ok: true }));

  app.use("/auth", authRouter);

  const port = Number(process.env.AUTH_PORT ?? 4000);
  app.listen(port, () => console.log(`Express auth server listening on ${port}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});