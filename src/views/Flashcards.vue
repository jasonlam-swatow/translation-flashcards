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
const incoming = ref(null)
const incomingClass = ref('')

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
  if (swipeClass.value || !order.value.length) return
  if (dir === 'left') {
    incoming.value = order.value[(index.value + 1) % order.value.length]
    swipeAction.value = 'next'
    swipeClass.value = 'swipe-left'
    incomingClass.value = 'enter-left'
  } else if (dir === 'right') {
    incoming.value = order.value[(index.value - 1 + order.value.length) % order.value.length]
    swipeAction.value = 'prev'
    swipeClass.value = 'swipe-right'
    incomingClass.value = 'enter-right'
  }
}

function handleAnimationEnd() {
  if (swipeAction.value === 'next') nextCard()
  else if (swipeAction.value === 'prev') prevCard()
  swipeClass.value = ''
  incomingClass.value = ''
  incoming.value = null
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
    <div ref="cardRef" class="card-wrapper w-full max-w-md h-64 relative">
      <div
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
