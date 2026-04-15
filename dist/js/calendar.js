/**
 * Aether Calendar - Core Logic & Visual Grid
 */

let currentCalendarDate = new Date();
let currentCalendarView = 'month'; // 'month', 'week', 'day'
let calendarEvents = [];

async function initCalendar() {
    console.log('Aether: Initializing Calendar View...');
    
    // Load events from store
    calendarEvents = await Store.get('events') || [];
    
    renderCalendarHeader();
    renderCalendarGrid();
    
    // Setup event listeners for tabs/navigation
    setupCalendarNavigation();
    initCalendarModals();
}

function initCalendarModals() {
    const modal = document.getElementById('modal-event');
    const form = document.getElementById('event-form');
    const closeBtn = document.getElementById('modal-event-close');
    const deleteBtn = document.getElementById('modal-event-delete');

    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('open');
    
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('event-id').value;
            const date = document.getElementById('event-date').value;
            const startTime = document.getElementById('event-start').value;
            const endTime = document.getElementById('event-end').value;

            const start = `${date}T${startTime}:00`;
            const end = `${date}T${endTime}:00`;

            const eventData = {
                id: id || Store.generateUUID(),
                title: document.getElementById('event-title').value,
                type: document.getElementById('event-type').value,
                start,
                end,
                createdAt: new Date().toISOString()
            };

            if (id) {
                calendarEvents = calendarEvents.map(ev => ev.id === id ? eventData : ev);
            } else {
                calendarEvents.push(eventData);
            }

            await Store.set('events', calendarEvents);
            modal.classList.remove('open');
            renderCalendar();
        };
    }

    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            const id = document.getElementById('event-id').value;
            if (id && confirm('Delete this time block?')) {
                calendarEvents = calendarEvents.filter(ev => ev.id !== id);
                await Store.set('events', calendarEvents);
                modal.classList.remove('open');
                renderCalendar();
            }
        };
    }

    // Global toggle for the "New Block" button in header
    const addBtn = document.getElementById('add-event-btn');
    if (addBtn) {
        addBtn.onclick = () => openAddEventModal(new Date(), new Date().getHours());
    }
}

function setupCalendarNavigation() {
    const prevBtn = document.getElementById('cal-prev');
    const nextBtn = document.getElementById('cal-next');
    const todayBtn = document.getElementById('cal-today');
    const tabs = document.querySelectorAll('.cal-tab');

    if (prevBtn) prevBtn.onclick = () => {
        if (currentCalendarView === 'month') {
            currentCalendarDate = dateFns.subMonths(currentCalendarDate, 1);
        } else if (currentCalendarView === 'week') {
            currentCalendarDate = dateFns.subWeeks(currentCalendarDate, 1);
        } else {
            currentCalendarDate = dateFns.subDays(currentCalendarDate, 1);
        }
        renderCalendar();
    };

    if (nextBtn) nextBtn.onclick = () => {
        if (currentCalendarView === 'month') {
            currentCalendarDate = dateFns.addMonths(currentCalendarDate, 1);
        } else if (currentCalendarView === 'week') {
            currentCalendarDate = dateFns.addWeeks(currentCalendarDate, 1);
        } else {
            currentCalendarDate = dateFns.addDays(currentCalendarDate, 1);
        }
        renderCalendar();
    };

    if (todayBtn) todayBtn.onclick = () => {
        currentCalendarDate = new Date();
        renderCalendar();
    };

    tabs.forEach(tab => {
        tab.onclick = () => {
            currentCalendarView = tab.dataset.view;
            tabs.forEach(t => t.classList.toggle('active', t === tab));
            renderCalendar();
        };
    });
}

function renderCalendar() {
    renderCalendarHeader();
    renderCalendarGrid();
    renderCalendarTasks();
}

function renderCalendarHeader() {
    const title = document.getElementById('cal-title');
    if (!title) return;
    
    let formatStr = 'MMMM yyyy';
    if (currentCalendarView === 'week') formatStr = 'MMM d — MMM d, yyyy';
    if (currentCalendarView === 'day') formatStr = 'MMMM d, yyyy';

    if (currentCalendarView === 'week') {
        const start = dateFns.startOfWeek(currentCalendarDate);
        const end = dateFns.endOfWeek(currentCalendarDate);
        title.textContent = `${dateFns.format(start, 'MMM d')} — ${dateFns.format(end, 'MMM d, yyyy')}`;
    } else {
        title.textContent = dateFns.format(currentCalendarDate, formatStr);
    }
}

function renderCalendarGrid() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    if (currentCalendarView === 'month') {
        grid.className = 'grid grid-cols-7 flex-1 overflow-y-auto';
        renderMonthView(grid);
    } else if (currentCalendarView === 'week') {
        grid.className = 'flex flex-1 overflow-hidden';
        renderWeekView(grid);
    } else if (currentCalendarView === 'day') {
        grid.className = 'flex flex-1 overflow-hidden';
        renderDayView(grid);
    }
}

function renderWeekView(container) {
    const startOfWeek = dateFns.startOfWeek(currentCalendarDate);
    
    // 1. Time Column
    const timeCol = document.createElement('div');
    timeCol.className = 'w-16 shrink-0 border-r border-white/5 flex flex-col pt-10';
    for (let i = 6; i <= 23; i++) {
        const hour = document.createElement('div');
        hour.className = 'h-16 text-[10px] text-zinc-500 text-right pr-2 pt-0.5 font-mono';
        hour.textContent = `${i}:00`;
        timeCol.appendChild(hour);
    }
    container.appendChild(timeCol);

    // 2. Days Container
    const daysWrapper = document.createElement('div');
    daysWrapper.className = 'flex-1 overflow-x-auto flex flex-col';
    
    // Header Row
    const headerRow = document.createElement('div');
    headerRow.className = 'flex border-b border-white/5 sticky top-0 bg-card z-10';
    for (let i = 0; i < 7; i++) {
        const day = dateFns.addDays(startOfWeek, i);
        const isToday = dateFns.isToday(day);
        const header = document.createElement('div');
        header.className = 'flex-1 py-2 text-center border-r border-white/5 last:border-r-0';
        header.innerHTML = `
            <div class="text-[10px] font-bold text-muted uppercase tracking-widest">${dateFns.format(day, 'EEE')}</div>
            <div class="text-sm font-bold ${isToday ? 'text-emerald-400' : 'text-zinc-200'}">${dateFns.format(day, 'd')}</div>
        `;
        headerRow.appendChild(header);
    }
    daysWrapper.appendChild(headerRow);

    // Hourly Grid
    const hourlyGrid = document.createElement('div');
    hourlyGrid.className = 'flex flex-1 overflow-y-auto relative';
    for (let i = 0; i < 7; i++) {
        const day = dateFns.addDays(startOfWeek, i);
        const col = document.createElement('div');
        col.className = 'flex-1 border-r border-white/5 last:border-r-0 relative';
        
        for (let h = 6; h <= 23; h++) {
            const slot = document.createElement('div');
            slot.className = 'h-16 border-b border-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer relative cal-slot';
            slot.dataset.date = dateFns.format(day, 'yyyy-MM-dd');
            slot.dataset.hour = h;
            slot.onclick = () => openAddEventModal(day, h);
            
            // Drag and Drop Listeners
            setupSlotDropZone(slot);
            
            col.appendChild(slot);
        }

        // Render events
        const dayEvents = calendarEvents.filter(e => dateFns.isSameDay(new Date(e.start), day));
        dayEvents.forEach(event => {
            const evEl = renderEventBlock(event);
            if (evEl) col.appendChild(evEl);
        });

        hourlyGrid.appendChild(col);
    }
    daysWrapper.appendChild(hourlyGrid);
    container.appendChild(daysWrapper);
}

function renderDayView(container) {
    // 1. Time Column (Same as Week but cleaner)
    const timeCol = document.createElement('div');
    timeCol.className = 'w-20 shrink-0 border-r border-white/5 flex flex-col pt-4';
    for (let i = 6; i <= 23; i++) {
        const hour = document.createElement('div');
        hour.className = 'h-24 text-[10px] text-zinc-500 text-right pr-3 pt-0.5 font-mono';
        hour.textContent = `${i}:00`;
        timeCol.appendChild(hour);
    }
    container.appendChild(timeCol);

    // 2. Day Content
    const content = document.createElement('div');
    content.className = 'flex-1 overflow-y-auto relative';
    
    for (let h = 6; h <= 23; h++) {
        const slot = document.createElement('div');
        slot.className = 'h-24 border-b border-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer relative cal-slot';
        slot.dataset.date = dateFns.format(currentCalendarDate, 'yyyy-MM-dd');
        slot.dataset.hour = h;
        slot.onclick = () => openAddEventModal(currentCalendarDate, h);
        
        setupSlotDropZone(slot);
        
        content.appendChild(slot);
    }

    // Render events
    const dayEvents = calendarEvents.filter(e => dateFns.isSameDay(new Date(e.start), currentCalendarDate));
    dayEvents.forEach(event => {
        const evEl = renderEventBlock(event, true);
        if (evEl) content.appendChild(evEl);
    });

    container.appendChild(content);
}

function renderEventBlock(event, isLarge = false) {
    const start = new Date(event.start);
    const end = new Date(event.end);
    const startHour = start.getHours();
    const startMin = start.getMinutes();
    const durationMin = dateFns.differenceInMinutes(end, start);
    
    if (startHour < 6 || startHour > 23) return null;

    const slotHeight = isLarge ? 96 : 64; // h-24 vs h-16
    const topOffset = (startHour - 6) * slotHeight + (startMin / 60) * slotHeight;
    const height = (durationMin / 60) * slotHeight;

    const div = document.createElement('div');
    div.className = `absolute left-1 right-1 rounded-md p-2 border-l-4 shadow-xl z-2 transition-all hover:scale-[1.02] cursor-pointer ${getEventClass(event.type)}`;
    div.style.top = `${topOffset}px`;
    div.style.height = `${height}px`;
    
    div.innerHTML = `
        <div class="font-bold text-[11px] truncate">${event.title}</div>
        <div class="text-[10px] opacity-70">${dateFns.format(start, 'HH:mm')} - ${dateFns.format(end, 'HH:mm')}</div>
    `;
    
    div.onclick = (e) => {
        e.stopPropagation();
        editEvent(event.id);
    };

    return div;
}

function openAddEventModal(date, hour = 9) {
    const modal = document.getElementById('modal-event');
    const form = document.getElementById('event-form');
    if (!modal || !form) return;

    document.getElementById('event-modal-title').textContent = 'New Block';
    document.getElementById('event-id').value = '';
    document.getElementById('event-title').value = '';
    document.getElementById('event-type').value = 'focus';
    document.getElementById('event-date').value = dateFns.format(date, 'yyyy-MM-dd');
    document.getElementById('event-start').value = `${String(hour).padStart(2, '0')}:00`;
    document.getElementById('event-end').value = `${String(hour + 1).padStart(2, '0')}:00`;
    
    document.getElementById('modal-event-delete').classList.add('hidden');
    modal.classList.add('open');
}

function editEvent(id) {
    const event = calendarEvents.find(e => e.id === id);
    if (!event) return;

    const modal = document.getElementById('modal-event');
    if (!modal) return;

    document.getElementById('event-modal-title').textContent = 'Edit Block';
    document.getElementById('event-id').value = event.id;
    document.getElementById('event-title').value = event.title;
    document.getElementById('event-type').value = event.type;
    
    const start = new Date(event.start);
    const end = new Date(event.end);
    
    document.getElementById('event-date').value = dateFns.format(start, 'yyyy-MM-dd');
    document.getElementById('event-start').value = dateFns.format(start, 'HH:mm');
    document.getElementById('event-end').value = dateFns.format(end, 'HH:mm');

    document.getElementById('modal-event-delete').classList.remove('hidden');
    modal.classList.add('open');
}

function renderMonthView(container) {
    const startObj = dateFns.startOfMonth(currentCalendarDate);
    const endObj = dateFns.endOfMonth(currentCalendarDate);
    const startDate = dateFns.startOfWeek(startObj);
    const endDate = dateFns.endOfWeek(endObj);
    
    // Day Headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        const div = document.createElement('div');
        div.className = 'text-center text-[10px] font-bold text-muted uppercase tracking-widest py-2 border-b border-white/5';
        div.textContent = day;
        container.appendChild(div);
    });

    let current = startDate;
    while (dateFns.isBefore(current, dateFns.addDays(endDate, 1))) {
        const isCurrentMonth = dateFns.isSameMonth(current, currentCalendarDate);
        const isToday = dateFns.isToday(current);
        
        const cell = document.createElement('div');
        cell.className = `min-h-[100px] p-2 border-b border-r border-white/5 relative group transition-colors hover:bg-white/[0.02] ${!isCurrentMonth ? 'opacity-30' : ''}`;
        
        cell.innerHTML = `
            <span class="text-xs font-medium ${isToday ? 'bg-white text-zinc-950 w-6 h-6 rounded-full flex items-center justify-center -ml-1 -mt-1 shadow-lg' : 'text-zinc-500'}">
                ${dateFns.format(current, 'd')}
            </span>
            <div class="mt-2 space-y-1 overflow-y-auto max-h-[70px] cal-event-container">
            </div>
        `;

        // Render events for this day
        const dayEvents = calendarEvents.filter(e => dateFns.isSameDay(new Date(e.start), current));
        const eventContainer = cell.querySelector('.cal-event-container');
        dayEvents.forEach(event => {
            const evEl = document.createElement('div');
            evEl.className = `text-[10px] px-1.5 py-0.5 rounded truncate border-l-2 ${getEventClass(event.type)}`;
            evEl.textContent = event.title;
            eventContainer.appendChild(evEl);
        });

        container.appendChild(cell);
        current = dateFns.addDays(current, 1);
    }
}

function getEventClass(type) {
    switch(type) {
        case 'focus': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500';
        case 'meeting': return 'bg-blue-500/10 text-blue-400 border-blue-500';
        case 'wellness': return 'bg-purple-500/10 text-purple-400 border-purple-500';
        default: return 'bg-zinc-800 text-zinc-300 border-zinc-600';
    }
}

async function renderCalendarTasks() {
    const list = document.getElementById('cal-task-list');
    if (!list) return;
    
    const tasks = await Store.get('tasks') || [];
    // Only show tasks that are NOT completed and optionally not already blocked (though let's keep it simple for now)
    const activeTasks = tasks.filter(t => !t.completed);
    
    list.innerHTML = '';
    
    if (activeTasks.length === 0) {
        list.innerHTML = `<div class="py-10 text-center text-zinc-600 text-[10px]">No active tasks</div>`;
        return;
    }

    activeTasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'bg-zinc-900 border border-white/5 rounded-lg p-3 cursor-move hover:border-white/20 transition-all active:scale-95 group';
        item.draggable = true;
        item.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="w-1.5 h-1.5 rounded-full ${task.priority === 'high' ? 'bg-rose-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}"></div>
                <span class="text-xs font-medium text-zinc-300 group-hover:text-white truncate">${task.title}</span>
            </div>
        `;
        
        item.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify(task));
            e.dataTransfer.effectAllowed = 'copy';
            item.classList.add('opacity-50');
        };
        
        item.ondragend = () => {
            item.classList.remove('opacity-50');
        };
        
        list.appendChild(item);
    });
}

function setupSlotDropZone(slot) {
    slot.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        slot.classList.add('bg-white/[0.08]');
    };
    
    slot.ondragleave = () => {
        slot.classList.remove('bg-white/[0.08]');
    };
    
    slot.ondrop = async (e) => {
        e.preventDefault();
        slot.classList.remove('bg-white/[0.08]');
        
        try {
            const taskData = JSON.parse(e.dataTransfer.getData('text/plain'));
            const date = slot.dataset.date;
            const hour = parseInt(slot.dataset.hour);
            
            // Create a new event from the task
            const newEvent = {
                id: Store.generateUUID(),
                title: taskData.title,
                type: 'focus',
                start: `${date}T${String(hour).padStart(2, '0')}:00:00`,
                end: `${date}T${String(hour + 1).padStart(2, '0')}:00:00`,
                taskId: taskData.id,
                createdAt: new Date().toISOString()
            };
            
            calendarEvents.push(newEvent);
            await Store.set('events', calendarEvents);
            renderCalendar();
        } catch (err) {
            console.error('Drop error:', err);
        }
    };
}

// Expose globally
window.initCalendar = initCalendar;
