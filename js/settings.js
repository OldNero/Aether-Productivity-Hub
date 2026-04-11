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
window.loadProfileSettings = function() {
    const saved = Store.get("settings") || DEFAULT_SETTINGS;
    const nameEl = document.getElementById("user-name-display");
    if (nameEl) nameEl.textContent = saved.name;
    document.documentElement.setAttribute('data-theme', saved.theme);
};

window.initSettings = function() {
    console.log("Aether: Initializing Settings Module...");
    const saved = Store.get("settings") || DEFAULT_SETTINGS;

    // Selectors
    const nameInput = document.getElementById("settings-name");
    const currencyInput = document.getElementById("settings-currency");
    const themeInput = document.getElementById("settings-theme");
    const saveBtn = document.getElementById("save-settings-btn");
    const exportBtn = document.getElementById("export-data-btn");
    const clearBtn = document.getElementById("clear-data-btn");

    if (!nameInput) return; // Guard

    // Populate
    nameInput.value = saved.name;
    currencyInput.value = saved.currency;
    themeInput.value = saved.theme;

    // Listeners
    if (saveBtn) {
        saveBtn.onclick = () => {
            const data = {
                name: nameInput.value,
                currency: currencyInput.value,
                theme: themeInput.value
            };
            Store.set("settings", data);
            window.loadProfileSettings();
            alert("Settings saved successfully!");
        };
    }

    if (exportBtn) {
        exportBtn.onclick = () => {
            const data = localStorage.getItem('AE_investments'); // Example
            const blob = new Blob([JSON.stringify(localStorage, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aether_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        };
    }

    if (clearBtn) {
        clearBtn.onclick = () => {
            if (confirm("THIS WILL DELETE ALL DATA. Are you absolutely sure?")) {
                localStorage.clear();
                window.location.reload();
            }
        };
    }
};
