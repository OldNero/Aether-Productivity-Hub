"use strict";

// store objects in browser localStorage
const Store = {
    get(key) {
        return JSON.parse(localStorage.getItem(key));
    },

    set(key, value) {
        let stringValue = JSON.stringify(value);
        return localStorage.setItem(key, stringValue);
    },

    remove(key) {
        return localStorage.removeItem(key);
    },

    clear() {
        return localStorage.clear();
    }
};
