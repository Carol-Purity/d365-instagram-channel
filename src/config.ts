/**
 * Configuration loaded from environment variables.
 *
 * All secrets are injected by the Azure Container App (as masked secrets),
 * never hard-coded. See infra/mainTemplate.bicep and .env.example.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `See .env.example for the full list.`
    );
  }
  return value.trim();
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : fallback;
}

export interface AppConfig {
  port: number;

  // Instagram / Meta
  instagramAppSecret: string;
  instagramVerifyToken: string;
  instagramAccessToken: string;
  instagramAccountId: string;
  graphApiVersion: string;
  graphBaseUrl: string;

  // Direct Line (Dynamics 365 Omnichannel custom channel)
  directLineSecret: string;
  directLineBaseUrl: string;

  // Relay behaviour
  pollIntervalMs: number;
  conversationIdleMs: number;
}

let cached: AppConfig | undefined;

export function loadConfig(): AppConfig {
  if (cached) return cached;

  cached = {
    port: parseInt(optional("PORT", "8080"), 10),

    instagramAppSecret: required("INSTAGRAM_APP_SECRET"),
    instagramVerifyToken: required("INSTAGRAM_VERIFY_TOKEN"),
    instagramAccessToken: required("INSTAGRAM_ACCESS_TOKEN"),
    instagramAccountId: required("INSTAGRAM_ACCOUNT_ID"),
    graphApiVersion: optional("GRAPH_API_VERSION", "v23.0"),
    graphBaseUrl: optional("GRAPH_BASE_URL", "https://graph.instagram.com"),

    directLineSecret: required("DIRECT_LINE_SECRET"),
    directLineBaseUrl: optional(
      "DIRECT_LINE_BASE_URL",
      "https://directline.botframework.com"
    ),

    pollIntervalMs: parseInt(optional("POLL_INTERVAL_MS", "2000"), 10),
    conversationIdleMs: parseInt(
      optional("CONVERSATION_IDLE_MS", String(24 * 60 * 60 * 1000)),
      10
    ),
  };

  return cached;
}
