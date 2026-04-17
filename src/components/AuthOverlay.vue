<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const isLogin = ref(true);
const email = ref('');
const username = ref('');
const password = ref('');
const error = ref('');

const handleSubmit = async () => {
  error.value = '';
  if (!email.value || !password.value || (!isLogin.value && !username.value)) {
    error.value = 'Please fill in all fields.';
    return;
  }

  try {
    if (isLogin.value) {
      await authStore.login(email.value, password.value);
    } else {
      await authStore.register(email.value, password.value, username.value);
    }
  } catch (err: any) {
    error.value = err.message || 'Authentication failed';
  }
};
</script>

<template>
  <div v-if="!authStore.isAuthenticated" id="auth-overlay" class="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-background">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)]"></div>
    
    <div class="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-8 relative z-10 animate-in">
        <div class="text-center mb-8">
            <div class="w-12 h-12 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center shadow-lg shadow-primary/20">
                <img src="/favicon.svg" alt="Aether" class="w-7 h-7 brightness-0 invert" />
            </div>
            <h1 class="text-3xl font-bold tracking-tighter text-foreground mb-2">Aether Hub</h1>
            <p class="text-sm text-muted-foreground">High-performance productivity suite.</p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5">
            <div v-if="!isLogin">
                <label class="label">Display Name</label>
                <input v-model="username" type="text" class="input" placeholder="Your name" :required="!isLogin" />
            </div>
            <div>
                <label class="label">Email Address</label>
                <input v-model="email" type="email" class="input" placeholder="name@example.com" required />
            </div>
            <div>
                <label class="label">Password</label>
                <input v-model="password" type="password" class="input" placeholder="••••••••" required />
            </div>

            <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold text-center">
                {{ error }}
            </div>

            <button type="submit" class="w-full btn-primary py-3 text-base">
                {{ isLogin ? 'Sign In' : 'Create Account' }}
            </button>
        </form>

        <div class="mt-8 text-center">
            <button @click="isLogin = !isLogin; error = ''" class="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
                {{ isLogin ? "Don't have an account? Sign up →" : "Already have an account? Sign in →" }}
            </button>
        </div>
    </div>
  </div>
</template>
