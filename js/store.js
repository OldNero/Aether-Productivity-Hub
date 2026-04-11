"use strict";

// store objects in browser localStorage with user-specific prefixes
const Store = {
    /**
     * Helper to get user-prefixed key
     */
    _getPrefixedKey(key) {
        const user = JSON.parse(localStorage.getItem("currentUser"));
        if (!user) return key;
        
        // Metadata white-list (keys that should NOT be prefixed)
        const globalKeys = ["users", "currentUser"];
        if (globalKeys.includes(key)) return key;

        return `${user.id}_${key}`;
    },

    get(key) {
        const prefixedKey = this._getPrefixedKey(key);
        return JSON.parse(localStorage.getItem(prefixedKey));
    },

    set(key, value) {
        const prefixedKey = this._getPrefixedKey(key);
        let stringValue = JSON.stringify(value);
        return localStorage.setItem(prefixedKey, stringValue);
    },

    remove(key) {
        const prefixedKey = this._getPrefixedKey(key);
        return localStorage.removeItem(prefixedKey);
    },

    clear() {
        return localStorage.clear();
    }
};
