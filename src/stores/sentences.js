import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSentencesStore = defineStore('sentences', () => {
  const sentences = ref([])
  const loading = ref(false)
  const revised = ref(new Set())

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
    loading.value = true
    try {
      const res = await fetch('/api/sentences')
      if (!res.ok) return
      sentences.value = await res.json()
    } finally {
      loading.value = false
    }
  }

  async function add(text, translation, note = '') {
    loading.value = true
    try {
      const rawText = stripLinks(text)
      const rawTranslation = stripLinks(translation)
      const trimmedNote = note.trim()
      const res = await fetch('/api/sentences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: formatText(rawText),
          translation: formatText(rawTranslation),
          rawText,
          rawTranslation,
          note: trimmedNote,
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
          createdAt: new Date().toISOString(),
          learnedAt: null,
          starred: false,
          note: trimmedNote,
        }
      }
      sentences.value.unshift(item)
    } finally {
      loading.value = false
    }
  }

  async function update(id, text, translation) {
    loading.value = true
    try {
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
      if (idx !== -1) Object.assign(sentences.value[idx], item)
    } finally {
      loading.value = false
    }
  }

  async function updateNote(id, note) {
    try {
      const res = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, note }),
      })
      if (!res.ok) {
        throw new Error('Failed to update note')
      }
      const item = await res.json()
      const target = sentences.value.find(s => s.id === id)
      if (target) target.note = item.note
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  async function remove(id) {
    loading.value = true
    try {
      await fetch(`/api/sentences?id=${id}`, { method: 'DELETE' })
      sentences.value = sentences.value.filter(s => s.id !== id)
    } finally {
      loading.value = false
    }
  }

  async function markLearned(id) {
    loading.value = true
    try {
      const res = await fetch('/api/learned', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      const item = await res.json()
      const s = sentences.value.find(s => s.id === id)
      if (s) s.learnedAt = item.learnedAt
    } finally {
      loading.value = false
    }
  }

  async function toggleStar(id) {
    loading.value = true
    try {
      const s = sentences.value.find(s => s.id === id)
      if (!s) return
      const res = await fetch('/api/starred', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, starred: !s.starred })
      })
      const item = await res.json()
      s.starred = item.starred
    } finally {
      loading.value = false
    }
  }

  function markRevised(id) {
    const set = new Set(revised.value)
    set.add(id)
    revised.value = set
  }

  function resetRevised() {
    revised.value = new Set()
  }

  return {
    sentences,
    load,
    add,
    update,
    remove,
    markLearned,
    toggleStar,
    revised,
    markRevised,
    resetRevised,
    loading,
    updateNote,
  }
})
