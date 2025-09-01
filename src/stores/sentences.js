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

  function add(text, translation) {
    sentences.value.push({
      id: Date.now(),
      text: formatText(text),
      translation: formatText(translation),
      rawText: text,
      rawTranslation: translation,
    })
  }

  function update(id, text, translation) {
    const idx = sentences.value.findIndex(s => s.id === id)
    if (idx !== -1)
      sentences.value[idx] = {
        ...sentences.value[idx],
        text: formatText(text),
        translation: formatText(translation),
        rawText: text,
        rawTranslation: translation,
      }
  }

  function remove(id) {
    sentences.value = sentences.value.filter(s => s.id !== id)
  }

  return { sentences, add, update, remove }
})
