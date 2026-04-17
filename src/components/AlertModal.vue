<script setup lang="ts">
import BaseModal from './BaseModal.vue';

const props = defineProps<{
  show: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}>();

const emit = defineEmits(['close']);
</script>

<template>
  <BaseModal :show="show" @close="emit('close')" max-width="26rem">
    <div class="p-8 text-center flex flex-col items-center">
      <div 
        class="w-16 h-16 rounded-3xl flex items-center justify-center mb-6"
        :class="{
          'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400': type === 'success' || !type,
          'bg-destructive/10 text-destructive': type === 'error',
          'bg-primary/10 text-primary': type === 'info'
        }"
      >
        <svg v-if="type === 'success' || !type" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else-if="type === 'error'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      </div>

      <h2 class="text-2xl font-bold tracking-tight text-foreground mb-4">{{ title }}</h2>
      <p class="text-sm text-muted-foreground leading-relaxed mb-8">
        {{ message }}
      </p>

      <button 
        @click="emit('close')" 
        class="btn-primary w-full py-3 font-bold"
      >
        Understood
      </button>
    </div>
  </BaseModal>
</template>
