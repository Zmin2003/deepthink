<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<style>
#app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary);
}
</style>
