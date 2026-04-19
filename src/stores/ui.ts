import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUIStore = defineStore('ui', () => {
    // --- Alert Modal State ---
    const alert = ref({
        show: false,
        title: '',
        message: '',
        type: 'success' as 'success' | 'error' | 'info' | 'warning'
    });

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
        alert.value = { show: true, title, message, type };
    };

    const closeAlert = () => {
        alert.value.show = false;
    };

    // --- Confirm Modal State ---
    const confirm = ref({
        show: false,
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        variant: 'info' as 'danger' | 'warning' | 'info',
        loading: false,
        action: null as (() => Promise<void> | void) | null
    });

    const showConfirm = (options: {
        title: string;
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        variant?: 'danger' | 'warning' | 'info';
        action: () => Promise<void> | void;
    }) => {
        confirm.value = {
            show: true,
            title: options.title,
            message: options.message,
            confirmLabel: options.confirmLabel || 'Confirm',
            cancelLabel: options.cancelLabel || 'Cancel',
            variant: options.variant || 'info',
            loading: false,
            action: options.action
        };
    };

    const closeConfirm = () => {
        confirm.value.show = false;
        confirm.value.action = null;
    };

    const executeConfirm = async () => {
        if (!confirm.value.action) return;
        
        try {
            confirm.value.loading = true;
            await confirm.value.action();
            closeConfirm();
        } catch (error) {
            console.error('Action failed:', error);
            confirm.value.loading = false;
        }
    };

    return {
        alert,
        showAlert,
        closeAlert,
        confirm,
        showConfirm,
        closeConfirm,
        executeConfirm
    };
});
