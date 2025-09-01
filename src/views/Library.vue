<script setup>
import { reactive, ref } from 'vue'
import { useSentencesStore } from '../stores/sentences'
import { storeToRefs } from 'pinia'

const store = useSentencesStore()
const { sentences } = storeToRefs(store)

const form = reactive({ text: '', translation: '' })
const editingId = ref(null)
const quick = ref('')

function save() {
  if (!form.text.trim() || !form.translation.trim()) return
  if (editingId.value) {
    store.update(editingId.value, form.text, form.translation)
  } else {
    store.add(form.text, form.translation)
  }
  reset()
}

function edit(item) {
  form.text = item.rawText
  form.translation = item.rawTranslation
  editingId.value = item.id
}

function remove(id) {
  store.remove(id)
}

function reset() {
  form.text = ''
  form.translation = ''
  editingId.value = null
}

function quickAdd() {
  const pattern = /==([\s\S]+?)==（([\s\S]+?)）/g
  const matches = [...quick.value.matchAll(pattern)]
  if (!matches.length) return
  matches.forEach(([, text, translation]) => {
    store.add(text.trim(), translation.trim())
  })
  quick.value = ''
}
</script>

<template>
  <div class="p-4 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">Sentence Library</h1>
    <form @submit.prevent="quickAdd" class="space-y-2 mb-6">
      <textarea
        v-model="quick"
        placeholder="Quick add: one '==sentence==（translation）' per line"
        class="input"
      />
      <button type="submit" class="btn">Quick Add</button>
    </form>
    <form @submit.prevent="save" class="space-y-2 mb-6">
      <textarea v-model="form.text" placeholder="Sentence" class="input" />
      <input v-model="form.translation" placeholder="Translation" class="input" />
      <div class="space-x-2">
        <button type="submit" class="btn">{{ editingId ? 'Save' : 'Add' }}</button>
        <button v-if="editingId" type="button" class="btn-secondary" @click="reset">Cancel</button>
      </div>
    </form>

    <ul class="space-y-2">
      <li
        v-for="item in sentences"
        :key="item.id"
        class="bg-white shadow p-3 rounded flex items-start"
      >
        <div class="flex-1 mr-4">
          <p class="text-gray-600" v-html="item.text"></p>
          <p class="font-semibold" v-html="item.translation"></p>
        </div>
        <div class="flex-shrink-0 flex items-center space-x-2">
          <button class="text-blue-500" @click="edit(item)">Edit</button>
          <button class="text-red-500" @click="remove(item.id)">Delete</button>
        </div>
      </li>
    </ul>

    <router-link to="/flashcards" class="btn mt-6 inline-block">Start Flashcards</router-link>
  </div>
 </template>
