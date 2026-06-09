# Customer quickstart

The short version. Hand this to whoever is doing the deployment.

---

## Before you start, collect these

From **Meta** (see [01-meta-setup.md](01-meta-setup.md)):

- [ ] Instagram account ID (IG_ID)
- [ ] App Secret
- [ ] Long‑lived access token
- [ ] A verify token (invent one, e.g. `myco-ig-verify-1234`)

From **Dynamics 365** (see [02-d365-setup.md](02-d365-setup.md)):

- [ ] Direct Line secret

---

## Deploy (5 boxes, 1 button)

1. Click **Deploy to Azure** in the [README](../README.md).
2. Pick a **Region** and a resource group.
3. On the **Instagram** tab, paste: account ID, App Secret, verify token, access token.
4. On the **Dynamics 365** tab, paste: Direct Line secret.
5. **Review + create** → **Create**. Wait ~2–3 minutes.
6. Open **Outputs** → copy **`webhookUrl`**.

---

## Finish in Meta

1. Meta app → **Instagram → Webhooks**.
2. Callback URL = the **`webhookUrl`** you copied.
3. Verify token = the **same** string you invented.
4. **Verify and save**, then subscribe to **`messages`**.

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
| Agent reply never reaches Instagram | Access token expired, or outside 24h window | Refresh the long‑lived token and update the Container App secret `instagram-access-token`; ensure you reply within 24h. |
| **401** in relay logs on webhook POST | App Secret mismatch | Update the `instagram-app-secret` Container App secret to match the Meta app. |
| Nothing happens at all | Relay not healthy | Open the `healthUrl` output; it should return `{"status":"ok"}`. Check Container App logs in Log Analytics. |

### Where are the logs?

Azure portal → your **Container App** → **Monitoring → Log stream**, or the linked **Log Analytics** workspace. The relay logs structured JSON lines.

### How to update a secret

Azure portal → Container App → **Settings → Secrets** → edit the value → the app picks it up on the next revision/restart.
