<script setup>
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'
import { useSentencesStore } from '../stores/sentences'
import { storeToRefs } from 'pinia'

const store = useSentencesStore()
const { sentences } = storeToRefs(store)

const form = reactive({ text: '', translation: '' })
const editingId = ref(null)
const quick = ref('')
const showForm = ref(false)
const visibleCount = ref(20)

const visibleSentences = computed(() =>
  sentences.value.slice(0, visibleCount.value)
)

function onScroll() {
  if (
    window.innerHeight + window.scrollY >=
    document.body.offsetHeight - 100 &&
    visibleCount.value < sentences.value.length
  ) {
    visibleCount.value += 20
  }
}

onMounted(() => window.addEventListener('scroll', onScroll))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

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
      <div class="flex items-center gap-2">
        <button type="submit" class="btn inline-flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Quick Add
        </button>
        <button
          type="button"
          class="text-blue-500 underline text-sm inline-flex items-center gap-1"
          @click="showForm = !showForm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-4 h-4"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
            />
          </svg>
          {{ showForm ? 'Hide Manual' : 'Manual Add' }}
        </button>
      </div>
    </form>
    <form v-if="showForm" @submit.prevent="save" class="space-y-2 mb-6">
      <textarea v-model="form.text" placeholder="Sentence" class="input" />
      <input v-model="form.translation" placeholder="Translation" class="input" />
      <div class="space-x-2">
        <button type="submit" class="btn inline-flex items-center gap-1">
          <svg
            v-if="editingId"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {{ editingId ? 'Save' : 'Add' }}
        </button>
        <button
          v-if="editingId"
          type="button"
          class="btn-secondary inline-flex items-center gap-1"
          @click="reset"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
      </div>
    </form>

    <ul class="space-y-2">
      <li
        v-for="item in visibleSentences"
        :key="item.id"
        class="bg-white shadow p-3 rounded flex items-start"
      >
        <div class="flex-1 mr-4 min-w-0">
          <p class="font-semibold truncate" v-html="item.text"></p>
          <p class="text-gray-600" v-html="item.translation"></p>
        </div>
        <div class="flex-shrink-0 flex flex-col items-center space-y-2">
          <button class="text-blue-500" @click="edit(item)" aria-label="Edit">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
              />
            </svg>
          </button>
          <button
            class="text-red-500"
            @click="remove(item.id)"
            aria-label="Delete"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          </button>
        </div>
      </li>
    </ul>

    <router-link
      to="/flashcards"
      class="btn mt-6 inline-flex items-center gap-1"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-5 h-5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
        />
      </svg>
      Start Flashcards
    </router-link>
  </div>
</template>
