<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSentencesStore } from '../stores/sentences'
import { useSwipe } from '@vueuse/core'

const store = useSentencesStore()
const order = ref([])
const index = ref(0)
const showSentence = ref(false)
const cardRef = ref(null)
const swipeClass = ref('')
const swipeAction = ref(null)

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

function nextCard() {
  if (order.value.length) {
    index.value = (index.value + 1) % order.value.length
    showSentence.value = false
  }
}
function prevCard() {
  if (order.value.length) {
    index.value = (index.value - 1 + order.value.length) % order.value.length
    showSentence.value = false
  }
}
function flip() {
  showSentence.value = !showSentence.value
}

function handleSwipe(dir) {
  if (swipeClass.value) return
  if (dir === 'left') {
    swipeAction.value = 'next'
    swipeClass.value = 'swipe-left'
  } else if (dir === 'right') {
    swipeAction.value = 'prev'
    swipeClass.value = 'swipe-right'
  }
}

function handleAnimationEnd() {
  if (swipeAction.value === 'next') nextCard()
  else if (swipeAction.value === 'prev') prevCard()
  swipeClass.value = ''
  swipeAction.value = null
}

useSwipe(cardRef, {
  onSwipeEnd(_e, dir) {
    handleSwipe(dir)
  }
})

const current = computed(() => order.value[index.value])
</script>

<template>
  <div class="h-screen flex flex-col items-center justify-center p-4">
    <div
      ref="cardRef"
      class="card-wrapper w-full max-w-md h-64"
      :class="swipeClass"
      @animationend="handleAnimationEnd"
    >
      <div
        class="card w-full h-full bg-white shadow rounded cursor-pointer select-none"
        :class="{ flipped: showSentence }"
        @click="flip"
      >
        <div class="face front flex items-center justify-center text-xl">
          {{ current ? current.translation : 'No cards' }}
        </div>
        <div class="face back flex items-center justify-center text-xl">
          {{ current ? current.text : 'No cards' }}
        </div>
      </div>
    </div>
    <div class="flex gap-4 mt-4">
      <button class="btn" @click="() => handleSwipe('right')">Prev</button>
      <button class="btn" @click="() => handleSwipe('left')">Next</button>
    </div>
    <router-link to="/library" class="mt-4 text-blue-500">Back to Library</router-link>
  </div>
</template>

<style scoped>
.card-wrapper {
  perspective: 1000px;
}
.card {
  position: relative;
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
</style>
