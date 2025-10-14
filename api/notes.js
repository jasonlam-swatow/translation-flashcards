import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' })

await sql`ALTER TABLE IF EXISTS sentences ADD COLUMN IF NOT EXISTS note TEXT`

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
    return
  }

  const { id, note } = req.body || {}
  if (!id) {
    res.status(400).json({ error: 'Missing id' })
    return
  }

  try {
    const rows = await sql`UPDATE sentences SET note = ${note ?? ''} WHERE id = ${id} RETURNING id, COALESCE(note, '') AS note`
    if (!rows.length) {
      res.status(404).json({ error: 'Sentence not found' })
      return
    }
    res.status(200).json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
