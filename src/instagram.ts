import crypto from "node:crypto";
import type { AppConfig } from "./config.js";
import type { InstagramInboundMessage } from "./types.js";
import { log } from "./logger.js";

/**
 * Verify the X-Hub-Signature-256 header Meta sends with every webhook POST.
 * Returns true only when the signature matches the raw request body.
 */
export function verifySignature(
  config: AppConfig,
  rawBody: Buffer,
  signatureHeader: string | undefined
): boolean {
  if (!signatureHeader) return false;

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", config.instagramAppSecret)
      .update(rawBody)
      .digest("hex");

  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Parse a raw Instagram webhook payload into a flat list of inbound messages.
 * Echo events (messages the page itself sent) are flagged so the relay can skip them.
 */
export function parseWebhook(payload: unknown): InstagramInboundMessage[] {
  const out: InstagramInboundMessage[] = [];
  const body = payload as {
    object?: string;
    entry?: Array<{
      id?: string;
      messaging?: Array<{
        sender?: { id?: string };
        recipient?: { id?: string };
        message?: {
          mid?: string;
          text?: string;
          is_echo?: boolean;
          attachments?: Array<{ type?: string; payload?: { url?: string } }>;
        };
      }>;
    }>;
  };

  if (!body || body.object !== "instagram" || !Array.isArray(body.entry)) {
    return out;
  }

  for (const entry of body.entry) {
    for (const event of entry.messaging ?? []) {
      const msg = event.message;
      if (!msg) continue; // ignore reactions/seen/postbacks for v1

      const attachmentUrls: string[] = [];
      for (const att of msg.attachments ?? []) {
        if (att.payload?.url) attachmentUrls.push(att.payload.url);
      }

      out.push({
        senderId: event.sender?.id ?? "",
        recipientId: event.recipient?.id ?? entry.id ?? "",
        text: msg.text,
        attachmentUrls,
        messageId: msg.mid,
        isEcho: Boolean(msg.is_echo),
      });
    }
  }

  return out;
}

/** Send a plain text message to an Instagram user via the Graph Send API. */
export async function sendText(
  config: AppConfig,
  recipientIgsid: string,
  text: string
): Promise<void> {
  const url = `${config.graphBaseUrl}/${config.graphApiVersion}/${config.instagramAccountId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.instagramAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientIgsid },
      message: { text },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    log.error("Instagram sendText failed", {
      status: res.status,
      recipient: recipientIgsid,
      detail,
    });
    throw new Error(`Instagram sendText failed: ${res.status}`);
  }
}

/** Send a media attachment (image/audio/video/file) by URL to an Instagram user. */
export async function sendAttachment(
  config: AppConfig,
  recipientIgsid: string,
  attachmentUrl: string,
  type: "image" | "audio" | "video" | "file" = "image"
): Promise<void> {
  const url = `${config.graphBaseUrl}/${config.graphApiVersion}/${config.instagramAccountId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.instagramAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientIgsid },
      message: { attachment: { type, payload: { url: attachmentUrl } } },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    log.error("Instagram sendAttachment failed", {
      status: res.status,
      recipient: recipientIgsid,
      detail,
    });
    throw new Error(`Instagram sendAttachment failed: ${res.status}`);
  }
}
