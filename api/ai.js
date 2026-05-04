export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY (set it in Vercel env vars).' });
      return;
    }

    const body = req.body || {};
    const { model, system, messages, max_tokens, temperature } = body;

    if (!system || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Invalid payload. Expected {system, messages[]}.' });
      return;
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-6',
        max_tokens: typeof max_tokens === 'number' ? max_tokens : 800,
        ...(typeof temperature === 'number' && temperature >= 0 ? { temperature } : {}),
        system,
        messages,
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: data?.error?.message || data?.message || `Upstream error ${upstream.status}`,
      });
      return;
    }

    const text =
      data?.content?.find?.((c) => c?.type === 'text')?.text ??
      data?.content?.[0]?.text ??
      '';

    res.status(200).json({ text, raw: data });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e || 'Server error') });
  }
}

