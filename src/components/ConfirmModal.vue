<script setup lang="ts">
import BaseModal from './BaseModal.vue';

const props = defineProps<{
  show: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: 'danger' | 'warning' | 'info';
}>();

const emit = defineEmits(['close', 'confirm']);
</script>

<template>
  <BaseModal :show="show" @close="loading ? null : emit('close')" max-width="28rem">
    <div class="p-8">
      <div class="flex items-center gap-4 mb-6">
        <div 
          class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          :class="{
            'bg-destructive/10 text-destructive': variant === 'danger',
            'bg-amber-500/10 text-amber-600 dark:text-amber-400': variant === 'warning' || !variant,
            'bg-primary/10 text-primary': variant === 'info'
          }"
        >
          <svg v-if="variant === 'danger'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground">{{ title }}</h2>
      </div>
      
      <p class="text-sm text-muted-foreground leading-relaxed mb-10">
        {{ message }}
      </p>

      <div class="flex flex-col sm:flex-row gap-3 justify-end">
        <button 
          @click="emit('close')" 
          class="btn-secondary px-6 font-bold"
          :disabled="loading"
        >
          {{ cancelLabel || 'Cancel' }}
        </button>
        <button 
          @click="emit('confirm')" 
          class="btn-primary px-8 font-bold border-none transition-all flex items-center justify-center gap-2"
          :class="{
            'bg-destructive hover:bg-destructive/90 text-destructive-foreground': variant === 'danger',
            'opacity-50 cursor-not-allowed': loading
          }"
          :disabled="loading"
        >
          <svg v-if="loading" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
          {{ loading ? 'Processing...' : (confirmLabel || 'Confirm') }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>
