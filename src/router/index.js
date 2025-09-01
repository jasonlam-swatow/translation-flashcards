import { createRouter, createWebHashHistory } from 'vue-router'
import Library from '../views/Library.vue'
import Flashcards from '../views/Flashcards.vue'

const routes = [
  { path: '/', redirect: '/library' },
  { path: '/library', component: Library },
  { path: '/flashcards', component: Flashcards }
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})
