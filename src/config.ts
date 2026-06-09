/**
 * Configuration loaded from environment variables.
 *
 * All secrets are injected by the Azure Container App (as masked secrets),
 * never hard-coded. See infra/mainTemplate.bicep and .env.example.
 *
 * NOTE: loadConfig() never throws on missing values. Instead the relay boots
 * in "setup" mode and serves the Setup Assistant page so the user can see and
 * fix what is missing, rather than hitting a cryptic crash loop. Use
 * getConfigIssues() to find out whether the relay is fully configured.
 */

function value(name: string): string {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : "";
}

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : fallback;
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

/** A single missing or invalid configuration value, in plain language. */
export interface ConfigIssue {
  /** Environment variable / secret name (e.g. INSTAGRAM_ACCESS_TOKEN). */
  field: string;
  /** Friendly label shown in the Setup Assistant. */
  label: string;
  /** What is wrong and how to fix it. */
  message: string;
}

let cached: AppConfig | undefined;

export function loadConfig(): AppConfig {
  if (cached) return cached;

  cached = {
    port: parseInt(optional("PORT", "8080"), 10),

    instagramAppSecret: value("INSTAGRAM_APP_SECRET"),
    instagramVerifyToken: value("INSTAGRAM_VERIFY_TOKEN"),
    instagramAccessToken: value("INSTAGRAM_ACCESS_TOKEN"),
    instagramAccountId: value("INSTAGRAM_ACCOUNT_ID"),
    graphApiVersion: optional("GRAPH_API_VERSION", "v23.0"),
    graphBaseUrl: optional("GRAPH_BASE_URL", "https://graph.instagram.com"),

    directLineSecret: value("DIRECT_LINE_SECRET"),
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

const REQUIRED_FIELDS: Array<{
  key: keyof AppConfig;
  field: string;
  label: string;
}> = [
  { key: "instagramAccountId", field: "INSTAGRAM_ACCOUNT_ID", label: "Instagram account ID" },
  { key: "instagramAppSecret", field: "INSTAGRAM_APP_SECRET", label: "Meta App Secret" },
  { key: "instagramAccessToken", field: "INSTAGRAM_ACCESS_TOKEN", label: "Instagram access token" },
  { key: "instagramVerifyToken", field: "INSTAGRAM_VERIFY_TOKEN", label: "Webhook verify token" },
  { key: "directLineSecret", field: "DIRECT_LINE_SECRET", label: "Direct Line secret" },
];

/**
 * Return a list of everything that is missing or obviously invalid.
 * An empty list means the relay is fully configured and ready to run.
 */
export function getConfigIssues(config: AppConfig): ConfigIssue[] {
  const issues: ConfigIssue[] = [];

  for (const r of REQUIRED_FIELDS) {
    const v = String(config[r.key] ?? "");
    if (v.trim() === "") {
      issues.push({
        field: r.field,
        label: r.label,
        message: `${r.label} is not set yet.`,
      });
    }
  }

  if (
    config.instagramAccountId.trim() !== "" &&
    !/^[0-9]{5,}$/.test(config.instagramAccountId.trim())
  ) {
    issues.push({
      field: "INSTAGRAM_ACCOUNT_ID",
      label: "Instagram account ID",
      message: "The Instagram account ID should be numbers only.",
    });
  }

  return issues;
}

/** True when every required value is present and valid. */
export function isConfigured(config: AppConfig): boolean {
  return getConfigIssues(config).length === 0;
}
