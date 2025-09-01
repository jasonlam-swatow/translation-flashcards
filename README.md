# Translation Flashcards

A simple Vue 3 application for creating and practicing foreign language sentence flashcards. Add sentence/translation pairs to your library and review them with randomized flashcards that flip on click and support swipe navigation.

While reviewing, flip to the sentence side to reveal edit and delete controls in the top-right corner of the screen.

## Persistence

Sentences are stored in a Postgres database. Provide a `DATABASE_URL` environment variable (see `.env.example`; Vercel supplies this automatically when a Neon database is linked). To initialise a fresh database run the statements in `schema.sql`.

## Quick Add

Paste content like `==sentence==（translation）` into the library's quick add box to automatically split and format entries. For bulk entry, place each `==sentence==（translation）` pair on its own line and all of them will be added at once.

The manual add form is hidden by default—toggle it open if you prefer entering a single sentence and translation at a time.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
