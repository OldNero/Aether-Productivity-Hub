<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';

const authStore = useAuthStore();
const themeStore = useThemeStore();
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

const handleGoogleSignIn = async () => {
  error.value = '';
  try {
    await authStore.signInWithGoogle();
  } catch (err: any) {
    error.value = err.message || 'Google Sign-In failed';
  }
};
</script>

<template>
  <div v-if="!authStore.isAuthenticated" id="auth-overlay" class="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-background">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)]"></div>
    
    <div class="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-8 relative z-10 animate-in">
        <div class="text-center mb-8">
            <div class="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <img :src="themeStore.logoUrl" alt="Aether" class="w-full h-full object-contain" />
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

        <div class="mt-6 flex items-center gap-4">
            <div class="h-px bg-border flex-1"></div>
            <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">or continue with</span>
            <div class="h-px bg-border flex-1"></div>
        </div>

        <div class="mt-6">
            <button 
                @click="handleGoogleSignIn"
                class="w-full h-12 rounded-xl bg-background border border-border flex items-center justify-center gap-3 font-semibold text-sm hover:bg-muted hover:border-muted-foreground/30 transition-all active:scale-[0.98] group"
            >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
                Sign in with Google
            </button>
        </div>

        <div class="mt-8 text-center">
            <button @click="isLogin = !isLogin; error = ''" class="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
                {{ isLogin ? "Don't have an account? Sign up →" : "Already have an account? Sign in →" }}
            </button>
        </div>
    </div>
  </div>
</template>
