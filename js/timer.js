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
    _saveTimerState();
    timerInterval = setInterval(updateAllTimerDisplays, 100);
}

function pauseTimerCore() {
    clearInterval(timerInterval);
    isRunning = false;
    elapsed = Date.now() - startTime;
    _saveTimerState();
}

async function resetTimerCore() {
    clearInterval(timerInterval);
    await saveSession();
    elapsed = 0;
    isRunning = false;
    localStorage.removeItem(Store._getPrefixedKey('active_timer'));
    updateAllTimerDisplays();
}

/**
 * Persistence Helpers for 'Refresh Resilience'
 */
function _saveTimerState() {
    const state = { startTime, elapsed, isRunning, lastUpdate: Date.now() };
    localStorage.setItem(Store._getPrefixedKey('active_timer'), JSON.stringify(state));
}

function _loadTimerState() {
    const saved = localStorage.getItem(Store._getPrefixedKey('active_timer'));
    if (!saved) return;
    
    try {
        const state = JSON.parse(saved);
        isRunning = state.isRunning;
        
        if (isRunning) {
            // Calculate true elapsed time based on when it was last seen 'running'
            startTime = state.startTime;
            elapsed = Date.now() - startTime;
            timerInterval = setInterval(updateAllTimerDisplays, 100);
        } else {
            elapsed = state.elapsed;
        }
    } catch (e) {
        console.error("Timer State Recovery Error:", e);
    }
}

/**
 * Update logic for all potential timer displays in the DOM
 */
function updateAllTimerDisplays() {
    if (isRunning) {
        elapsed = Date.now() - startTime;
    }

    // Auto-save progress occasionally if running
    if (isRunning && Math.floor(elapsed / 1000) % 5 === 0) {
        _saveTimerState();
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
window.initTimer = async function() {
    _loadTimerState();
    console.log("Aether: Initializing Timer Module...");
    updateAllTimerDisplays();
    await renderSessions();

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
        resetBtn.onclick = async () => {
            await resetTimerCore();
            updateIcon();
            resetBtn.disabled = true;
            await renderSessions();
        };
    }

    if (lapBtn) {
        lapBtn.onclick = async () => {
            if (elapsed === 0) return;
            await saveSession();
            await renderSessions();
        };
    }

    const clearBtn = document.getElementById('clear-sessions-btn');
    if (clearBtn) {
        clearBtn.onclick = async () => {
            if (confirm('Clear all session history?')) {
                await Store.set('sessions', []);
                await renderSessions();
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
async function getSessions() { return await Store.get('sessions') || []; }

async function saveSession() {
    if (elapsed === 0) return;
    const session = { 
        id: Store.generateUUID(),
        duration: elapsed, 
        created_at: new Date().toISOString() 
    };
    
    const sessions = await getSessions();
    sessions.push(session);
    await Store.set('sessions', sessions);
}

async function deleteSession(id) {
    await Store.remove('sessions', id);
    await renderSessions();
}

async function renderSessions() {
    const list = document.getElementById('session-list');
    if (!list) return;
    const sessions = await getSessions();
    list.innerHTML = '';
    
    // Sort logic: latest first
    const sorted = [...sessions].reverse();

    sorted.forEach((s, idx) => {
        const h = Math.floor(s.duration / 3600000);
        const m = Math.floor((s.duration % 3600000) / 60000);
        const sec = Math.floor((s.duration % 60000) / 1000);
        
        const div = document.createElement('div');
        div.className = 'card flex items-center justify-between p-3 group transition-all hover:border-white/10';
        div.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-8 h-8 rounded-lg bg-zinc-800/60 flex items-center justify-center text-zinc-400 text-[10px] font-mono">
                    #${sessions.length - idx}
                </div>
                <div>
                    <p class="text-xs font-semibold text-zinc-300">Deep Work Session</p>
                    <p class="text-[10px] text-muted">${timeElapsed(s.created_at)}</p>
                </div>
            </div>
        <div class="flex items-center gap-4">
             <p class="font-mono text-zinc-100">${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}</p>
             <button class="p-1.5 hover:bg-rose-500/10 rounded text-muted hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 transition-opacity" data-id="${s.id}" title="Delete session">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
             </button>
        </div>
        `;
        
        const deleteBtn = div.querySelector('button');
        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                if (confirm('Delete this session?')) {
                    await deleteSession(s.id || sessions.length - 1 - idx); // Fallback for session without IDs
                }
            };
        }
        
        list.appendChild(div);
    });
}
