'use strict';

/**
 * Timer Engine (Persistent State)
 */
let startTime, elapsed = 0;
let timerInterval = null;
let isRunning = false;

// Core Engine Functions
function startTimerCore() {
    if (isRunning) return;
    startTime = Date.now() - elapsed;
    isRunning = true;
    timerInterval = setInterval(updateAllTimerDisplays, 100);
}

function pauseTimerCore() {
    clearInterval(timerInterval);
    isRunning = false;
    elapsed = Date.now() - startTime;
}

function resetTimerCore() {
    clearInterval(timerInterval);
    saveSession();
    elapsed = 0;
    isRunning = false;
    updateAllTimerDisplays();
}

/**
 * Update logic for all potential timer displays in the DOM
 */
function updateAllTimerDisplays() {
    if (isRunning) {
        elapsed = Date.now() - startTime;
    }

    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    const hrsStr = String(hours).padStart(2, '0');
    const minStr = String(minutes).padStart(2, '0');
    const secStr = String(seconds).padStart(2, '0');
    const timeStr = `${hrsStr}:${minStr}:${secStr}`;

    // Update Main View Elements
    const hEl = document.getElementById('timer-hours');
    const mEl = document.getElementById('timer-minutes');
    const sEl = document.getElementById('timer-seconds');
    if (hEl) hEl.textContent = hrsStr;
    if (mEl) mEl.textContent = minStr;
    if (sEl) sEl.textContent = secStr;

    // Update Dashboard Mini View
    const dashDisp = document.getElementById('dash-timer-display');
    if (dashDisp) dashDisp.textContent = timeStr;

    // Ring Animations
    const progress = (elapsed % 3600000) / 3600000;
    
    // Main Ring (R=105, C=659.7)
    const mainRing = document.getElementById('timer-progress-ring');
    if (mainRing) {
        const c = 2 * Math.PI * 105;
        mainRing.style.strokeDasharray = c;
        mainRing.style.strokeDashoffset = c * (1 - progress);
    }

    // Dash Ring (R=52, C=326.7)
    const dashRing = document.getElementById('dash-timer-ring');
    if (dashRing) {
        const c = 2 * Math.PI * 52;
        dashRing.style.strokeDasharray = c;
        dashRing.style.strokeDashoffset = c * (1 - progress);
    }
}

/**
 * Main View Initialization
 */
window.initTimer = function() {
    console.log("Aether: Initializing Timer Module...");
    updateAllTimerDisplays();
    renderSessions();

    const startBtn = document.getElementById('timer-start-btn');
    const resetBtn = document.getElementById('timer-reset-btn');
    const lapBtn = document.getElementById('timer-lap-btn');

    if (!startBtn) return;

    // Sync Button Icon
    const updateIcon = () => {
        startBtn.innerHTML = isRunning 
            ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
            : '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>';
    };
    updateIcon();

    startBtn.onclick = () => {
        if (isRunning) pauseTimerCore();
        else startTimerCore();
        updateIcon();
        if (resetBtn) resetBtn.disabled = !isRunning && elapsed === 0;
    };

    if (resetBtn) {
        resetBtn.disabled = !isRunning && elapsed === 0;
        resetBtn.onclick = () => {
            resetTimerCore();
            updateIcon();
            resetBtn.disabled = true;
            renderSessions();
        };
    }

    if (lapBtn) {
        lapBtn.onclick = () => {
            if (elapsed === 0) return;
            saveSession();
            renderSessions();
        };
    }

    const clearBtn = document.getElementById('clear-sessions-btn');
    if (clearBtn) {
        clearBtn.onclick = () => {
            if (confirm('Clear all session history?')) {
                Store.set('sessions', []);
                renderSessions();
            }
        };
    }
};

/**
 * Dashboard Mini-Timer Initialization
 */
window.initDashboardTimer = function() {
    const btn = document.getElementById('dash-timer-start');
    const badge = document.getElementById('dash-timer-status');
    if (!btn) return;

    const updateUI = () => {
        btn.innerHTML = isRunning 
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg> Start';
        
        if (badge) {
            badge.textContent = isRunning ? 'Running' : (elapsed > 0 ? 'Paused' : 'Ready');
            badge.className = `label ${isRunning ? 'text-emerald-400' : (elapsed > 0 ? 'text-amber-400' : 'text-zinc-500')}`;
        }
    };

    updateUI();

    btn.onclick = () => {
        if (isRunning) pauseTimerCore();
        else startTimerCore();
        updateUI();
        // If we happen to be in the timer view, sync it too
        const mainBtn = document.getElementById('timer-start-btn');
        if (mainBtn) window.initTimer(); 
    };
};

// Utilities
function getSessions() { return Store.get('sessions') || []; }

function saveSession() {
    if (elapsed === 0) return;
    const sessions = getSessions();
    sessions.push({ duration: elapsed, timestamp: Date.now() });
    Store.set('sessions', sessions);
}

function renderSessions() {
    const list = document.getElementById('session-list');
    if (!list) return;
    const sessions = getSessions();
    list.innerHTML = '';
    
    sessions.slice().reverse().forEach((s, idx) => {
        const h = Math.floor(s.duration / 3600000);
        const m = Math.floor((s.duration % 3600000) / 60000);
        const sec = Math.floor((s.duration % 60000) / 1000);
        
        const div = document.createElement('div');
        div.className = 'card flex items-center justify-between p-3';
        div.innerHTML = `
            <div>
                <p class="text-xs font-semibold text-zinc-300">Session #${sessions.length - idx}</p>
                <p class="text-[10px] text-muted">${timeElapsed(s.timestamp)}</p>
            </div>
            <p class="font-mono text-zinc-100">${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}</p>
        `;
        list.appendChild(div);
    });
}
