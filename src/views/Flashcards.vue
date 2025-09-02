<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useSentencesStore } from '../stores/sentences'
import { storeToRefs } from 'pinia'
import { useSwipe } from '@vueuse/core'

const store = useSentencesStore()
const { loading, sentences } = storeToRefs(store)
const order = ref([])
const index = ref(0)
const showSentence = ref(false)
const cardRef = ref(null)
const currentCard = ref(null)
const swipeClass = ref('')
const swipeAction = ref(null)
const incoming = ref(null)
const incomingClass = ref('')
const editing = ref(false)
const editForm = reactive({ text: '', translation: '' })
const sessionSize = ref(10)
const remaining = ref([])

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

onMounted(async () => {
  await store.load()
  remaining.value = [...sentences.value]
})

function startSession() {
  if (!remaining.value.length) return
  const size = Math.min(sessionSize.value, remaining.value.length)
  const shuffled = shuffle([...remaining.value])
  order.value = shuffled.slice(0, size)
  const ids = new Set(order.value.map(s => s.id))
  remaining.value = remaining.value.filter(s => !ids.has(s.id))
  index.value = 0
  showSentence.value = false
}

function nextCard() {
  if (!order.value.length) return
  if (index.value < order.value.length - 1) {
    index.value++
    showSentence.value = false
  } else {
    order.value = []
    index.value = 0
    showSentence.value = false
  }
}
function prevCard() {
  if (index.value > 0) {
    index.value--
    showSentence.value = false
  }
}
function flip() {
  showSentence.value = !showSentence.value
}

function startEdit() {
  if (!current.value) return
  editForm.text = current.value.rawText
  editForm.translation = current.value.rawTranslation
  editing.value = true
}

async function saveEdit() {
  if (!current.value) return
  await store.update(current.value.id, editForm.text, editForm.translation)
  editing.value = false
}

function cancelEdit() {
  editing.value = false
}

async function removeCurrent() {
  if (!current.value) return
  if (!confirm('Delete this sentence?')) return
  const id = current.value.id
  await store.remove(id)
  order.value = order.value.filter(s => s.id !== id)
  remaining.value = remaining.value.filter(s => s.id !== id)
  if (order.value.length) {
    index.value = Math.min(index.value, order.value.length - 1)
  } else {
    index.value = 0
  }
  showSentence.value = false
}

function handleSwipe(dir) {
  if (swipeClass.value || !order.value.length) return
  if (dir === 'left') {
    if (index.value < order.value.length - 1) {
      incoming.value = order.value[index.value + 1]
      swipeAction.value = 'next'
      swipeClass.value = 'swipe-left'
      incomingClass.value = 'enter-left'
    } else {
      nextCard()
    }
  } else if (dir === 'right' && index.value > 0) {
    incoming.value = order.value[index.value - 1]
    swipeAction.value = 'prev'
    swipeClass.value = 'swipe-right'
    incomingClass.value = 'enter-right'
  }
}

function handleAnimationEnd(e) {
  if (!e.animationName.startsWith('swipe')) return
  const action = swipeAction.value
  const el = currentCard.value
  if (el) {
    el.style.transition = 'none'
  }
  swipeClass.value = ''
  incomingClass.value = ''
  swipeAction.value = null
  if (action === 'next') nextCard()
  else if (action === 'prev') prevCard()
  incoming.value = null
  if (el) {
    // Force reflow before restoring transition to avoid Safari double animations
    void el.offsetWidth
    el.style.transition = ''
  }
}

useSwipe(cardRef, {
  onSwipeEnd(_e, dir) {
    handleSwipe(dir)
  }
})

const current = computed(() => order.value[index.value])
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center p-4 relative">
    <div v-if="!order.length" class="space-y-4 text-center">
      <div v-if="remaining.length" class="space-y-2">
        <label class="inline-flex items-center gap-2">
          <span>Number of sentences</span>
          <textarea v-model.number="sessionSize" rows="3" class="input w-24"></textarea>
        </label>
        <button class="btn" @click="startSession">Start</button>
      </div>
      <p v-else class="text-gray-500">No unseen sentences left.</p>
      <router-link to="/library" class="text-blue-500 inline-flex items-center gap-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-5 h-5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Back to Library
      </router-link>
    </div>
    <div v-else class="flex flex-col items-center w-full">
      <div
        v-if="showSentence && current"
        class="absolute top-4 right-4 flex flex-col space-y-2 z-20"
      >
        <button class="text-blue-500" @click.stop="startEdit" aria-label="Edit">
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
          @click.stop="removeCurrent"
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
      <div ref="cardRef" class="card-wrapper w-full max-w-md h-64 relative">
        <div
          ref="currentCard"
          class="card current absolute inset-0 w-full h-full bg-white shadow rounded cursor-pointer select-none z-10"
          :class="[swipeClass, { flipped: showSentence }]"
          @click="flip"
          @animationend="handleAnimationEnd"
        >
          <div class="face front flex items-center justify-center text-xl p-4 overflow-auto text-center">
            <span v-if="current" v-html="current.translation"></span>
            <span v-else>No cards</span>
          </div>
          <div class="face back flex items-center justify-center text-xl p-4 overflow-auto text-center">
            <span v-if="current" v-html="current.text"></span>
            <span v-else>No cards</span>
          </div>
        </div>
        <div
          v-if="incoming"
          class="card incoming absolute inset-0 w-full h-full bg-white shadow rounded select-none"
          :class="incomingClass"
        >
          <div class="face front flex items-center justify-center text-xl p-4 overflow-auto text-center">
            <span v-html="incoming.translation"></span>
          </div>
          <div class="face back flex items-center justify-center text-xl p-4 overflow-auto text-center">
            <span v-html="incoming.text"></span>
          </div>
        </div>
      </div>
      <div class="flex gap-4 mt-4">
        <button class="btn inline-flex items-center gap-1" @click="() => handleSwipe('right')">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Prev
        </button>
        <button class="btn inline-flex items-center gap-1" @click="() => handleSwipe('left')">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
          Next
        </button>
      </div>
      <router-link to="/library" class="mt-4 text-blue-500 inline-flex items-center gap-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-5 h-5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Back to Library
      </router-link>
    </div>
    <div
      v-if="editing"
      class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30"
    >
      <form @submit.prevent="saveEdit" class="bg-white p-4 rounded space-y-2 w-80">
        <textarea v-model="editForm.text" rows="3" class="input" placeholder="Sentence" />
        <textarea v-model="editForm.translation" rows="3" class="input" placeholder="Translation" />
        <div class="flex justify-end space-x-2">
          <button type="button" class="btn-secondary inline-flex items-center gap-1" @click="cancelEdit">
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
          <button type="submit" class="btn inline-flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Save
          </button>
        </div>
      </form>
    </div>

    <div
      v-if="loading"
      class="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-40"
    >
      <svg
        class="animate-spin h-8 w-8 text-blue-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        ></path>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.card-wrapper {
  perspective: 1000px;
}
.card {
  position: absolute;
  transform-style: preserve-3d;
  transition: transform 0.6s;
}
.card.flipped {
  transform: rotateY(180deg);
}
.face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
}
.back {
  transform: rotateY(180deg);
}
.swipe-left {
  animation: swipe-left 0.5s forwards;
}
.swipe-right {
  animation: swipe-right 0.5s forwards;
}
.incoming.enter-left {
  animation: enter-left 0.5s forwards;
}
.incoming.enter-right {
  animation: enter-right 0.5s forwards;
}
@keyframes swipe-left {
  to {
    transform: translateX(-120%) rotate(-20deg);
    opacity: 0;
  }
}
@keyframes swipe-right {
  to {
    transform: translateX(120%) rotate(20deg);
    opacity: 0;
  }
}
@keyframes enter-left {
  from {
    transform: translateX(120%) rotate(20deg) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateX(0) rotate(0deg) scale(1);
    opacity: 1;
  }
}
@keyframes enter-right {
  from {
    transform: translateX(-120%) rotate(-20deg) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateX(0) rotate(0deg) scale(1);
    opacity: 1;
  }
}
::v-deep(b) {
  color: #3b82f6;
}
::v-deep(rt) {
  color: orangered;
}
</style>
