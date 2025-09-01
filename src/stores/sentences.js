import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSentencesStore = defineStore('sentences', () => {
  const sentences = ref([])

  function formatText(str) {
    return str
      .replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '<b>$1</b>')
      .replace(/\{([^|{}]+)\|([^{}]+)\}/g, '<ruby><rb>$1<\/rb><rt>$2<\/rt><\/ruby>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1<\/b>')
  }

  // Replace wiki-style links [[url|text]] with <b>text</b> for stored raw content
  function stripLinks(str) {
    return str.replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '<b>$1<\/b>')
  }

    async function load() {
      const res = await fetch('/api/sentences')
      if (!res.ok) return
      sentences.value = await res.json()
    }

    async function add(text, translation) {
      const rawText = stripLinks(text)
      const rawTranslation = stripLinks(translation)
      const res = await fetch('/api/sentences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: formatText(rawText),
          translation: formatText(rawTranslation),
          rawText,
          rawTranslation,
        }),
      })
      let item
      try {
        item = await res.json()
      } catch {
        item = {
          id: Date.now(),
          text: formatText(rawText),
          translation: formatText(rawTranslation),
          rawText,
          rawTranslation,
        }
      }
      sentences.value.push(item)
    }

  async function update(id, text, translation) {
    const rawText = stripLinks(text)
    const rawTranslation = stripLinks(translation)
    const res = await fetch('/api/sentences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        text: formatText(rawText),
        translation: formatText(rawTranslation),
        rawText,
        rawTranslation,
      }),
    })
    const item = await res.json()
    const idx = sentences.value.findIndex(s => s.id === id)
    if (idx !== -1) sentences.value[idx] = item
  }

  async function remove(id) {
    await fetch(`/api/sentences?id=${id}`, { method: 'DELETE' })
    sentences.value = sentences.value.filter(s => s.id !== id)
  }

  return { sentences, load, add, update, remove }
})
