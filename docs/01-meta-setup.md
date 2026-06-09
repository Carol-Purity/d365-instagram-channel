# Meta / Instagram setup

You need four things from Meta. Set aside ~20 minutes the first time.

> You must have an **Instagram professional account** (Business or Creator) and a **Meta (Facebook) developer account**.

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

| Value | Where to find it |
| --- | --- |
| **App Secret** | App dashboard → **Settings → Basic → App Secret** (click *Show*). |
| **Instagram account ID (IG_ID)** | Instagram product → **API setup** page; or call `GET https://graph.instagram.com/v23.0/me?fields=user_id,username` with a user token. |
| **Access token** | Instagram product → generate an **Instagram User access token** for the account, then exchange it for a **long‑lived** token (valid ~60 days). |
| **Verify token** | A string **you invent** now (e.g. `contoso-ig-verify-9f3a`). Keep it handy — you enter it in Azure **and** in the webhook config. |

### Make the access token long‑lived

```bash
curl -s "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=<APP_SECRET>&access_token=<SHORT_LIVED_TOKEN>"
```

The response contains a long‑lived `access_token`. Use that value in Azure.

> Long‑lived tokens expire (~60 days). Refresh before expiry and update the Container App secret `instagram-access-token`. A future version can automate refresh.

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
