"use strict";

// load default settings
const DEFAULT_SETTINGS = {
    name: 'User',
    currency: 'USD',
    exchangeRate: 0.27,
    theme: 'dark'

};

// load settings from local storage
function load() {
    const saved = Store.get("settings") || DEFAULT_SETTINGS;
    const { name, currency, theme } = saved;

    document.getElementById("settings-name").value = name;
    document.getElementById("settings-currency").value = currency;
    document.getElementById("settings-theme").value = theme;

    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById("user-name-display").textContent = name;
}

// save settings to local storage
function save() {
    const name = document.getElementById("settings-name").value;
    const currency = document.getElementById("settings-currency").value;
    const theme = document.getElementById("settings-theme").value;

    Store.set("settings", { name, currency, theme });

    load();
}
