import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' })

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rows = await sql`SELECT id, text, translation, raw_text AS "rawText", raw_translation AS "rawTranslation" FROM sentences ORDER BY id ASC`
      res.status(200).json(rows)
    } else if (req.method === 'POST') {
      const { text, translation, rawText, rawTranslation } = req.body
      const rows = await sql`INSERT INTO sentences (text, translation, raw_text, raw_translation) VALUES (${text}, ${translation}, ${rawText}, ${rawTranslation}) RETURNING id, text, translation, raw_text AS "rawText", raw_translation AS "rawTranslation"`
      res.status(201).json(rows[0])
    } else if (req.method === 'PUT') {
      const { id, text, translation, rawText, rawTranslation } = req.body
      const rows = await sql`UPDATE sentences SET text = ${text}, translation = ${translation}, raw_text = ${rawText}, raw_translation = ${rawTranslation} WHERE id = ${id} RETURNING id, text, translation, raw_text AS "rawText", raw_translation AS "rawTranslation"`
      res.status(200).json(rows[0])
    } else if (req.method === 'DELETE') {
      const { id } = req.query
      await sql`DELETE FROM sentences WHERE id = ${id}`
      res.status(204).end()
    } else {
      res.setHeader('Allow', ['GET','POST','PUT','DELETE'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
