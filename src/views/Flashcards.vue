<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSentencesStore } from '../stores/sentences'
import { useSwipe } from '@vueuse/core'

const store = useSentencesStore()
const order = ref([])
const index = ref(0)
const showSentence = ref(false)
const cardRef = ref(null)

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

onMounted(() => {
  order.value = shuffle([...store.sentences])
})

function next() {
  if (order.value.length) {
    index.value = (index.value + 1) % order.value.length
    showSentence.value = false
  }
}
function prev() {
  if (order.value.length) {
    index.value = (index.value - 1 + order.value.length) % order.value.length
    showSentence.value = false
  }
}
function flip() {
  showSentence.value = !showSentence.value
}

useSwipe(cardRef, {
  onSwipeEnd(_e, dir) {
    if (dir === 'left') next()
    else if (dir === 'right') prev()
  }
})

const current = computed(() => order.value[index.value])
</script>

<template>
  <div class="h-screen flex flex-col items-center justify-center p-4">
    <div
      ref="cardRef"
      class="w-full max-w-md h-64 bg-white shadow rounded flex items-center justify-center text-xl cursor-pointer select-none"
      @click="flip"
    >
      <span v-if="!current">No cards</span>
      <span v-else>{{ showSentence ? current.text : current.translation }}</span>
    </div>
    <div class="flex gap-4 mt-4">
      <button class="btn" @click="prev">Prev</button>
      <button class="btn" @click="next">Next</button>
    </div>
    <router-link to="/library" class="mt-4 text-blue-500">Back to Library</router-link>
  </div>
</template>
