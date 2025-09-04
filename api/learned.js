import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' })

await sql`ALTER TABLE IF EXISTS sentences ADD COLUMN IF NOT EXISTS learned_at TIMESTAMPTZ`

export default async function handler(req, res) {
  try {
    if (req.method === 'PUT') {
      const { id } = req.body
      const rows = await sql`UPDATE sentences SET learned_at = NOW() WHERE id = ${id} RETURNING learned_at AS "learnedAt"`
      res.status(200).json(rows[0])
    } else {
      res.setHeader('Allow', ['PUT'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
