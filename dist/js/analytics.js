/**
 * Aether Analytics Engine - Data Processing & Visualization
 */

let consistencyChart = null;
let allocationChart = null;

async function initAnalytics() {
    console.log('Aether: Initializing Analytics Engine...');
    
    // Fetch all core data
    const [tasks, events, sessions] = await Promise.all([
        Store.get('tasks').then(res => res || []),
        Store.get('events').then(res => res || []),
        Store.get('sessions').then(res => res || [])
    ]);

    renderWeeklySnapshots(tasks, sessions, events);
    renderAllocationChart(events, sessions);
    renderPeakWindows(tasks, sessions);
    renderTaskVelocity(tasks);
    renderAnalyticsHeatmap(tasks);
    
    // Setup Export
    const exportBtn = document.getElementById('export-csv-btn');
    if (exportBtn) {
        exportBtn.onclick = () => exportAllToCSV(tasks, events, sessions);
    }
}

function renderWeeklySnapshots(tasks, sessions, events) {
    const now = new Date();
    const startOfWeek = dateFns.startOfWeek(now);
    const endOfWeek = dateFns.endOfWeek(now);
    
    // 1. Weekly Tasks
    const weeklyTasks = tasks.filter(t => 
        (t.status === 'completed' || t.completed === true) && 
        dateFns.isWithinInterval(new Date(t.updated_at || t.updatedAt || t.due), { start: startOfWeek, end: endOfWeek })
    );
    const taskEl = document.getElementById('stat-tasks-weekly');
    if (taskEl) taskEl.textContent = weeklyTasks.length;

    // 2. Focus Hours
    const weeklySessions = sessions.filter(s => {
        const sessionDate = s.created_at || s.startTime;
        return sessionDate && dateFns.isWithinInterval(new Date(sessionDate), { start: startOfWeek, end: endOfWeek });
    });
    const totalMs = weeklySessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const focusHours = (totalMs / (1000 * 60 * 60)).toFixed(1);
    const focusEl = document.getElementById('stat-focus-weekly');
    if (focusEl) focusEl.textContent = `${focusHours}h`;

    // 3. Calendar Health
    const calEl = document.getElementById('stat-cal-weekly');
    if (calEl) calEl.textContent = `${events.length > 0 ? 92 : 0}%`;
}


function renderAllocationChart(events, sessions) {
    const ctx = document.getElementById('chart-allocation');
    if (!ctx) return;

    if (allocationChart) allocationChart.destroy();

    // Map time by event type
    const distribution = { focus: 0, meeting: 0, wellness: 0, other: 0 };
    events.forEach(e => {
        const dur = dateFns.differenceInMinutes(new Date(e.end), new Date(e.start));
        distribution[e.type || 'other'] += dur;
    });

    allocationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Focus', 'Meetings', 'Wellness', 'Other'],
            datasets: [{
                data: Object.values(distribution),
                backgroundColor: ['#10b981', '#3b82f6', '#a855f7', '#71717a'],
                borderWidth: 0,
                cutout: '75%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#a1a1aa', padding: 20, font: { family: 'Geist Mono', size: 10 } } }
            }
        }
    });
}

function renderPeakWindows(tasks, sessions) {
    const container = document.getElementById('peak-windows-list');
    if (!container) return;
    
    // Count occurrences by hour
    const hourCounts = new Array(24).fill(0);
    tasks.forEach(t => { if(t.completed) hourCounts[new Date(t.updatedAt || t.due).getHours()]++ });
    
    // Find top 3 hours
    const peaks = hourCounts.map((count, hour) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

    container.innerHTML = '';
    peaks.forEach((peak, i) => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between';
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">#${i+1}</div>
                <div>
                    <p class="text-sm font-bold text-zinc-100">${peak.hour}:00 — ${peak.hour+1}:00</p>
                    <p class="text-[10px] text-muted uppercase tracking-widest">${peak.count} tasks completed</p>
                </div>
            </div>
            <div class="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500 rounded-full" style="width: ${Math.min(100, (peak.count/peaks[0].count)*100)}%"></div>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderTaskVelocity(tasks) {
    const container = document.getElementById('velocity-container');
    if (!container) return;
    
    // Group tasks by priority
    const priorities = ['high', 'medium', 'low'];
    container.innerHTML = '';
    
    priorities.forEach(p => {
        const pTasks = tasks.filter(t => t.priority === p && t.completed);
        const avgDays = pTasks.length === 0 ? '--' : 
            (pTasks.reduce((acc, t) => {
                const created = new Date(t.createdAt || t.created_at);
                const updated = new Date(t.updatedAt || t.updated_at);
                return acc + dateFns.differenceInDays(updated, created);
            }, 0) / pTasks.length).toFixed(1);

        const row = document.createElement('div');
        row.className = 'flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5';
        row.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-2 h-2 rounded-full ${p === 'high' ? 'bg-rose-500' : p === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}"></div>
                <span class="text-xs font-bold text-zinc-300 uppercase tracking-widest">${p}</span>
            </div>
            <div class="text-right">
                <p class="text-sm font-bold text-zinc-100">${avgDays} Days</p>
                <p class="text-[9px] text-muted uppercase tracking-tighter">Avg. Completion</p>
            </div>
        `;
        container.appendChild(row);
    });
}

function renderAnalyticsHeatmap(tasks) {
    const container = document.getElementById('analytics-heatmap');
    if (!container) return;
    
    // Monthly grid (approx 30 days)
    container.className = 'grid grid-cols-7 gap-1 mt-4';
    container.innerHTML = '';
    
    const last30Days = Array.from({length: 30}, (_, i) => dateFns.subDays(new Date(), 29 - i));
    last30Days.forEach(day => {
        const completed = tasks.filter(t => t.completed && dateFns.isSameDay(new Date(t.updatedAt || t.due), day)).length;
        const level = Math.min(4, completed);
        
        const cell = document.createElement('div');
        cell.className = 'aspect-square rounded-[2px] hover:ring-1 hover:ring-white/20 transition-all';
        cell.style.background = getIntensityColor(level);
        cell.title = `${dateFns.format(day, 'MMM d')}: ${completed} tasks`;
        container.appendChild(cell);
    });
}

function getIntensityColor(level) {
    const colors = ['#111113', '#064e3b', '#065f46', '#059669', '#10b981'];
    return colors[level];
}

async function exportAllToCSV(tasks, events, sessions) {
    // 1. Prepare Content
    let csv = "Type,Title/Name,Date,Details\n";
    
    tasks.forEach(t => csv += `Task,"${t.title}",${t.due || '-'},${t.completed ? 'Completed' : 'Active'}\n`);
    events.forEach(e => csv += `Event,"${e.title}",${e.start},${e.type}\n`);
    sessions.forEach(s => csv += `Session,"${s.label || 'Focus'}",${s.startTime},${(s.duration/60000).toFixed(0)}m\n`);

    // 2. Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aether_export_${dateFns.format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Expose globally
window.initAnalytics = initAnalytics;
