import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' })

await sql`ALTER TABLE IF EXISTS sentences ADD COLUMN IF NOT EXISTS starred BOOLEAN NOT NULL DEFAULT FALSE`

export default async function handler(req, res) {
  try {
    if (req.method === 'PUT') {
      const { id, starred } = req.body
      const rows = await sql`UPDATE sentences SET starred = ${starred} WHERE id = ${id} RETURNING starred`
      res.status(200).json(rows[0])
    } else {
      res.setHeader('Allow', ['PUT'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
