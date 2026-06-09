# Dynamics 365 Omnichannel setup

Goal: register a **custom messaging channel** (Direct Line), get its **secret** for the relay, and route Instagram conversations to your agents.

> Requires **Dynamics 365 Customer Service** with the **Digital Messaging** add‑on and the **Omnichannel admin center** app.

---

## 1. Create the custom messaging channel

1. Open **Copilot Service admin center** (or **Omnichannel admin center**).
2. Go to **Channels → Messaging accounts** (sometimes **Channels → Custom**).
3. Select **+ New account** and choose **Custom messaging** / **Direct Line** as the channel type.
4. Name it (e.g. *Instagram*).
5. Save. The channel page exposes a **Direct Line secret** (or a secret key under the channel's settings). **Copy it** — this is the `directLineSecret` you paste into the Azure deployment form.

> If your environment exposes the channel as a Bot Framework / Direct Line registration, copy the **Direct Line secret** from the channel's **Keys** section.

---

## 2. Create a workstream

1. Go to **Customer support → Workstreams → + New workstream**.
2. Type: **Messaging**.
3. Channel: select the **custom/Direct Line channel** you just created.
4. Set the **routing rules** and **work distribution** (push or pick).
5. Save.

---

## 3. Add a queue and agents

1. **Customer support → Queues → + New queue** (type **Messaging**).
2. Add the **agents** who should handle Instagram conversations.
3. In the workstream's **route‑to‑queues** rules, send Instagram conversations to this queue.

---

## 4. Configure conversation settings (optional but recommended)

* **Pre‑conversation survey**: usually off for social DMs.
* **Automated messages**: a greeting when a conversation starts.
* **Session and notification templates**: control what the agent sees on screen.
* **Operating hours**: optional after‑hours messaging.

---

## 5. Connect the relay

The `directLineSecret` you copied in step 1 is entered in the **Deploy to Azure** form (the *Dynamics 365* tab). The relay uses it to open Direct Line conversations on the channel — that is what makes Instagram messages appear in the agent's queue.

No further wiring is needed inside Dynamics 365: every Instagram customer becomes a Direct Line conversation that your workstream routes to the queue.

---

## 6. Verify end to end

1. Make sure an agent is **signed in** to the Customer Service / Copilot Service workspace and set to **Available**.
2. Send a DM to the Instagram account.
3. The conversation should arrive in the agent's queue. Accept it and reply.
4. The reply should appear in the Instagram DM thread within a couple of seconds.

If presence or routing misbehaves, confirm the agent's queue membership and that the workstream points at the correct channel.
