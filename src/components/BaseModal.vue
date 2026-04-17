<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  show: boolean;
  maxWidth?: string;
}>();

const emit = defineEmits(['close']);

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.show) {
    emit('close');
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6" @click.self="emit('close')">
        <!-- Backdrop Backdrop -->
        <div class="absolute inset-0 bg-background/60 backdrop-blur-md transition-opacity"></div>
        
        <!-- Modal Content -->
        <div 
          class="relative w-full bg-popover border border-border shadow-2xl rounded-3xl overflow-hidden transition-all duration-300 transform"
          :style="{ maxWidth: maxWidth || '32rem' }"
        >
          <slot></slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative, .modal-leave-active .relative {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-enter-from .relative, .modal-leave-to .relative {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
</style>
