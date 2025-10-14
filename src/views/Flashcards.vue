<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useSentencesStore } from '../stores/sentences'
import { storeToRefs } from 'pinia'
import { useSwipe } from '@vueuse/core'

const store = useSentencesStore()
const { loading, sentences, revised } = storeToRefs(store)
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
const typed = ref('')
const noteDraft = ref('')
const noteSaving = ref(false)
const isRevision = ref(false)

const revisionWeights = [4, 3, 2, 1]

function buildRevisionGroups() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const twoDaysAgo = new Date(today)
  twoDaysAgo.setDate(today.getDate() - 2)
  const candidates = sentences.value.filter(s => s.learnedAt && !revised.value.has(s.id))
  const starred = candidates.filter(s => s.starred)
  const day1 = candidates.filter(
    s => !s.starred && new Date(s.learnedAt) >= yesterday
  )
  const day2 = candidates.filter(
    s =>
      !s.starred &&
      new Date(s.learnedAt) >= twoDaysAgo &&
      new Date(s.learnedAt) < yesterday
  )
  const older = candidates.filter(
    s => !s.starred && new Date(s.learnedAt) < twoDaysAgo
  )
  return [starred, day1, day2, older].map((items, index) => ({
    items: shuffle([...items]),
    weight: revisionWeights[index],
    index,
  }))
}

function getRevisionCandidates() {
  return buildRevisionGroups().flatMap(group => group.items)
}

function buildRevisionSession(limit) {
  const groups = buildRevisionGroups()
  const totalAvailable = groups.reduce((sum, group) => sum + group.items.length, 0)
  const size = Math.min(limit, totalAvailable)
  if (!size) return []

  const active = groups
    .map(group => ({
      index: group.index,
      weight: group.weight,
      items: [...group.items],
    }))
    .filter(group => group.items.length)

  if (!active.length) return []

  let considered = [...active]
  while (considered.length > 1) {
    const totalWeight = considered.reduce((sum, group) => sum + group.weight, 0)
    const removable = considered.filter(group => (size * group.weight) / totalWeight < 1)
    if (!removable.length) break
    if (removable.length === considered.length) {
      const highestPriority = removable.reduce((best, group) =>
        group.index < best.index ? group : best
      )
      considered = [highestPriority]
      break
    }
    const remainingGroups = considered.filter(group => !removable.includes(group))
    if (!remainingGroups.length) break
    considered = remainingGroups
  }

  const included = new Set(considered.map(group => group.index))
  const allocations = active.map(group => ({
    index: group.index,
    weight: group.weight,
    items: group.items,
    count: 0,
    fraction: 0,
  }))

  const weightedTotal = considered.reduce((sum, group) => sum + group.weight, 0)
  let allocated = 0
  for (const group of allocations) {
    if (!included.has(group.index)) continue
    const reference = considered.find(item => item.index === group.index)
    const raw = (size * reference.weight) / weightedTotal
    const base = Math.min(Math.floor(raw), group.items.length)
    group.count = base
    group.fraction = raw - Math.floor(raw)
    allocated += base
  }

  let remaining = size - allocated

  if (remaining > 0) {
    const fractionalOrder = allocations
      .filter(group => included.has(group.index) && group.count < group.items.length)
      .sort((a, b) => {
        if (b.fraction === a.fraction) return a.index - b.index
        return b.fraction - a.fraction
      })
    for (const group of fractionalOrder) {
      if (!remaining) break
      const available = group.items.length - group.count
      if (available <= 0) continue
      const take = Math.min(available, remaining)
      group.count += take
      remaining -= take
    }
  }

  if (remaining > 0) {
    const priorityOrder = allocations
      .filter(group => included.has(group.index) && group.count < group.items.length)
      .sort((a, b) => a.index - b.index)
    while (remaining > 0 && priorityOrder.length) {
      for (const group of priorityOrder) {
        if (!remaining) break
        if (group.count >= group.items.length) continue
        group.count++
        remaining--
      }
    }
  }

  const activeStates = allocations
    .filter(group => group.count > 0)
    .map(group => ({
      index: group.index,
      weight: group.weight,
      queue: group.items.slice(0, group.count),
      remaining: group.count,
      current: 0,
    }))

  if (!activeStates.length) return []

  const result = []
  while (activeStates.length) {
    const totalWeight = activeStates.reduce((sum, state) => sum + state.weight, 0)
    for (const state of activeStates) {
      state.current += state.weight
    }
    let selected = activeStates[0]
    for (const state of activeStates) {
      if (state.current > selected.current) {
        selected = state
      } else if (state.current === selected.current && state.index < selected.index) {
        selected = state
      }
    }
    result.push(selected.queue.shift())
    selected.remaining--
    selected.current -= totalWeight
    if (selected.remaining <= 0 || !selected.queue.length) {
      const idx = activeStates.findIndex(state => state.index === selected.index)
      activeStates.splice(idx, 1)
    }
  }

  return result
}

const revisionCandidates = computed(() => getRevisionCandidates())

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

onMounted(async () => {
  await store.load()
  remaining.value = sentences.value.filter(s => !s.learnedAt)
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
  typed.value = ''
  isRevision.value = false
}

function startRevision() {
  const list = buildRevisionSession(sessionSize.value)
  if (!list.length) return
  order.value = list
  index.value = 0
  showSentence.value = false
  typed.value = ''
  isRevision.value = true
}

function nextCard() {
  if (!order.value.length) return
  if (index.value < order.value.length - 1) {
    index.value++
    showSentence.value = false
    typed.value = ''
  } else {
    order.value = []
    index.value = 0
    showSentence.value = false
    typed.value = ''
    isRevision.value = false
  }
}
function prevCard() {
  if (index.value > 0) {
    index.value--
    showSentence.value = false
    typed.value = ''
  }
}
async function flip() {
  showSentence.value = !showSentence.value
  if (showSentence.value && current.value && !current.value.learnedAt) {
    await store.markLearned(current.value.id)
  }
  if (showSentence.value && current.value && isRevision.value) {
    store.markRevised(current.value.id)
  }
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

async function toggleStarCurrent() {
  if (!current.value) return
  await store.toggleStar(current.value.id)
}

async function handleNoteBlur() {
  if (!current.value || noteSaving.value) return
  const sentence = current.value
  const value = noteDraft.value ?? ''
  if ((sentence.note ?? '') === value) return
  noteSaving.value = true
  try {
    await store.updateNote(sentence.id, value)
  } catch (err) {
    noteDraft.value = sentence.note ?? ''
  } finally {
    noteSaving.value = false
  }
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
  requestAnimationFrame(() => {
    const newEl = currentCard.value
    if (newEl) {
      newEl.style.transition = ''
      newEl.style.animation = ''
    }
  })
}

useSwipe(cardRef, {
  onSwipeEnd(_e, dir) {
    handleSwipe(dir)
  }
})

const current = computed(() => order.value[index.value])

watch(
  () => current.value?.id,
  () => {
    noteDraft.value = current.value?.note ?? ''
  },
  { immediate: true }
)

watch(
  () => current.value?.note,
  newValue => {
    const normalized = newValue ?? ''
    if (normalized !== noteDraft.value) {
      noteDraft.value = normalized
    }
  }
)
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center p-4 relative">
    <div v-if="!order.length" class="space-y-4 text-center">
      <div class="space-y-2">
        <label class="inline-flex items-center gap-2">
          <span>Number of sentences</span>
          <input type="number" v-model.number="sessionSize" min="1" class="input w-24" />
        </label>
        <div class="flex justify-center gap-2">
          <button
            v-if="remaining.length"
            class="btn inline-flex items-center gap-1"
            @click="startSession"
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
                d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653Z"
              />
            </svg>
            Start
          </button>
          <button
            v-if="revisionCandidates.length"
            class="btn inline-flex items-center gap-1"
            @click="startRevision"
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
                d="M12 6v6h4.5M12 21a9 9 0 100-18 9 9 0 000 18z"
              />
            </svg>
            Revise
          </button>
        </div>
      </div>
      <p v-if="!remaining.length" class="text-gray-500">No unseen sentences left.</p>
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
        <button
          class="text-yellow-500"
          @click.stop="toggleStarCurrent"
          aria-label="Star"
        >
          <svg
            v-if="current.starred"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="w-5 h-5"
          >
            <path
              d="M10.7881 3.21068C11.2364 2.13274 12.7635 2.13273 13.2118 3.21068L15.2938 8.2164L20.6979 8.64964C21.8616 8.74293 22.3335 10.1952 21.4469 10.9547L17.3295 14.4817L18.5874 19.7551C18.8583 20.8908 17.6229 21.7883 16.6266 21.1798L11.9999 18.3538L7.37329 21.1798C6.37697 21.7883 5.14158 20.8908 5.41246 19.7551L6.67038 14.4817L2.55303 10.9547C1.66639 10.1952 2.13826 8.74293 3.302 8.64964L8.70609 8.2164L10.7881 3.21068Z"
            />
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
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M11.4806 3.4987C11.6728 3.03673 12.3272 3.03673 12.5193 3.4987L14.6453 8.61016C14.7263 8.80492 14.9095 8.93799 15.1197 8.95485L20.638 9.39724C21.1367 9.43722 21.339 10.0596 20.959 10.3851L16.7546 13.9866C16.5945 14.1238 16.5245 14.3391 16.5734 14.5443L17.8579 19.9292C17.974 20.4159 17.4446 20.8005 17.0176 20.5397L12.2932 17.6541C12.1132 17.5441 11.8868 17.5441 11.7068 17.6541L6.98238 20.5397C6.55539 20.8005 6.02594 20.4159 6.14203 19.9292L7.42652 14.5443C7.47546 14.3391 7.4055 14.1238 7.24531 13.9866L3.04099 10.3851C2.661 10.0596 2.86323 9.43722 3.36197 9.39724L8.88022 8.95485C9.09048 8.93799 9.27363 8.80492 9.35464 8.61016L11.4806 3.4987Z"
            />
          </svg>
        </button>
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
      <div ref="cardRef" class="card-wrapper w-full max-w-md h-64 relative whitespace-pre-line">
        <div
          ref="currentCard"
          :key="current?.id"
          class="card current absolute inset-0 w-full h-full bg-white shadow rounded cursor-pointer select-none z-10"
          :class="[swipeClass, { flipped: showSentence }]"
          @click="flip"
          @animationend="handleAnimationEnd"
        >
          <div class="face front flex items-center justify-start text-xl p-4 overflow-auto">
            <span v-if="current" v-html="current.translation" class="text-gray-600 text-left"></span>
            <span v-else>No cards</span>
          </div>
          <div class="face back flex items-center justify-start text-xl p-4 overflow-auto">
            <span v-if="current" v-html="current.text" class="text-left"></span>
            <span v-else>No cards</span>

            <div
              v-if="current && showSentence"
              class="mt-4 absolute bottom-4" style="width: calc(100% - 2rem)"
              @click.stop
            >
              <div class="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="w-4 h-4 absolute left-0 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.02M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  />
                </svg>
                <input
                  v-model="noteDraft"
                  type="text"
                  :disabled="noteSaving"
                  class="w-full pl-6 border-0 border-b border-gray-300 bg-transparent text-sm text-gray-700 focus:border-blue-500 focus:outline-none py-1"
                  placeholder="Add a note"
                  @blur="handleNoteBlur"
                />
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="incoming"
          :key="incoming?.id"
          class="card incoming absolute inset-0 w-full h-full bg-white shadow rounded select-none"
          :class="incomingClass"
        >
          <div class="face front flex items-center justify-start text-xl p-4 overflow-auto">
            <span v-html="incoming.translation" class="text-gray-600 text-left"></span>
          </div>
          <div class="face back flex items-center justify-start text-xl p-4 overflow-auto">
            <span v-html="incoming.text" class="text-left"></span>
          </div>
        </div>
      </div>
      <textarea
        v-if="order.length"
        v-model="typed"
        class="w-full max-w-md mt-4 border-0 border-b border-gray-400 bg-transparent focus:border-blue-500 focus:outline-none"
        placeholder="Type the sentence"
      />
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
