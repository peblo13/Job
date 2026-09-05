export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.JOOBLE_API_KEY) {
    return response.status(503).json({ error: 'JOOBLE_API_KEY is not configured' })
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : (request.body || {})
    const upstream = await fetch(`https://jooble.org/api/${process.env.JOOBLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords: String(body.keywords || ''),
        location: String(body.location || ''),
        page: Number(body.page || 1),
        searchMode: '1'
      })
    })

    const data = await upstream.json()
    if (!upstream.ok) return response.status(upstream.status).json({ error: 'Jooble request failed' })
    return response.status(200).json(data)
  } catch {
    return response.status(500).json({ error: 'Unable to reach Jooble' })
  }
}
