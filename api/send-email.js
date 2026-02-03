export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const secret = process.env.ACTIONFLOW_WEBHOOK_SECRET;
  const providedSecret = req.headers["x-actionflow-secret"];
  if (secret && providedSecret !== secret) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  let body = req.body;
  if (!body || typeof body !== "object") {
    try {
      body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({ ok: false, error: "Invalid JSON" });
    }
  }

  const {
    to,
    subject,
    text,
    html,
    from = process.env.MAIL_FROM,
    replyTo,
  } = body || {};

  if (!to || !subject || (!text && !html) || !from) {
    return res.status(400).json({
      ok: false,
      error: "Missing required fields",
      required: ["to", "subject", "from", "text|html"],
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: "Server not configured" });
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text,
        html,
        reply_to: replyTo,
      }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return res.status(resp.status).json({ ok: false, error: data });
    }

    return res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || "Error" });
  }
}
