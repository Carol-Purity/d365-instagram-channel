/**
 * The Setup Assistant page (served at GET /setup).
 *
 * A friendly, no-jargon page that lets a non-developer:
 *   - see at a glance what is configured and what is missing,
 *   - test the Instagram and Dynamics 365 connections (green / red checks),
 *   - turn a short-lived Instagram token into a long-lived one (no curl),
 *   - subscribe the account to Instagram messages in one click,
 *   - copy the webhook URL to paste into Meta.
 *
 * It is a single self-contained HTML string (no external assets or CDNs), so it
 * works offline and needs no extra files in the container image. Sensitive
 * actions are unlocked by entering the Meta App Secret, which the page sends as
 * the `x-setup-key` header; the server checks it with a timing-safe comparison.
 */
export function renderSetupPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>Instagram + Dynamics 365 — Setup Assistant</title>
<style>
  :root {
    --bg: #f6f7fb; --card: #ffffff; --ink: #1b1f29; --muted: #5b6472;
    --line: #e4e7ee; --brand: #6d28d9; --brand-ink: #ffffff;
    --ok: #15803d; --ok-bg: #ecfdf3; --bad: #b42318; --bad-bg: #fef3f2;
    --warn: #b54708; --warn-bg: #fffaeb;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink);
    font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 28px 18px 64px; }
  header h1 { font-size: 26px; margin: 8px 0 4px; }
  header p { color: var(--muted); margin: 0 0 18px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px;
    padding: 20px; margin: 16px 0; box-shadow: 0 1px 2px rgba(16,24,40,.04); }
  .card h2 { font-size: 18px; margin: 0 0 4px; }
  .card .hint { color: var(--muted); margin: 0 0 14px; font-size: 14px; }
  .step { display: inline-flex; align-items: center; justify-content: center;
    width: 26px; height: 26px; border-radius: 50%; background: var(--brand);
    color: var(--brand-ink); font-size: 13px; font-weight: 700; margin-right: 8px; }
  .row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-top: 1px solid var(--line); }
  .row:first-of-type { border-top: 0; }
  .dot { width: 18px; height: 18px; border-radius: 50%; flex: 0 0 18px; background: #cbd2dd; }
  .dot.ok { background: var(--ok); } .dot.bad { background: var(--bad); } .dot.warn { background: var(--warn); }
  .row .label { font-weight: 600; } .row .sub { color: var(--muted); font-size: 13px; }
  .grow { flex: 1; }
  button { font: inherit; font-weight: 600; cursor: pointer; border-radius: 10px;
    border: 1px solid var(--brand); background: var(--brand); color: #fff; padding: 10px 16px; }
  button.secondary { background: #fff; color: var(--brand); }
  button:disabled { opacity: .5; cursor: not-allowed; }
  input { font: inherit; width: 100%; padding: 10px 12px; border: 1px solid var(--line);
    border-radius: 10px; background: #fff; }
  label.field { display: block; font-weight: 600; margin: 12px 0 6px; }
  .pill { padding: 12px 14px; border-radius: 10px; font-size: 14px; }
  .pill.ok { background: var(--ok-bg); color: var(--ok); }
  .pill.bad { background: var(--bad-bg); color: var(--bad); }
  .pill.warn { background: var(--warn-bg); color: var(--warn); }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px;
    word-break: break-all; background: #f2f4f8; padding: 8px 10px; border-radius: 8px; }
  .copyrow { display: flex; gap: 8px; align-items: center; }
  .copyrow .mono { flex: 1; }
  .msg { margin-top: 10px; }
  .locked { opacity: .55; pointer-events: none; }
  .small { font-size: 13px; color: var(--muted); }
  a { color: var(--brand); }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>Setup Assistant</h1>
    <p>Let's make sure your Instagram connection to Dynamics 365 is working. Follow the steps top to bottom.</p>
  </header>

  <div id="overall" class="card">
    <div class="pill warn">Checking your setup…</div>
  </div>

  <div class="card">
    <h2><span class="step">1</span>What's configured</h2>
    <p class="hint">A quick look at the values you entered when you deployed. Green means present.</p>
    <div id="checklist"></div>
  </div>

  <div class="card" id="unlockCard">
    <h2><span class="step">2</span>Unlock the tests</h2>
    <p class="hint">For your security, enter your <strong>Meta App Secret</strong> to run live tests. It never leaves this page except to your own service.</p>
    <label class="field" for="appSecret">Meta App Secret</label>
    <input id="appSecret" type="password" placeholder="Paste your App Secret" autocomplete="off" />
    <div class="msg"></div>
    <p style="margin-top:14px"><button id="unlockBtn">Unlock</button></p>
  </div>

  <div class="card locked" id="testCard">
    <h2><span class="step">3</span>Test your connections</h2>
    <p class="hint">One click each. Green check = working.</p>
    <div class="row">
      <span class="dot" id="igDot"></span>
      <div class="grow">
        <div class="label">Instagram</div>
        <div class="sub" id="igSub">Checks your access token and account.</div>
      </div>
      <button class="secondary" id="igBtn">Test</button>
    </div>
    <div class="row">
      <span class="dot" id="dlDot"></span>
      <div class="grow">
        <div class="label">Dynamics 365</div>
        <div class="sub" id="dlSub">Opens a test conversation with your Direct Line secret.</div>
      </div>
      <button class="secondary" id="dlBtn">Test</button>
    </div>
  </div>

  <div class="card locked" id="webhookCard">
    <h2><span class="step">4</span>Connect the webhook</h2>
    <p class="hint">First, in Meta set the <strong>Callback URL</strong> below and your verify token, then click <em>Verify and save</em>. After that, the one-click button subscribes your account to messages.</p>
    <label class="field">Callback URL (copy into Meta)</label>
    <div class="copyrow">
      <span class="mono" id="webhookUrl">…</span>
      <button class="secondary" id="copyHook">Copy</button>
    </div>
    <p style="margin-top:14px"><button id="subBtn">Subscribe my account to messages</button></p>
    <div class="msg" id="subMsg"></div>
  </div>

  <div class="card locked" id="tokenCard">
    <h2>Bonus: refresh your access token</h2>
    <p class="hint">Instagram tokens expire about every 60 days. Paste a fresh short-lived token here and we'll turn it into a long-lived one — no command line. Then update the <span class="mono">instagram-access-token</span> secret on your Container App.</p>
    <label class="field" for="shortTok">Short-lived Instagram token</label>
    <input id="shortTok" type="password" placeholder="Paste the short-lived token" autocomplete="off" />
    <p style="margin-top:12px"><button class="secondary" id="exchBtn">Make it long-lived</button></p>
    <div class="msg" id="exchMsg"></div>
  </div>

  <p class="small">Need the step-by-step guides? <a href="https://github.com/moliveirapinto/d365-instagram-channel/blob/main/docs/01-meta-setup.md" target="_blank" rel="noopener">Meta setup</a> · <a href="https://github.com/moliveirapinto/d365-instagram-channel/blob/main/docs/02-d365-setup.md" target="_blank" rel="noopener">Dynamics 365 setup</a></p>
</div>

<script>
(function () {
  var KEY = null; // unlock key (App Secret), kept in memory only

  function el(id) { return document.getElementById(id); }
  function setDot(id, state) { var d = el(id); d.className = "dot" + (state ? " " + state : ""); }
  function api(path, body) {
    var headers = { "Content-Type": "application/json" };
    if (KEY) headers["x-setup-key"] = KEY;
    return fetch(path, { method: "POST", headers: headers, body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); });
  }

  var FIELD_LABELS = {
    INSTAGRAM_ACCOUNT_ID: ["Instagram account ID", "The number that identifies your account."],
    INSTAGRAM_APP_SECRET: ["Meta App Secret", "Used to verify Meta's messages."],
    INSTAGRAM_ACCESS_TOKEN: ["Instagram access token", "Lets the service send replies."],
    INSTAGRAM_VERIFY_TOKEN: ["Webhook verify token", "The word you also enter in Meta."],
    DIRECT_LINE_SECRET: ["Direct Line secret", "Connects chats to your agents."]
  };

  function renderStatus(s) {
    el("webhookUrl").textContent = s.webhookUrl || "";
    var present = s.fields || {};
    var order = ["INSTAGRAM_ACCOUNT_ID","INSTAGRAM_APP_SECRET","INSTAGRAM_ACCESS_TOKEN","INSTAGRAM_VERIFY_TOKEN","DIRECT_LINE_SECRET"];
    var html = "";
    for (var i = 0; i < order.length; i++) {
      var k = order[i]; var meta = FIELD_LABELS[k]; var ok = !!present[k];
      html += '<div class="row"><span class="dot ' + (ok ? "ok" : "bad") + '"></span>' +
        '<div class="grow"><div class="label">' + meta[0] + '</div>' +
        '<div class="sub">' + (ok ? "Present" : "Missing — set it on your Container App, then reload") + '</div></div></div>';
    }
    el("checklist").innerHTML = html;

    var overall = el("overall");
    if (s.configured) {
      overall.innerHTML = '<div class="pill ok">All values are present. Run the tests below to confirm everything works.</div>';
    } else {
      overall.innerHTML = '<div class="pill warn">Some values are missing. Fill them in on your Container App\\'s <strong>Secrets</strong> settings, then reload this page.</div>';
    }
  }

  function unlockUi() {
    el("testCard").classList.remove("locked");
    el("webhookCard").classList.remove("locked");
    el("tokenCard").classList.remove("locked");
    el("unlockCard").querySelector(".msg").innerHTML = '<div class="pill ok">Unlocked. You can run the tests now.</div>';
  }

  // Load status
  fetch("/api/status").then(function (r) { return r.json(); }).then(renderStatus).catch(function () {
    el("overall").innerHTML = '<div class="pill bad">Could not reach the service. Is it running?</div>';
  });

  el("unlockBtn").addEventListener("click", function () {
    var secret = el("appSecret").value.trim();
    var msg = el("unlockCard").querySelector(".msg");
    if (!secret) { msg.innerHTML = '<div class="pill bad">Enter your App Secret.</div>'; return; }
    KEY = secret;
    api("/api/unlock", {}).then(function (res) {
      if (res.ok && res.data.ok) { unlockUi(); }
      else { KEY = null; msg.innerHTML = '<div class="pill bad">' + (res.data.error || "That App Secret didn't match.") + '</div>'; }
    });
  });

  el("igBtn").addEventListener("click", function () {
    setDot("igDot", "warn"); el("igSub").textContent = "Testing…";
    api("/api/validate/instagram", {}).then(function (res) {
      if (res.ok && res.data.ok) {
        setDot("igDot", "ok");
        el("igSub").textContent = "Connected" + (res.data.username ? " as @" + res.data.username : "") + ".";
      } else {
        setDot("igDot", "bad");
        el("igSub").textContent = res.data.error || "Could not connect.";
      }
    });
  });

  el("dlBtn").addEventListener("click", function () {
    setDot("dlDot", "warn"); el("dlSub").textContent = "Testing…";
    api("/api/validate/directline", {}).then(function (res) {
      if (res.ok && res.data.ok) { setDot("dlDot", "ok"); el("dlSub").textContent = "Connected to Dynamics 365."; }
      else { setDot("dlDot", "bad"); el("dlSub").textContent = res.data.error || "Could not connect."; }
    });
  });

  el("copyHook").addEventListener("click", function () {
    navigator.clipboard.writeText(el("webhookUrl").textContent || "").then(function () {
      el("copyHook").textContent = "Copied!";
      setTimeout(function () { el("copyHook").textContent = "Copy"; }, 1500);
    });
  });

  el("subBtn").addEventListener("click", function () {
    el("subMsg").innerHTML = '<div class="pill warn">Subscribing…</div>';
    api("/api/webhook/subscribe", {}).then(function (res) {
      if (res.ok && res.data.ok) { el("subMsg").innerHTML = '<div class="pill ok">Your account is now subscribed to Instagram messages.</div>'; }
      else { el("subMsg").innerHTML = '<div class="pill bad">' + (res.data.error || "Could not subscribe.") + '</div>'; }
    });
  });

  el("exchBtn").addEventListener("click", function () {
    var tok = el("shortTok").value.trim();
    if (!tok) { el("exchMsg").innerHTML = '<div class="pill bad">Paste a short-lived token first.</div>'; return; }
    el("exchMsg").innerHTML = '<div class="pill warn">Exchanging…</div>';
    api("/api/token/exchange", { shortLivedToken: tok }).then(function (res) {
      if (res.ok && res.data.ok) {
        var days = res.data.expiresIn ? Math.round(res.data.expiresIn / 86400) : null;
        el("exchMsg").innerHTML = '<div class="pill ok">Done' + (days ? " — valid about " + days + " days" : "") +
          '. Copy this long-lived token into your <span class="mono">instagram-access-token</span> secret:</div>' +
          '<div class="copyrow" style="margin-top:8px"><span class="mono" id="longTok"></span>' +
          '<button class="secondary" id="copyLong">Copy</button></div>';
        el("longTok").textContent = res.data.accessToken;
        el("copyLong").addEventListener("click", function () {
          navigator.clipboard.writeText(res.data.accessToken).then(function () {
            el("copyLong").textContent = "Copied!";
            setTimeout(function () { el("copyLong").textContent = "Copy"; }, 1500);
          });
        });
      } else {
        el("exchMsg").innerHTML = '<div class="pill bad">' + (res.data.error || "Could not exchange the token.") + '</div>';
      }
    });
  });
})();
</script>
</body>
</html>`;
}
