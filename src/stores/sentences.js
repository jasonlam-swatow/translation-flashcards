import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSentencesStore = defineStore('sentences', () => {
  const sentences = ref([])
  const loading = ref(false)

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
    } finally {
      loading.value = false
    }
  }

  async function add(text, translation) {
    loading.value = true
    try {
  async function add(text, translation) {
    loading.value = true
    try {
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
    } finally {
      loading.value = false
    }
  }
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

  async function remove(id) {
    loading.value = true
    try {
      await fetch(`/api/sentences?id=${id}`, { method: 'DELETE' })
      sentences.value = sentences.value.filter(s => s.id !== id)
    } finally {
      loading.value = false
    }
    loading.value = true
    try {
      await fetch(`/api/sentences?id=${id}`, { method: 'DELETE' })
      sentences.value = sentences.value.filter(s => s.id !== id)
    } finally {
      loading.value = false
    }
  }

  return { sentences, load, add, update, remove, loading }
})
