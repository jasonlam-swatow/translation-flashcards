import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

export const useSentencesStore = defineStore('sentences', () => {
  const sentences = useStorage('sentences', [])

  function add(text, translation) {
    sentences.value.push({ id: Date.now(), text, translation })
  }

  function update(id, payload) {
    const idx = sentences.value.findIndex(s => s.id === id)
    if (idx !== -1) sentences.value[idx] = { ...sentences.value[idx], ...payload }
  }

  function remove(id) {
    sentences.value = sentences.value.filter(s => s.id !== id)
  }

  return { sentences, add, update, remove }
})
