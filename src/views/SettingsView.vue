<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useInvestmentStore } from '@/stores/investments';

const authStore = useAuthStore();
const investmentStore = useInvestmentStore();

const username = ref(authStore.currentUser?.username || '');
const finnhubKey = ref('');
const alphaKey = ref('');
const saving = ref(false);
const showSuccess = ref(false);

onMounted(async () => {
  finnhubKey.value = authStore.currentUser?.finnhub_key || '';
  alphaKey.value = authStore.currentUser?.alpha_vantage_key || '';

  // Local Storage Migration (Run once if keys exist locally but not in DB)
  if (!finnhubKey.value || !alphaKey.value) {
      const localFinnhub = localStorage.getItem('aether_finnhub_key');
      const localAlpha = localStorage.getItem('aether_alpha_key');
      
      if (localFinnhub || localAlpha) {
          finnhubKey.value = finnhubKey.value || localFinnhub || '';
          alphaKey.value = alphaKey.value || localAlpha || '';
          console.log('Migrating local API keys to cloud storage...');
          await saveSettings();
          
          // Clear local storage after successful migration
          localStorage.removeItem('aether_finnhub_key');
          localStorage.removeItem('aether_alpha_key');
      }
  }
});

const saveSettings = async () => {
  saving.value = true;
  try {
    // Save profile and keys to backend
    await authStore.updateProfile({
        username: username.value,
        finnhub_key: finnhubKey.value,
        alpha_vantage_key: alphaKey.value
    });
    
    // Refresh prices if keys changed
    await investmentStore.fetchRealTimePrices();

    showSuccess.value = true;
    setTimeout(() => showSuccess.value = false, 3000);
  } catch (err) {
    console.error('Failed to save settings:', err);
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="p-6 max-w-screen-xl mx-auto page-transition">
    <!-- Header -->
    <div class="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <h1 class="text-4xl md:text-5xl font-bold tracking-tighter text-foreground">Settings</h1>
        <p class="text-base text-muted-foreground mt-2 max-w-2xl">Manage your profile and external integrations.</p>
      </div>
      
      <button 
        @click="saveSettings" 
        class="btn-primary px-8 flex items-center gap-2 group"
        :disabled="saving"
      >
        <svg v-if="saving" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        {{ saving ? 'Saving Changes...' : 'Save All Changes' }}
      </button>
    </div>

    <!-- Success Toast (Inline Overlay) -->
    <transition name="fade">
        <div v-if="showSuccess" class="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/50 flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            Settings updated successfully. Dashboard values will refresh shortly.
        </div>
    </transition>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Account Info Column -->
      <div class="lg:col-span-2 space-y-8">
        <!-- Account Section -->
        <section class="card">
            <div class="flex items-center gap-4 mb-8">
                <div class="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    {{ (username || 'U').charAt(0).toUpperCase() }}
                </div>
                <div>
                    <h2 class="text-xl font-bold text-foreground">Account Profile</h2>
                    <p class="text-xs text-muted-foreground uppercase tracking-wider font-bold">Manage your identity</p>
                </div>
            </div>

            <div class="space-y-6">
                <div>
                    <label class="label">Display Name</label>
                    <input v-model="username" type="text" class="input" placeholder="Enter your name" />
                    <p class="mt-2 text-[10px] text-muted-foreground uppercase tracking-tighter">This name appears in your sidebar and routines.</p>
                </div>
                <div>
                    <label class="label opacity-50">Email Address (Read-only)</label>
                    <input :value="authStore.currentUser?.email" type="email" class="input opacity-50 cursor-not-allowed" disabled />
                </div>
            </div>
        </section>

        <!-- Integrations Section -->
        <section class="card">
            <div class="flex items-center gap-4 mb-8">
                <div class="w-12 h-12 rounded-2xl bg-accent text-foreground border border-border flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <div>
                    <h2 class="text-xl font-bold text-foreground">API Integrations</h2>
                    <p class="text-xs text-muted-foreground uppercase tracking-wider font-bold">Secure connection to market data</p>
                </div>
            </div>

            <div class="space-y-8">
                <!-- Finnhub -->
                <div class="p-6 rounded-2xl bg-accent/50 border border-border">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <h3 class="font-bold text-foreground">Finnhub API</h3>
                            <span class="badge badge--high">Primary</span>
                        </div>
                        <a href="https://finnhub.io/" target="_blank" class="text-[10px] font-bold text-primary hover:underline uppercase">Get Free Key</a>
                    </div>
                    <label class="label">API Token</label>
                    <input v-model="finnhubKey" type="password" class="input font-mono text-sm" placeholder="Paste your Finnhub key here" />
                    <p class="mt-3 text-[11px] text-muted-foreground leading-relaxed">Required for real-time stock quotes and dashboard metrics. Keys are stored <strong>only</strong> in your browser's local storage.</p>
                </div>

                <!-- Alpha Vantage -->
                <div class="p-6 rounded-2xl bg-accent/50 border border-border">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <h3 class="font-bold text-foreground">Alpha Vantage</h3>
                            <span class="badge badge--medium">Fallback</span>
                        </div>
                        <a href="https://www.alphavantage.co/" target="_blank" class="text-[10px] font-bold text-primary hover:underline uppercase">Get Free Key</a>
                    </div>
                    <label class="label">API Key</label>
                    <input v-model="alphaKey" type="password" class="input font-mono text-sm" placeholder="Paste your Alpha Vantage key here" />
                    <p class="mt-3 text-[11px] text-muted-foreground leading-relaxed">Used as a backup source for market data. Note: Free tier is limited to 25 requests per day.</p>
                </div>
            </div>
        </section>
      </div>

      <!-- Info Column -->
      <div class="space-y-6">
          <div class="card bg-primary/10 border-primary/20 relative overflow-hidden group">
              <div class="absolute -top-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-[60px] group-hover:bg-primary/30 transition-all duration-700"></div>
              <h3 class="text-lg font-bold mb-2">Cloud Synced</h3>
              <p class="text-sm text-foreground/80 leading-relaxed font-medium">Your API keys are securely synchronized across your devices. Aether encrypts your integration secrets and stores them in your private profile.</p>
          </div>

          <div class="card">
              <h3 class="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  System Information
              </h3>
              <div class="space-y-4">
                  <div class="flex justify-between items-center border-b border-border/50 pb-3">
                      <span class="text-xs text-muted-foreground font-medium uppercase tracking-tighter">Version</span>
                      <span class="text-xs font-bold text-foreground">2.1.0-refresh</span>
                  </div>
                  <div class="flex justify-between items-center border-b border-border/50 pb-3">
                      <span class="text-xs text-muted-foreground font-medium uppercase tracking-tighter">Environment</span>
                      <span class="text-xs font-bold text-primary italic">Cloudflare Edge</span>
                  </div>
                  <div class="flex justify-between items-center">
                      <span class="text-xs text-muted-foreground font-medium uppercase tracking-tighter">Build</span>
                      <span class="text-xs font-bold text-foreground">Stable</span>
                  </div>
              </div>
          </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
