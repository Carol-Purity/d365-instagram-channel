# Customer quickstart

The short version. Hand this to whoever is doing the deployment.

---

## Before you start, collect these

From **Meta** (see [01-meta-setup.md](01-meta-setup.md)):

- [ ] Instagram account ID (IG_ID)
- [ ] App Secret
- [ ] Long‑lived access token
- [ ] A verify token (the deploy form prefills one — keep it or invent your own, e.g. `myco-ig-verify-1234`)

From **Dynamics 365** (see [02-d365-setup.md](02-d365-setup.md)):

- [ ] Direct Line secret

---

## Deploy (guided wizard, 1 button)

1. Click **Deploy to Azure** in the [README](../README.md).
2. On **Basics**, pick a **Region** and a resource group.
3. The **Before you start** tab lists what you need and links the guides.
4. On the **Instagram keys** tab, paste: account ID, Meta App Secret, access token, and keep (or change) the prefilled **verify token** — write it down, you'll reuse it in Meta.
5. On the **Dynamics 365 key** tab, paste: Direct Line secret.
6. **Advanced (optional)** — just click **Next**.
7. **Review + create** → **Create**. Wait ~2–3 minutes.
8. Open **Outputs** → click **`setupUrl`** to open the **Setup Assistant**.

---

## Confirm everything with the Setup Assistant

The **`setupUrl`** page walks you through the finish line:

1. It shows a **green/red check** for every value you entered.
2. Enter your **Meta App Secret** once to unlock the live tests.
3. Click **Test** next to **Instagram** and **Dynamics 365** — both should go green.
4. **Copy the webhook URL** shown on the page (you'll paste it into Meta next).

---

## Finish in Meta

1. Meta app → **Instagram → Webhooks**.
2. Callback URL = the URL shown in the **Setup Assistant** (or the **`webhookUrl`** output).
3. Verify token = the **exact same** value shown on the deploy form's **Webhook verify token** box.
4. **Verify and save**.
5. Back in the **Setup Assistant**, click **Subscribe my account to messages** — it turns green when done.

---

## Test

1. Agent signs in to the Customer Service workspace, set **Available**.
2. From a different account, DM your Instagram business account.
3. The conversation appears in Dynamics 365. Reply — it shows up in Instagram.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Meta says **"Verification failed"** | Verify token mismatch | Make the token in Azure and in Meta identical. |
| Messages don't reach Dynamics 365 | Wrong Direct Line secret, or no workstream route | Re‑check the secret; confirm the workstream points at the custom channel and routes to a queue with agents. |
| Agent reply never reaches Instagram | Access token expired, or outside 24h window | Use the **Setup Assistant** to mint a fresh long‑lived token, update the `instagram-access-token` secret; ensure you reply within 24h. |
| **401** in relay logs on webhook POST | App Secret mismatch | Update the `instagram-app-secret` Container App secret to match the Meta app. |
| Nothing happens at all | Relay not healthy | Open the `healthUrl` output; it should return `{"status":"ok"}`. Check Container App logs in Log Analytics. |

### Where are the logs?

Azure portal → your **Container App** → **Monitoring → Log stream**, or the linked **Log Analytics** workspace. The relay logs structured JSON lines.

### How to update a secret

Azure portal → Container App → **Settings → Secrets** → edit the value → the app picks it up on the next revision/restart.
