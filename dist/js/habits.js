'use strict';

/**
 * Consistency Canvas — Habit Tracker with Heatmap & Daily Rituals
 */

// ─── Default Rituals ─────────────────────────────────────────────────
const DEFAULT_RITUALS = [
    { id: 'hydrate',  label: '💧 Hydrate',   icon: '💧' },
    { id: 'read',     label: '📖 Read',      icon: '📖' },
    { id: 'exercise', label: '🏋️ Exercise',  icon: '🏋️' },
    { id: 'meditate', label: '🧘 Meditate',  icon: '🧘' },
    { id: 'journal',  label: '✍️ Journal',   icon: '✍️' },
];

// ─── Data Access ─────────────────────────────────────────────────────
async function getHabitData() {
    return await Store.get('habits') || { rituals: DEFAULT_RITUALS, log: {}, customRituals: [] };
}

async function saveHabitData(data) {
    await Store.set('habits', data);
}

function getTodayKey() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function getDateKey(date) {
    return date.toISOString().split('T')[0];
}

// ─── Main View Initialization ────────────────────────────────────────
window.initHabits = async function() {
    console.log("Aether: Initializing Consistency Canvas...");

    const data = await getHabitData();
    // Ensure structure
    if (!data.rituals) data.rituals = DEFAULT_RITUALS;
    if (!data.log) data.log = {};
    if (!data.customRituals) data.customRituals = [];

    const allRituals = [...data.rituals, ...data.customRituals];
    const today = getTodayKey();

    // Ensure today's log exists
    if (!data.log[today]) data.log[today] = {};

    renderHeatmap(data);
    renderStreakStats(data);
    renderDailyRituals(data, allRituals, today);
    renderRitualHistory(data, allRituals);

    // ── Add Custom Ritual ──
    const addBtn = document.getElementById('add-ritual-btn');
    const addInput = document.getElementById('new-ritual-input');
    if (addBtn && addInput) {
        addBtn.onclick = async () => {
            const label = addInput.value.trim();
            if (!label) return;
            const id = 'custom_' + Store.generateUUID().slice(0, 8);
            data.customRituals.push({ id, label: `⭐ ${label}`, icon: '⭐' });
            await saveHabitData(data);
            addInput.value = '';
            window.initHabits(); // Re-render
        };
        addInput.onkeydown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); addBtn.click(); }
        };
    }
};

// ─── Heatmap (GitHub-style Contribution Grid) ────────────────────────
function renderHeatmap(data) {
    const grid = document.getElementById('heatmap-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const today = new Date();
    const totalDays = 182; // ~6 months
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - totalDays + 1);

    // Calculate max completions for intensity scaling
    let maxCompletions = 1;
    Object.values(data.log).forEach(dayLog => {
        const count = Object.values(dayLog).filter(Boolean).length;
        if (count > maxCompletions) maxCompletions = count;
    });

    // Month labels row
    const monthsRow = document.createElement('div');
    monthsRow.className = 'heatmap-months';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let lastMonth = -1;

    for (let i = 0; i < totalDays; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        if (d.getDay() === 0 && d.getMonth() !== lastMonth) {
            const label = document.createElement('span');
            label.className = 'heatmap-month-label';
            label.textContent = months[d.getMonth()];
            label.style.gridColumnStart = Math.floor(i / 7) + 2;
            monthsRow.appendChild(label);
            lastMonth = d.getMonth();
        }
    }

    // Build grid cells
    const cellsContainer = document.createElement('div');
    cellsContainer.className = 'heatmap-cells';

    // Day labels
    const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
    dayLabels.forEach(label => {
        const el = document.createElement('span');
        el.className = 'heatmap-day-label';
        el.textContent = label;
        cellsContainer.appendChild(el);
    });

    // Pad first week
    const firstDayOfWeek = startDate.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
        const empty = document.createElement('div');
        empty.className = 'heatmap-cell heatmap-cell--empty';
        cellsContainer.appendChild(empty);
    }

    for (let i = 0; i < totalDays; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const key = getDateKey(d);
        const dayLog = data.log[key] || {};
        const completions = Object.values(dayLog).filter(Boolean).length;

        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.title = `${key}: ${completions} completed`;

        // Intensity levels (0-4)
        let level = 0;
        if (completions > 0) {
            const ratio = completions / maxCompletions;
            if (ratio <= 0.25) level = 1;
            else if (ratio <= 0.5) level = 2;
            else if (ratio <= 0.75) level = 3;
            else level = 4;
        }

        // Highlight today
        if (key === getTodayKey()) cell.classList.add('heatmap-cell--today');

        cell.dataset.level = level;
        cellsContainer.appendChild(cell);
    }

    grid.appendChild(monthsRow);
    grid.appendChild(cellsContainer);
}

// ─── Streak Calculator ───────────────────────────────────────────────
function renderStreakStats(data) {
    const currentEl = document.getElementById('streak-current');
    const longestEl = document.getElementById('streak-longest');
    const totalEl = document.getElementById('streak-total');
    if (!currentEl) return;

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let totalDays = 0;

    const d = new Date();
    // Check today first
    const todayLog = data.log[getTodayKey()] || {};
    const todayActive = Object.values(todayLog).some(Boolean);

    // Walk backwards from today
    for (let i = 0; i < 365; i++) {
        const checkDate = new Date(d);
        checkDate.setDate(checkDate.getDate() - i);
        const key = getDateKey(checkDate);
        const dayLog = data.log[key] || {};
        const active = Object.values(dayLog).some(Boolean);

        if (active) {
            tempStreak++;
            totalDays++;
            if (tempStreak > longestStreak) longestStreak = tempStreak;
        } else {
            if (i === 0 && !todayActive) {
                tempStreak = 0; // Today not done yet, that's ok — check yesterday
                continue;
            }
            if (currentStreak === 0) currentStreak = tempStreak;
            tempStreak = 0;
        }
    }
    if (currentStreak === 0) currentStreak = tempStreak;

    currentEl.textContent = currentStreak;
    if (longestEl) longestEl.textContent = longestStreak;
    if (totalEl) totalEl.textContent = totalDays;
}

// ─── Daily Rituals Checklist ─────────────────────────────────────────
function renderDailyRituals(data, allRituals, today) {
    const container = document.getElementById('rituals-list');
    if (!container) return;
    container.innerHTML = '';

    const todayLog = data.log[today] || {};
    const completedCount = Object.values(todayLog).filter(Boolean).length;
    const totalCount = allRituals.length;

    // Progress bar
    const progressEl = document.getElementById('rituals-progress');
    if (progressEl) {
        const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
        progressEl.style.width = `${pct}%`;
    }

    const counterEl = document.getElementById('rituals-counter');
    if (counterEl) counterEl.textContent = `${completedCount}/${totalCount}`;

    allRituals.forEach(ritual => {
        const isChecked = !!todayLog[ritual.id];
        const div = document.createElement('div');
        div.className = `ritual-item ${isChecked ? 'ritual-item--done' : ''}`;
        div.innerHTML = `
            <label class="flex items-center gap-3 cursor-pointer flex-1">
                <input type="checkbox" class="ritual-checkbox" data-id="${ritual.id}" ${isChecked ? 'checked' : ''}>
                <span class="ritual-checkmark"></span>
                <span class="text-sm ${isChecked ? 'text-zinc-500 line-through' : 'text-zinc-200'}">${ritual.label}</span>
            </label>
            ${ritual.id.startsWith('custom_') ? `<button class="ritual-remove" data-id="${ritual.id}" title="Remove">×</button>` : ''}
        `;

        // Toggle handler
        const checkbox = div.querySelector('.ritual-checkbox');
        checkbox.onchange = async () => {
            if (!data.log[today]) data.log[today] = {};
            data.log[today][ritual.id] = checkbox.checked;
            await saveHabitData(data);
            renderDailyRituals(data, allRituals, today);
            renderHeatmap(data);
            renderStreakStats(data);
        };

        // Remove custom ritual
        const removeBtn = div.querySelector('.ritual-remove');
        if (removeBtn) {
            removeBtn.onclick = async () => {
                data.customRituals = data.customRituals.filter(r => r.id !== ritual.id);
                await saveHabitData(data);
                window.initHabits();
            };
        }

        container.appendChild(div);
    });
}

// ─── Ritual History (Last 7 days) ────────────────────────────────────
function renderRitualHistory(data, allRituals) {
    const container = document.getElementById('ritual-history');
    if (!container) return;
    container.innerHTML = '';

    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({ date: d, key: getDateKey(d) });
    }

    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    days.forEach(({ date, key }) => {
        const dayLog = data.log[key] || {};
        const completed = Object.values(dayLog).filter(Boolean).length;
        const total = allRituals.length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const isToday = key === getTodayKey();

        const col = document.createElement('div');
        col.className = 'flex flex-col items-center gap-1.5';
        col.innerHTML = `
            <div class="ritual-history-bar" style="height: ${Math.max(4, pct)}%"
                 title="${key}: ${completed}/${total}"></div>
            <span class="text-[10px] ${isToday ? 'text-emerald-400 font-bold' : 'text-zinc-500'}">${dayNames[date.getDay()]}</span>
        `;
        container.appendChild(col);
    });
}
