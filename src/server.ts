import express, { type Request, type Response, type NextFunction } from "express";
import crypto from "node:crypto";
import { loadConfig, getConfigIssues, isConfigured } from "./config.js";
import { verifySignature, parseWebhook } from "./instagram.js";
import * as ig from "./instagram.js";
import * as dl from "./directline.js";
import { Relay } from "./relay.js";
import { renderSetupPage } from "./setupPage.js";
import { log } from "./logger.js";

const config = loadConfig();
const relay = new Relay(config);

// Only start relaying when every value is present; otherwise boot in "setup mode"
// and serve the Setup Assistant so the user can see and fix what is missing
// instead of hitting a crash loop.
const configured = isConfigured(config);
if (configured) {
  relay.start();
} else {
  log.warn("Relay started in setup mode: configuration incomplete", {
    missing: getConfigIssues(config).map((i) => i.field),
  });
}

const app = express();

// Capture the raw body so we can verify Meta's HMAC signature.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as Request & { rawBody?: Buffer }).rawBody = buf;
    },
  })
);

/** Build the public webhook URL from the incoming request (behind ACA ingress). */
function publicBaseUrl(req: Request): string {
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0] ??
    req.protocol;
  const host =
    (req.headers["x-forwarded-host"] as string | undefined) ??
    req.get("host") ??
    "localhost";
  return `${proto}://${host}`;
}

/** Timing-safe string comparison. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Gate sensitive Setup Assistant actions behind the Meta App Secret, sent by the
 * page as the `x-setup-key` header. This keeps the public endpoint from leaking
 * validation results or exchanging tokens for anyone who finds the URL.
 */
function requireUnlock(req: Request, res: Response, next: NextFunction): void {
  const key = req.header("x-setup-key") ?? "";
  if (!config.instagramAppSecret || !safeEqual(key, config.instagramAppSecret)) {
    res
      .status(401)
      .json({ ok: false, error: "Enter your Meta App Secret to unlock the tests." });
    return;
  }
  next();
}

/** Liveness/health probe used by Azure Container Apps. */
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    configured,
    pendingSetup: getConfigIssues(config).length,
    activeConversations: relay.activeConversations(),
  });
});

app.get("/", (_req: Request, res: Response) => {
  res.json({
    service: "d365-instagram-channel",
    status: "running",
    configured,
    setup: "/setup",
    webhook: "/webhooks/instagram",
  });
});

// ---- Setup Assistant ------------------------------------------------------

/** The friendly setup page (safe, static HTML — actions are gated separately). */
app.get("/setup", (_req: Request, res: Response) => {
  res.type("html").send(renderSetupPage());
});

/** Non-sensitive status: which values are present (never the values themselves). */
app.get("/api/status", (req: Request, res: Response) => {
  res.json({
    configured,
    fields: {
      INSTAGRAM_ACCOUNT_ID: config.instagramAccountId.trim() !== "",
      INSTAGRAM_APP_SECRET: config.instagramAppSecret.trim() !== "",
      INSTAGRAM_ACCESS_TOKEN: config.instagramAccessToken.trim() !== "",
      INSTAGRAM_VERIFY_TOKEN: config.instagramVerifyToken.trim() !== "",
      DIRECT_LINE_SECRET: config.directLineSecret.trim() !== "",
    },
    webhookUrl: `${publicBaseUrl(req)}/webhooks/instagram`,
  });
});

/** Confirm the unlock key (App Secret) without performing any action. */
app.post("/api/unlock", requireUnlock, (_req: Request, res: Response) => {
  res.json({ ok: true });
});

/** Live-test the Instagram access token. */
app.post(
  "/api/validate/instagram",
  requireUnlock,
  async (_req: Request, res: Response) => {
    try {
      const profile = await ig.fetchProfile(config);
      res.json({ ok: true, userId: profile.userId, username: profile.username });
    } catch (err) {
      res.json({ ok: false, error: (err as Error).message });
    }
  }
);

/** Live-test the Direct Line secret by opening a throwaway conversation. */
app.post(
  "/api/validate/directline",
  requireUnlock,
  async (_req: Request, res: Response) => {
    try {
      await dl.validateSecret(config);
      res.json({ ok: true });
    } catch (err) {
      res.json({ ok: false, error: (err as Error).message });
    }
  }
);

/** Subscribe the account to Instagram messages (one click, no Meta dashboard). */
app.post(
  "/api/webhook/subscribe",
  requireUnlock,
  async (_req: Request, res: Response) => {
    try {
      await ig.subscribeWebhook(config);
      res.json({ ok: true });
    } catch (err) {
      res.json({ ok: false, error: (err as Error).message });
    }
  }
);

/** Exchange a short-lived Instagram token for a long-lived one (no curl). */
app.post(
  "/api/token/exchange",
  requireUnlock,
  async (req: Request, res: Response) => {
    const shortLivedToken = String(
      (req.body as { shortLivedToken?: unknown })?.shortLivedToken ?? ""
    ).trim();
    if (!shortLivedToken) {
      res.json({ ok: false, error: "Paste a short-lived token first." });
      return;
    }
    try {
      const t = await ig.exchangeLongLivedToken(config, shortLivedToken);
      res.json({ ok: true, accessToken: t.accessToken, expiresIn: t.expiresIn });
    } catch (err) {
      res.json({ ok: false, error: (err as Error).message });
    }
  }
);

// ---- Meta webhook ---------------------------------------------------------

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
  if (!configured) {
    res.status(503).json({ error: "Relay is not configured yet. Open /setup." });
    return;
  }

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
  log.info("Relay listening", { port: config.port, configured, setup: "/setup" });
});

function shutdown(signal: string) {
  log.info("Shutting down", { signal });
  relay.stop();
  server.close(() => process.exit(0));
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
