<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const isLogin = ref(true);
const email = ref('');
const password = ref('');
const error = ref('');

const handleSubmit = async () => {
  error.value = '';
  if (!email.value || !password.value) {
    error.value = 'Please fill in all fields.';
    return;
  }

  try {
    if (isLogin.value) {
      await authStore.login(email.value, password.value);
    } else {
      await authStore.register(email.value, password.value);
    }
  } catch (err: any) {
    error.value = err.message || 'Authentication failed';
  }
};

const handleGoogleSignIn = async () => {
    try {
        await authStore.signInWithGoogle();
    } catch (err: any) {
        error.value = err.message;
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

        <div class="relative my-8">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-border"></div></div>
            <div class="relative flex justify-center text-xs uppercase"><span class="bg-card px-2 text-muted-foreground">Or continue with</span></div>
        </div>

        <button @click="handleGoogleSignIn" class="w-full btn-secondary py-3 flex items-center justify-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c1.82-1.31 2.87-3.23 2.87-5.4z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
        </button>

        <div class="mt-8 text-center">
            <button @click="isLogin = !isLogin; error = ''" class="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
                {{ isLogin ? "Don't have an account? Sign up →" : "Already have an account? Sign in →" }}
            </button>
        </div>
    </div>
  </div>
</template>
