<script setup>
import { withBase, useData } from 'vitepress'

const { isDark } = useData()
</script>

<template>
  <img
    :src="isDark ? withBase('/favicon/favicon-dark.png') : withBase('/favicon/favicon-light.png')"
    alt="Actioner"
    class="inline-wordmark"
  />
</template>
