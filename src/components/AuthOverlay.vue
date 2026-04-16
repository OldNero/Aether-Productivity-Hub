<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const activeTab = ref<'login' | 'register'>('login');
const username = ref('');
const password = ref('');
const errorMsg = ref('');

const handleSubmit = async () => {
  try {
    errorMsg.value = '';
    if (activeTab.value === 'login') {
      await authStore.login(username.value, password.value);
    } else {
      await authStore.register(username.value, password.value);
    }
    // No need for explicit redirect as App.vue watches isAuthenticated
  } catch (err: any) {
    errorMsg.value = err.message;
  }
};

const signInWithGoogle = async () => {
  try {
    await authStore.signInWithGoogle();
  } catch (err: any) {
    errorMsg.value = err.message;
  }
};
</script>

<template>
  <div id="auth-overlay" class="fixed inset-0 z-[100] bg-zinc-950/90 backdrop-blur-3xl flex flex-col p-4 transition-all duration-500 opacity-100 pointer-events-auto">
    <!-- Auth Top Nav -->
    <nav class="w-full max-w-5xl mx-auto flex items-center justify-between py-6 animate-in">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-white text-zinc-950 rounded-xl flex items-center justify-center text-xl font-black shadow-lg shadow-white/5">A</div>
        <span class="text-xl font-bold text-zinc-100 tracking-tighter italic">Aether</span>
      </div>
      <div class="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/5">
        <button
          @click="activeTab = 'login'"
          class="px-6 py-2 rounded-full text-sm font-bold transition-all"
          :class="activeTab === 'login' ? 'bg-white text-zinc-950 shadow-lg' : 'text-zinc-400 hover:text-zinc-100'"
        >
          Login
        </button>
        <button
          @click="activeTab = 'register'"
          class="px-6 py-2 rounded-full text-sm font-bold transition-all"
          :class="activeTab === 'register' ? 'bg-white text-zinc-950 shadow-lg' : 'text-zinc-400 hover:text-zinc-100'"
        >
          Register
        </button>
      </div>
    </nav>

    <!-- Center Auth Content -->
    <div class="flex-1 flex items-center justify-center">
      <div class="w-full max-w-md animate-in" style="animation-delay: 100ms">
        <div class="card p-10 border-white/10 shadow-2xl relative overflow-hidden bg-zinc-900/60 backdrop-blur-md">
          
          <!-- Contextual Header -->
          <div class="mb-10 text-center">
            <h2 class="text-3xl font-bold text-zinc-100 tracking-tight">
              {{ activeTab === 'login' ? 'Welcome Back' : 'Join Aether' }}
            </h2>
            <p class="text-base text-muted mt-2">
              {{ activeTab === 'login' ? 'Sign in to your productivity hub' : 'Create your private local workspace' }}
            </p>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-5">
            <div v-if="errorMsg" class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 text-center">
              {{ errorMsg }}
            </div>
            
            <div>
              <label class="label text-zinc-400 mb-1.5">Username</label>
              <input v-model="username" type="text" class="input py-3.5 bg-zinc-950/50" placeholder="Enter username" required />
            </div>
            
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="label text-zinc-400 mb-0">Password</label>
                <a v-if="activeTab === 'login'" href="#" class="text-[11px] text-muted hover:text-white transition-colors">Forgot password?</a>
              </div>
              <input v-model="password" type="password" class="input py-3.5 bg-zinc-950/50" placeholder="••••••••" required />
            </div>

            <button type="submit" class="btn-primary w-full py-4 font-bold tracking-widest text-xs uppercase mt-6 shadow-xl shadow-white/5">
              {{ activeTab === 'login' ? 'Sign in to Dashboard' : 'Initialize Profile' }}
            </button>
          </form>

          <!-- Social Login Separator -->
          <div class="relative my-8">
            <div class="absolute inset-0 flex items-center" aria-hidden="true">
              <div class="w-full border-t border-white/5"></div>
            </div>
            <div class="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-bold">
              <span class="bg-zinc-900 px-4 text-muted">OR continue with</span>
            </div>
          </div>

          <!-- Social Buttons -->
          <div class="flex justify-center">
            <button @click="signInWithGoogle" class="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all font-semibold text-xs text-zinc-300">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </div>

          <p class="text-center text-[11px] text-muted mt-8 uppercase tracking-[0.2em]">
            Aether &copy; 2026 &bull; Secure Local-First Encryption
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
