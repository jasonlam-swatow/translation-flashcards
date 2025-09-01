<script setup>
import { reactive, ref } from 'vue'
import { useSentencesStore } from '../stores/sentences'
import { storeToRefs } from 'pinia'

const store = useSentencesStore()
const { sentences } = storeToRefs(store)

const form = reactive({ text: '', translation: '' })
const editingId = ref(null)

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
</script>

<template>
  <div class="p-4 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">Sentence Library</h1>
    <form @submit.prevent="save" class="space-y-2 mb-6">
      <input v-model="form.translation" placeholder="Translation" class="input" />
      <textarea v-model="form.text" placeholder="Sentence" class="input" />
      <div class="space-x-2">
        <button type="submit" class="btn">{{ editingId ? 'Save' : 'Add' }}</button>
        <button v-if="editingId" type="button" class="btn-secondary" @click="reset">Cancel</button>
      </div>
    </form>

    <ul class="space-y-2">
      <li v-for="item in sentences" :key="item.id" class="bg-white shadow p-3 rounded flex justify-between items-start">
        <div>
          <p class="font-semibold" v-html="item.translation"></p>
          <p class="text-gray-600" v-html="item.text"></p>
        </div>
        <div class="space-x-2">
          <button class="text-blue-500" @click="edit(item)">Edit</button>
          <button class="text-red-500" @click="remove(item.id)">Delete</button>
        </div>
      </li>
    </ul>

    <router-link to="/flashcards" class="btn mt-6 inline-block">Start Flashcards</router-link>
  </div>
 </template>
