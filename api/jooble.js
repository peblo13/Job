export default async function handler(request, response) {
  // Only allow POST
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  // Ensure API key is configured
  if (!process.env.JOOBLE_API_KEY) {
    return response.status(503).json({ error: 'JOOBLE_API_KEY is not configured' })
  }

  // Basic protection: this endpoint proxies requests to Jooble.
  // Consider adding authentication and rate-limiting to avoid open proxy abuse.
  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : (request.body || {})

    // Timeout for upstream requests
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const upstream = await fetch(`https://jooble.org/api/${process.env.JOOBLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords: String(body.keywords || ''),
        location: String(body.location || ''),
        page: Number(body.page || 1),
        searchMode: '1'
      }),
      signal: controller.signal
    })

    clearTimeout(timeout)

    // Read as text first to avoid JSON parse errors on non-JSON responses
    const text = await upstream.text()
    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      data = { raw: text }
    }

    if (!upstream.ok) {
      // Propagate upstream status but avoid leaking secrets
      return response.status(upstream.status).json({ error: 'Jooble request failed', details: data })
    }

    return response.status(200).json(data)
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return response.status(504).json({ error: 'Jooble request timed out' })
    }
    console.error('[api/jooble] error:', err)
    return response.status(502).json({ error: 'Unable to reach Jooble' })
  }
}
