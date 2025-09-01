<script setup>
</script>

<template>
  <nav class="bg-blue-600 text-white p-4 flex gap-4">
    <RouterLink to="/library" class="font-bold">Library</RouterLink>
    <RouterLink to="/flashcards">Flashcards</RouterLink>
  </nav>
  <RouterView />
</template>
