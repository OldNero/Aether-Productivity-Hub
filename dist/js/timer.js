'use strict';

/**
 * Zenith Focus Engine — Pomodoro + Stopwatch + Zen Mode + Ambient Soundscapes
 */

// ─── State ───────────────────────────────────────────────────────────
let startTime, elapsed = 0;
let timerInterval = null;
let isRunning = false;

// Pomodoro State
let timerMode = 'stopwatch';   // 'stopwatch' | 'focus' | 'short_break' | 'long_break'
let pomodoroCount = 0;         // Completed focus sessions in current cycle

const MODES = {
    stopwatch:   { label: 'Stopwatch',   duration: 0,        color: 'text-zinc-100',    ring: '#e4e4e7' },
    focus:       { label: 'Focus',       duration: 25 * 60000, color: 'text-emerald-400', ring: '#10b981' },
    short_break: { label: 'Short Break', duration: 5 * 60000,  color: 'text-sky-400',     ring: '#38bdf8' },
    long_break:  { label: 'Long Break',  duration: 15 * 60000, color: 'text-violet-400',  ring: '#a78bfa' },
};

// Ambient Audio State
let activeSound = null;
let audioElement = null;
let ambientVolume = 0.5;

const SOUNDS = {
    rain:    { label: 'Rain',      icon: '🌧️', url: 'https://cdn.freesound.org/previews/531/531947_6386094-lq.mp3' },
    storm:   { label: 'Storm',     icon: '⛈️', url: 'https://cdn.freesound.org/previews/401/401275_7743228-lq.mp3' },
    fire:    { label: 'Fireplace', icon: '🔥', url: 'https://cdn.freesound.org/previews/277/277021_5195068-lq.mp3' },
    forest:  { label: 'Forest',    icon: '🌲', url: 'https://cdn.freesound.org/previews/462/462826_566882-lq.mp3' },
};

// ─── Core Engine ─────────────────────────────────────────────────────
function startTimerCore() {
    if (isRunning) return;
    startTime = Date.now() - elapsed;
    isRunning = true;
    _saveTimerState();
    timerInterval = setInterval(updateAllTimerDisplays, 100);
    _updateTimerLabel();
}

function pauseTimerCore() {
    clearInterval(timerInterval);
    isRunning = false;
    elapsed = Date.now() - startTime;
    _saveTimerState();
    _updateTimerLabel();
}

async function resetTimerCore() {
    clearInterval(timerInterval);
    // Only save session if we actually worked
    if (elapsed > 5000) await saveSession();
    elapsed = 0;
    isRunning = false;
    localStorage.removeItem(Store._getPrefixedKey('active_timer'));
    updateAllTimerDisplays();
    _updateTimerLabel();
}

async function skipTimerCore() {
    clearInterval(timerInterval);
    if (timerMode === 'focus' && elapsed > 5000) await saveSession();
    elapsed = 0;
    isRunning = false;
    localStorage.removeItem(Store._getPrefixedKey('active_timer'));
    _advancePomodoro();
    updateAllTimerDisplays();
}

function _advancePomodoro() {
    if (timerMode === 'focus') {
        pomodoroCount++;
        // Every 4 focus sessions, take a long break
        timerMode = (pomodoroCount % 4 === 0) ? 'long_break' : 'short_break';
    } else if (timerMode === 'short_break' || timerMode === 'long_break') {
        timerMode = 'focus';
    }
    _syncModeUI();
    _updateTimerLabel();
    _playCompletionChime();
}

// ─── Pomodoro Completion Detection ───────────────────────────────────
function _checkPomodoroComplete() {
    if (timerMode === 'stopwatch') return false;
    const dur = MODES[timerMode].duration;
    return elapsed >= dur;
}

function _playCompletionChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);       // D5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.8);

        // Second tone
        setTimeout(() => {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880, ctx.currentTime);     // A5
            gain2.gain.setValueAtTime(0.3, ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
            osc2.start(ctx.currentTime);
            osc2.stop(ctx.currentTime + 1);
        }, 300);
    } catch (e) { /* silent fail on browsers without AudioContext */ }
}

// ─── Persistence (Refresh Resilience) ────────────────────────────────
function _saveTimerState() {
    const state = { startTime, elapsed, isRunning, timerMode, pomodoroCount, lastUpdate: Date.now() };
    localStorage.setItem(Store._getPrefixedKey('active_timer'), JSON.stringify(state));
}

function _loadTimerState() {
    const saved = localStorage.getItem(Store._getPrefixedKey('active_timer'));
    if (!saved) return;

    try {
        const state = JSON.parse(saved);
        timerMode = state.timerMode || 'stopwatch';
        pomodoroCount = state.pomodoroCount || 0;
        isRunning = state.isRunning;

        if (isRunning) {
            startTime = state.startTime;
            elapsed = Date.now() - startTime;

            // Check if pomodoro completed while tab was closed
            if (_checkPomodoroComplete()) {
                elapsed = 0;
                isRunning = false;
                localStorage.removeItem(Store._getPrefixedKey('active_timer'));
                _advancePomodoro();
                return;
            }
            timerInterval = setInterval(updateAllTimerDisplays, 100);
        } else {
            elapsed = state.elapsed || 0;
        }
        _syncModeUI();
    } catch (e) {
        console.error("Timer State Recovery Error:", e);
    }
}

// ─── Display Engine ──────────────────────────────────────────────────
function updateAllTimerDisplays() {
    if (isRunning) {
        elapsed = Date.now() - startTime;
    }

    // Auto-save every ~5 seconds
    if (isRunning && Math.floor(elapsed / 1000) % 5 === 0) {
        _saveTimerState();
    }

    // Pomodoro completion detection
    if (isRunning && _checkPomodoroComplete()) {
        clearInterval(timerInterval);
        isRunning = false;
        if (timerMode === 'focus') saveSession();
        elapsed = 0;
        localStorage.removeItem(Store._getPrefixedKey('active_timer'));
        _advancePomodoro();
        updateAllTimerDisplays();
        _syncAllButtons();
        return;
    }

    // Calculate display time (countdown for pomodoro, count-up for stopwatch)
    let displayMs;
    if (timerMode === 'stopwatch') {
        displayMs = elapsed;
    } else {
        displayMs = Math.max(0, MODES[timerMode].duration - elapsed);
    }

    const hours   = Math.floor(displayMs / 3600000);
    const minutes = Math.floor((displayMs % 3600000) / 60000);
    const seconds = Math.floor((displayMs % 60000) / 1000);

    const hrsStr = String(hours).padStart(2, '0');
    const minStr = String(minutes).padStart(2, '0');
    const secStr = String(seconds).padStart(2, '0');
    const timeStr = `${hrsStr}:${minStr}:${secStr}`;

    // Main View Elements
    const hEl = document.getElementById('timer-hours');
    const mEl = document.getElementById('timer-minutes');
    const sEl = document.getElementById('timer-seconds');
    if (hEl) hEl.textContent = hrsStr;
    if (mEl) mEl.textContent = minStr;
    if (sEl) sEl.textContent = secStr;

    // Dashboard Mini View
    const dashDisp = document.getElementById('dash-timer-display');
    if (dashDisp) dashDisp.textContent = timeStr;

    // Zen Mode Display
    const zenDisp = document.getElementById('zen-timer-display');
    if (zenDisp) zenDisp.textContent = timeStr;
    const zenLabel = document.getElementById('zen-timer-label');
    if (zenLabel) zenLabel.textContent = MODES[timerMode].label;

    // ── Ring Progress ──
    let progress;
    if (timerMode === 'stopwatch') {
        progress = (elapsed % 3600000) / 3600000;
    } else {
        progress = Math.min(1, elapsed / MODES[timerMode].duration);
    }

    const ringColor = MODES[timerMode].ring;

    // Main Ring (R=105, C≈659.7)
    const mainRing = document.getElementById('timer-progress-ring');
    if (mainRing) {
        const c = 2 * Math.PI * 105;
        mainRing.style.strokeDasharray = c;
        mainRing.style.strokeDashoffset = c * (1 - progress);
        mainRing.style.stroke = ringColor;
    }

    // Dash Ring (R=52, C≈326.7)
    const dashRing = document.getElementById('dash-timer-ring');
    if (dashRing) {
        const c = 2 * Math.PI * 52;
        dashRing.style.strokeDasharray = c;
        dashRing.style.strokeDashoffset = c * (1 - progress);
    }
}

// ─── UI Helpers ──────────────────────────────────────────────────────
function _updateTimerLabel() {
    const label = document.getElementById('timer-label');
    if (!label) return;

    if (isRunning) {
        label.textContent = MODES[timerMode].label;
        label.className = `text-[11px] font-semibold uppercase tracking-widest mt-2 ${MODES[timerMode].color}`;
    } else if (elapsed > 0) {
        label.textContent = 'Paused';
        label.className = 'text-[11px] font-semibold uppercase tracking-widest mt-2 text-amber-400';
    } else {
        label.textContent = MODES[timerMode].label;
        label.className = `text-[11px] font-semibold uppercase tracking-widest mt-2 ${MODES[timerMode].color}`;
    }
}

function _syncModeUI() {
    // Highlight active mode pill
    document.querySelectorAll('.mode-pill').forEach(pill => {
        const mode = pill.dataset.mode;
        if (mode === timerMode) {
            pill.classList.add('mode-pill--active');
        } else {
            pill.classList.remove('mode-pill--active');
        }
    });

    // Update pomodoro counter dots
    const dotsContainer = document.getElementById('pomodoro-dots');
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        for (let i = 0; i < 4; i++) {
            const dot = document.createElement('div');
            dot.className = `w-2 h-2 rounded-full transition-all duration-300 ${
                i < (pomodoroCount % 4) ? 'bg-emerald-400 scale-110' : 'bg-zinc-700'
            }`;
            dotsContainer.appendChild(dot);
        }
    }

    _updateTimerLabel();
}

function _syncAllButtons() {
    // Update main start/pause icon
    const startBtn = document.getElementById('timer-start-btn');
    if (startBtn) {
        startBtn.innerHTML = isRunning
            ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
            : '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>';
    }

    // Update reset/skip button states
    const resetBtn = document.getElementById('timer-reset-btn');
    if (resetBtn) resetBtn.disabled = !isRunning && elapsed === 0;

    const skipBtn = document.getElementById('timer-skip-btn');
    if (skipBtn) skipBtn.style.display = timerMode === 'stopwatch' ? 'none' : 'flex';

    // Dashboard
    const dashBtn = document.getElementById('dash-timer-start');
    const badge = document.getElementById('dash-timer-status');
    if (dashBtn) {
        dashBtn.innerHTML = isRunning
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg> Start';
    }
    if (badge) {
        badge.textContent = isRunning ? MODES[timerMode].label : (elapsed > 0 ? 'Paused' : 'Ready');
        badge.className = `label ${isRunning ? 'text-emerald-400' : (elapsed > 0 ? 'text-amber-400' : 'text-zinc-500')}`;
    }
}

// ─── Zen Mode ────────────────────────────────────────────────────────
function openZenMode() {
    const overlay = document.getElementById('zen-overlay');
    if (!overlay) return;
    overlay.classList.add('zen-active');
    document.body.style.overflow = 'hidden';
    if (!isRunning) {
        startTimerCore();
        _syncAllButtons();
    }
}

function closeZenMode() {
    const overlay = document.getElementById('zen-overlay');
    if (!overlay) return;
    overlay.classList.remove('zen-active');
    document.body.style.overflow = '';
}

// ─── Ambient Soundscapes ─────────────────────────────────────────────
function toggleSound(soundKey) {
    if (activeSound === soundKey) {
        // Stop current sound
        if (audioElement) { audioElement.pause(); audioElement = null; }
        activeSound = null;
    } else {
        // Switch sound
        if (audioElement) audioElement.pause();
        audioElement = new Audio(SOUNDS[soundKey].url);
        audioElement.loop = true;
        audioElement.volume = ambientVolume;
        audioElement.play().catch(() => {});
        activeSound = soundKey;
    }
    _syncSoundUI();
}

function setAmbientVolume(val) {
    ambientVolume = parseFloat(val);
    if (audioElement) audioElement.volume = ambientVolume;
}

function _syncSoundUI() {
    document.querySelectorAll('.sound-btn').forEach(btn => {
        const key = btn.dataset.sound;
        if (key === activeSound) {
            btn.classList.add('sound-btn--active');
        } else {
            btn.classList.remove('sound-btn--active');
        }
    });
}

// ─── Main View Initialization ────────────────────────────────────────
window.initTimer = async function() {
    _loadTimerState();
    console.log("Aether: Initializing Zenith Focus Engine...");
    _syncModeUI();
    updateAllTimerDisplays();
    _syncAllButtons();
    await renderSessions();

    // ── Mode Pills ──
    document.querySelectorAll('.mode-pill').forEach(pill => {
        pill.onclick = async () => {
            if (isRunning) return; // Can't switch modes while running
            timerMode = pill.dataset.mode;
            elapsed = 0;
            pomodoroCount = 0;
            localStorage.removeItem(Store._getPrefixedKey('active_timer'));
            _syncModeUI();
            updateAllTimerDisplays();
            _syncAllButtons();
        };
    });

    // ── Main Controls ──
    const startBtn = document.getElementById('timer-start-btn');
    const resetBtn = document.getElementById('timer-reset-btn');
    const skipBtn  = document.getElementById('timer-skip-btn');
    const lapBtn   = document.getElementById('timer-lap-btn');

    if (startBtn) {
        startBtn.onclick = () => {
            if (isRunning) pauseTimerCore();
            else startTimerCore();
            _syncAllButtons();
        };
    }

    if (resetBtn) {
        resetBtn.onclick = async () => {
            await resetTimerCore();
            _syncAllButtons();
            await renderSessions();
        };
    }

    if (skipBtn) {
        skipBtn.onclick = async () => {
            await skipTimerCore();
            _syncAllButtons();
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

    // ── Zen Mode ──
    const zenBtn = document.getElementById('zen-mode-btn');
    if (zenBtn) zenBtn.onclick = openZenMode;

    const zenClose = document.getElementById('zen-close-btn');
    if (zenClose) zenClose.onclick = closeZenMode;

    const zenPause = document.getElementById('zen-pause-btn');
    if (zenPause) {
        zenPause.onclick = () => {
            if (isRunning) pauseTimerCore();
            else startTimerCore();
            _syncAllButtons();
            zenPause.textContent = isRunning ? 'Pause' : 'Resume';
        };
    }

    // ── Ambient Sounds ──
    document.querySelectorAll('.sound-btn').forEach(btn => {
        btn.onclick = () => toggleSound(btn.dataset.sound);
    });

    const volSlider = document.getElementById('ambient-volume');
    if (volSlider) {
        volSlider.value = ambientVolume;
        volSlider.oninput = (e) => setAmbientVolume(e.target.value);
    }

    // Keyboard shortcut: Escape closes Zen Mode
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeZenMode();
    });
};

// ─── Dashboard Mini-Timer Initialization ─────────────────────────────
window.initDashboardTimer = function() {
    _loadTimerState();
    updateAllTimerDisplays();
    _syncAllButtons();

    const btn = document.getElementById('dash-timer-start');
    if (!btn) return;

    btn.onclick = () => {
        if (isRunning) pauseTimerCore();
        else startTimerCore();
        _syncAllButtons();
    };
};

// ─── Session Utilities ───────────────────────────────────────────────
async function getSessions() { return await Store.get('sessions') || []; }

async function saveSession() {
    if (elapsed === 0) return;
    const session = {
        id: Store.generateUUID(),
        duration: elapsed,
        mode: timerMode,
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

    const sorted = [...sessions].reverse();

    if (sorted.length === 0) {
        list.innerHTML = '<p class="text-xs text-muted py-8 text-center">No sessions yet. Start a timer to begin.</p>';
        return;
    }

    sorted.forEach((s, idx) => {
        const h   = Math.floor(s.duration / 3600000);
        const m   = Math.floor((s.duration % 3600000) / 60000);
        const sec = Math.floor((s.duration % 60000) / 1000);

        const modeInfo = MODES[s.mode] || MODES.stopwatch;
        const modeLabel = modeInfo.label;

        const div = document.createElement('div');
        div.className = 'card flex items-center justify-between p-3 group transition-all hover:border-white/10';
        div.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-8 h-8 rounded-lg bg-zinc-800/60 flex items-center justify-center text-zinc-400 text-[10px] font-mono">
                    #${sessions.length - idx}
                </div>
                <div>
                    <p class="text-xs font-semibold text-zinc-300">${modeLabel} Session</p>
                    <p class="text-[10px] text-muted">${timeElapsed(s.created_at)}</p>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <p class="font-mono text-zinc-100">${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}</p>
                <button class="p-1.5 hover:bg-rose-500/10 rounded text-muted hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100" data-id="${s.id}" title="Delete session">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                </button>
            </div>
        `;

        const deleteBtn = div.querySelector('button');
        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                if (confirm('Delete this session?')) {
                    await deleteSession(s.id);
                }
            };
        }

        list.appendChild(div);
    });
}
