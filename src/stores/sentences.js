import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

export const useSentencesStore = defineStore('sentences', () => {
  const sentences = useStorage('sentences', [])

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

  function add(text, translation) {
    const rawText = stripLinks(text)
    const rawTranslation = stripLinks(translation)
    sentences.value.push({
      id: Date.now(),
      text: formatText(rawText),
      translation: formatText(rawTranslation),
      rawText,
      rawTranslation,
    })
  }

  function update(id, text, translation) {
    const idx = sentences.value.findIndex(s => s.id === id)
    if (idx !== -1) {
      const rawText = stripLinks(text)
      const rawTranslation = stripLinks(translation)
      sentences.value[idx] = {
        ...sentences.value[idx],
        text: formatText(rawText),
        translation: formatText(rawTranslation),
        rawText,
        rawTranslation,
      }
    }
  }

  function remove(id) {
    sentences.value = sentences.value.filter(s => s.id !== id)
  }

  return { sentences, add, update, remove }
})
