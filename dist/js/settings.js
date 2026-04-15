"use strict";

/**
 * Settings Module
 */

const DEFAULT_SETTINGS = {
    name: 'User',
    currency: 'USD',
    theme: 'dark'
};

// Global utility to update UI elements that depend on settings (Header, etc)
window.loadProfileSettings = async function() {
    const saved = await Store.get("settings") || DEFAULT_SETTINGS;
    const nameEl = document.getElementById("user-name-display");
    if (nameEl) nameEl.textContent = saved.name;
    document.documentElement.setAttribute('data-theme', saved.theme);
};

window.initSettings = async function() {
    console.log("Aether: Initializing Settings Module...");
    const saved = await Store.get("settings") || DEFAULT_SETTINGS;

    // Selectors
    const nameInput = document.getElementById("settings-name");
    const currencyInput = document.getElementById("settings-currency");
    const themeInput = document.getElementById("settings-theme");
    const saveBtn = document.getElementById("save-settings-btn");
    const exportBtn = document.getElementById("export-data-btn");
    const clearBtn = document.getElementById("clear-data-btn");

    if (!nameInput) return; // Guard

    // Sync fields
    const syncUrlInput = document.getElementById("settings-sync-url");
    const syncHeadersInput = document.getElementById("settings-sync-headers");

    // Populate
    nameInput.value = saved.name;
    currencyInput.value = saved.currency;
    themeInput.value = saved.theme;
    if (syncUrlInput) syncUrlInput.value = saved.syncUrl || '';
    if (syncHeadersInput) syncHeadersInput.value = saved.syncHeaders || '';

    // Listeners
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const data = {
                ...saved,
                name: nameInput.value,
                currency: currencyInput.value,
                theme: themeInput.value,
                syncUrl: syncUrlInput ? syncUrlInput.value : (saved.syncUrl || ''),
                syncHeaders: syncHeadersInput ? syncHeadersInput.value : (saved.syncHeaders || '')
            };
            await Store.set("settings", data);
            await window.loadProfileSettings();
            alert("Settings saved successfully!");
        };
    }

    if (exportBtn) {
        exportBtn.onclick = () => {
            // Local export for browser-stored data fallback
            const blob = new Blob([JSON.stringify(localStorage, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aether_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        };
    }

    if (clearBtn) {
        clearBtn.onclick = async () => {
            if (confirm("THIS WILL DELETE ALL DATA. Are you absolutely sure?")) {
                if (supabase) {
                    await Store.remove('tasks');
                    await Store.remove('investments');
                    await Store.remove('settings');
                    await Store.remove('sessions');
                }
                localStorage.clear();
                window.location.reload();
            }
        };
    }
};
