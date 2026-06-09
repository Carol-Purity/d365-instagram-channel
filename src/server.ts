import express, { type Request, type Response } from "express";
import { loadConfig } from "./config.js";
import { verifySignature, parseWebhook } from "./instagram.js";
import { Relay } from "./relay.js";
import { log } from "./logger.js";

const config = loadConfig();
const relay = new Relay(config);
relay.start();

const app = express();

// Capture the raw body so we can verify Meta's HMAC signature.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as Request & { rawBody?: Buffer }).rawBody = buf;
    },
  })
);

/** Liveness/health probe used by Azure Container Apps. */
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", activeConversations: relay.activeConversations() });
});

app.get("/", (_req: Request, res: Response) => {
  res.json({
    service: "d365-instagram-channel",
    status: "running",
    webhook: "/webhooks/instagram",
  });
});

/**
 * Meta webhook verification handshake (GET).
 * Meta calls this once when you register the callback URL.
 */
app.get("/webhooks/instagram", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.instagramVerifyToken) {
    log.info("Webhook verified by Meta");
    res.status(200).send(String(challenge ?? ""));
    return;
  }
  log.warn("Webhook verification failed");
  res.sendStatus(403);
});

/**
 * Instagram event delivery (POST).
 * Verifies the signature, then routes each message into Direct Line.
 */
app.post("/webhooks/instagram", async (req: Request, res: Response) => {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from("");
  const signature = req.header("x-hub-signature-256");

  if (!verifySignature(config, rawBody, signature)) {
    log.warn("Rejected webhook with invalid signature");
    res.sendStatus(401);
    return;
  }

  // Acknowledge fast (Meta expects a 200 within seconds); process asynchronously.
  res.sendStatus(200);

  const messages = parseWebhook(req.body);
  for (const message of messages) {
    relay.handleInbound(message).catch((err) => {
      log.error("Failed to handle inbound message", {
        igsid: message.senderId,
        error: (err as Error).message,
      });
    });
  }
});

const server = app.listen(config.port, () => {
  log.info("Relay listening", { port: config.port });
});

function shutdown(signal: string) {
  log.info("Shutting down", { signal });
  relay.stop();
  server.close(() => process.exit(0));
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
