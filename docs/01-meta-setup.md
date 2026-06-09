# Meta / Instagram setup

This guide gets you the **four Instagram values** the relay needs. Set aside **~20 minutes** the first time.

> **Before you begin** you need an **Instagram professional account** (Business or Creator) and a **Meta (Facebook) developer account**.

**At a glance**

| Step | You'll do |
| --- | --- |
| 1 | Create a Meta app |
| 2 | Add the Instagram product |
| 3 | Collect your four values |
| 4 | Deploy the relay, then come back |
| 5 | Point Meta's webhook at the relay |
| 6 | (If serving others) request App Review |
| 7 | Send a test DM |

---

## 1. Create a Meta app

1. Go to <https://developers.facebook.com/apps> → **Create app**.
2. Choose the use case **"Other"** → app type **"Business"**.
3. Give it a name (e.g. *Contoso Instagram Channel*) and create it.

## 2. Add the Instagram product

1. In the app dashboard, find **Instagram** → **Set up**.
2. Use **Instagram API with Instagram Login**.
3. Connect your Instagram professional account when prompted.

## 3. Collect your values

You're gathering **four values**. Keep them in a scratch note as you go.

**① App Secret**
App dashboard → **Settings → Basic → App Secret** → click *Show*.

**② Instagram account ID (IG_ID)**
Instagram product → **API setup** page.
Or call `GET https://graph.instagram.com/v23.0/me?fields=user_id,username` with a user token.

**③ Access token**
Instagram product → generate an **Instagram User access token** for the account, then make it **long‑lived** (see below).

**④ Verify token**
A string **you make up** (e.g. `contoso-ig-verify-9f3a`). The Azure deploy form even prefills one for you — just keep that exact value handy, because you enter the **same** value in Meta's webhook config later.

### Make the access token long‑lived

A freshly generated token is short‑lived. Exchange it for one that lasts **~60 days**:

```bash
curl -s "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=<APP_SECRET>&access_token=<SHORT_LIVED_TOKEN>"
```

The response contains a long‑lived `access_token` — that's the value ③ you paste into Azure.

> Prefer no command line? Deploy first, then use the **Setup Assistant** (the `setupUrl` output) to do this exchange with a button.

> Long‑lived tokens expire (~60 days). When it's time to refresh, the easiest way is the **Setup Assistant** (the `setupUrl` output): paste a fresh short‑lived token and it returns a long‑lived one to copy into the `instagram-access-token` secret — no command line.

---

## 4. Deploy the relay first, then come back

You need the relay's **webhook URL** before you can finish the webhook configuration. Run the **Deploy to Azure** button in the main [README](../README.md), copy the `webhookUrl` output, then continue below.

---

## 5. Configure the webhook

1. In the app dashboard → **Instagram → Configure webhooks** (or **Webhooks** product).
2. **Callback URL**: paste the `webhookUrl` from the Azure deployment output
   (looks like `https://ig-d365-relay.<region>.azurecontainerapps.io/webhooks/instagram`).
3. **Verify token**: enter the **same** string you put in Azure.
4. Click **Verify and save**. Meta calls the relay; it should verify instantly.
5. **Subscribe** to these fields:
   * `messages`
   * `messaging_postbacks`
   * `messaging_seen` (optional)
   * `messaging_reactions` (optional)

---

## 6. Permissions / App Review

For testing with accounts you own, **Standard Access** is enough. To serve accounts you don't own, request **Advanced Access** and submit these permissions for App Review:

* `instagram_business_basic`
* `instagram_business_manage_messages`

---

## 7. Test

Send a DM to your Instagram professional account from another account. It should appear as a new conversation in Dynamics 365. If not, see **Troubleshooting** in [docs/03-customer-quickstart.md](03-customer-quickstart.md).
