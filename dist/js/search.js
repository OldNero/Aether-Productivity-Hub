'use strict';

/**
 * Aether Global Search — Header Bar + Dropdown
 */
const SearchController = (() => {
    let selectedIndex = -1;
    let currentResults = [];
    let debounceTimer = null;

    function init() {
        const input = document.getElementById('global-search-input');
        const dropdown = document.getElementById('global-search-dropdown');
        const resultsContainer = document.getElementById('global-search-results');

        if (!input || !dropdown || !resultsContainer) {
            console.warn('Aether Search: DOM elements not found');
            return;
        }

        console.log('Aether Search: Initialized');

        // Type to search with debounce
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const query = input.value.trim().toLowerCase();

            if (!query) {
                closeDropdown();
                return;
            }

            debounceTimer = setTimeout(() => runSearch(query), 150);
        });

        // Focus opens dropdown if there's text
        input.addEventListener('focus', () => {
            if (input.value.trim()) {
                runSearch(input.value.trim().toLowerCase());
            }
        });

        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            if (!dropdown.classList.contains('hidden')) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    navigate(1);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    navigate(-1);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    selectCurrent();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeDropdown();
                    input.blur();
                }
            } else if (e.key === 'Escape') {
                input.blur();
            }
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            const wrapper = document.getElementById('global-search-wrapper');
            if (wrapper && !wrapper.contains(e.target)) {
                closeDropdown();
            }
        });

        // Ctrl+K / Cmd+K to focus the search bar
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                input.focus();
                input.select();
            }

            // '/' shortcut when not in an input
            if (e.key === '/' && document.activeElement !== input && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                input.focus();
                input.select();
            }
        });
    }

    async function runSearch(query) {
        const dropdown = document.getElementById('global-search-dropdown');
        const resultsContainer = document.getElementById('global-search-results');

        // Fetch data concurrently
        const [tasks, investments, habits, events] = await Promise.all([
            Store.get('tasks').catch(() => []),
            Store.get('investments').catch(() => []),
            Store.get('habits').catch(() => ({ customRituals: [] })),
            Store.get('events').catch(() => [])
        ]);

        const safeTasks = tasks || [];
        const safeInvestments = investments || [];
        const safeHabits = habits?.customRituals || [];
        const safeEvents = events || [];

        // Filter Tasks
        const matchedTasks = safeTasks
            .filter(t => t.title && t.title.toLowerCase().includes(query))
            .slice(0, 5)
            .map(t => ({
                type: 'task',
                title: t.title,
                subtitle: t.status === 'completed' ? '✓ Completed' : `Priority: ${t.priority}`,
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
                iconColor: 'text-emerald-400 bg-emerald-500/10',
                view: 'routines'
            }));

        // Filter Investments
        const matchedInvestments = safeInvestments
            .filter(i =>
                (i.symbol && i.symbol.toLowerCase().includes(query)) ||
                (i.notes && i.notes.toLowerCase().includes(query))
            )
            .slice(0, 5)
            .map(i => ({
                type: 'investment',
                title: i.symbol === '$CASH' ? 'Cash Deposit' : i.symbol,
                subtitle: `${(i.type || 'buy').charAt(0).toUpperCase() + (i.type || 'buy').slice(1)} · ${i.quantity} shares · $${(i.total || 0).toFixed(2)}`,
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
                iconColor: 'text-violet-400 bg-violet-500/10',
                view: 'investments'
            }));

        // Filter Habits
        const matchedHabits = safeHabits
            .filter(h => h.label && h.label.toLowerCase().includes(query))
            .slice(0, 3)
            .map(h => ({
                type: 'habit',
                title: h.label,
                subtitle: `Type: ${h.type || 'Binary'} · Target: ${h.target || 1}`,
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>`,
                iconColor: 'text-amber-400 bg-amber-500/10',
                view: 'routines'
            }));

        // Filter Calendar Events
        const matchedEvents = safeEvents
            .filter(e => e.title && e.title.toLowerCase().includes(query))
            .slice(0, 5)
            .map(e => ({
                type: 'event',
                title: e.title,
                subtitle: `${e.date} · ${e.time || ''}`,
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>`,
                iconColor: 'text-sky-400 bg-sky-500/10',
                view: 'calendar'
            }));

        // --- QUICK ACTION COMMANDS ---
        let commands = [];
        if (query.startsWith('/task ')) {
            const title = query.slice(6);
            commands.push({
                type: 'command',
                title: `Create task: "${title}"`,
                subtitle: 'Press Enter to capture as new focused task',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>`,
                iconColor: 'text-white bg-white/20',
                action: async () => {
                    const { addTask } = await import('./tasks.js');
                    await addTask(title, 'medium');
                }
            });
        }
        if (query.startsWith('/habit ')) {
            const label = query.slice(7);
            commands.push({
                type: 'command',
                title: `Create habit: "${label}"`,
                subtitle: 'Press Enter to evolve a new routine',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>`,
                iconColor: 'text-white bg-white/20',
                action: async () => {
                   const data = await Store.get('habits') || { customRituals: [] };
                   data.customRituals.push({ id: 'adv_'+Store.generateUUID().slice(0,8), label, type: 'binary' });
                   await Store.set('habits', data);
                }
            });
        }

        currentResults = [...commands, ...matchedTasks, ...matchedHabits, ...matchedEvents, ...matchedInvestments];
        selectedIndex = currentResults.length > 0 ? 0 : -1;

        renderResults(resultsContainer, dropdown, query);
    }

    function renderResults(container, dropdown, query) {
        if (currentResults.length === 0) {
            container.innerHTML = `
                <div class="px-4 py-8 text-center">
                    <p class="text-sm text-zinc-500">No results for "<span class="text-zinc-300">${query}</span>"</p>
                </div>
            `;
            dropdown.classList.remove('hidden');
            return;
        }

        const commands = currentResults.filter(r => r.type === 'command');
        const tasks = currentResults.filter(r => r.type === 'task');
        const habits = currentResults.filter(r => r.type === 'habit');
        const events = currentResults.filter(r => r.type === 'event');
        const investments = currentResults.filter(r => r.type === 'investment');

        let html = '';
        let globalIndex = 0;

        if (commands.length > 0) {
            html += `<p class="text-[10px] font-bold text-white uppercase tracking-widest px-4 pt-3 pb-1">Commands</p>`;
            commands.forEach(res => {
                html += buildResultItem(res, globalIndex, globalIndex === selectedIndex);
                globalIndex++;
            });
        }

        if (tasks.length > 0) {
            html += `<p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4 pt-3 pb-1">Tasks</p>`;
            tasks.forEach(res => {
                html += buildResultItem(res, globalIndex, globalIndex === selectedIndex);
                globalIndex++;
            });
        }

        if (habits.length > 0) {
            html += `<p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4 pt-3 pb-1">Habits</p>`;
            habits.forEach(res => {
                html += buildResultItem(res, globalIndex, globalIndex === selectedIndex);
                globalIndex++;
            });
        }

        if (events.length > 0) {
            html += `<p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4 pt-3 pb-1">Events</p>`;
            events.forEach(res => {
                html += buildResultItem(res, globalIndex, globalIndex === selectedIndex);
                globalIndex++;
            });
        }

        if (investments.length > 0) {
            html += `<p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4 pt-3 pb-1">Portfolio</p>`;
            investments.forEach(res => {
                html += buildResultItem(res, globalIndex, globalIndex === selectedIndex);
                globalIndex++;
            });
        }

        // Footer
        html += `<div class="px-4 py-2.5 border-t border-white/5 bg-black/20 flex items-center justify-between">
            <span class="text-[10px] text-zinc-600">${currentResults.length} result${currentResults.length !== 1 ? 's' : ''}</span>
            <div class="flex items-center gap-3 text-[10px] text-zinc-600">
                <span class="flex items-center gap-1"><kbd class="bg-white/5 px-1 py-0.5 rounded text-zinc-500">↑↓</kbd> navigate</span>
                <span class="flex items-center gap-1"><kbd class="bg-white/5 px-1 py-0.5 rounded text-zinc-500">↵</kbd> go</span>
            </div>
        </div>`;

        container.innerHTML = html;
        dropdown.classList.remove('hidden');

        // Attach interaction listeners
        container.querySelectorAll('[data-search-index]').forEach(el => {
            el.addEventListener('click', () => {
                selectedIndex = parseInt(el.dataset.searchIndex);
                selectCurrent();
            });
            el.addEventListener('mouseenter', () => {
                selectedIndex = parseInt(el.dataset.searchIndex);
                updateSelection(container);
            });
        });
    }

    function buildResultItem(res, index, isSelected) {
        return `
            <div data-search-index="${index}"
                 class="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${res.iconColor}">
                    ${res.icon}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-zinc-300'}">${res.title}</p>
                    <p class="text-[10px] text-zinc-500 truncate">${res.subtitle}</p>
                </div>
                <span class="text-[10px] font-bold uppercase tracking-wider shrink-0 ${isSelected ? 'text-emerald-400' : 'text-zinc-700'}">
                    ${res.type.charAt(0).toUpperCase() + res.type.slice(1)}
                </span>
            </div>`;
    }

    function updateSelection(container) {
        const items = container.querySelectorAll('[data-search-index]');
        items.forEach((el, i) => {
            if (i === selectedIndex) {
                el.classList.add('bg-white/10');
                el.classList.remove('hover:bg-white/5');
                el.querySelector('p')?.classList.add('text-white');
                el.querySelector('p')?.classList.remove('text-zinc-300');
            } else {
                el.classList.remove('bg-white/10');
                el.classList.add('hover:bg-white/5');
                el.querySelector('p')?.classList.remove('text-white');
                el.querySelector('p')?.classList.add('text-zinc-300');
            }
        });
    }

    function navigate(direction) {
        if (currentResults.length === 0) return;
        selectedIndex += direction;
        if (selectedIndex < 0) selectedIndex = currentResults.length - 1;
        if (selectedIndex >= currentResults.length) selectedIndex = 0;

        const container = document.getElementById('global-search-results');
        if (container) {
            updateSelection(container);
            // Scroll into view
            const selected = container.querySelector(`[data-search-index="${selectedIndex}"]`);
            if (selected) selected.scrollIntoView({ block: 'nearest' });
        }
    }

    async function selectCurrent() {
        if (selectedIndex >= 0 && selectedIndex < currentResults.length) {
            const result = currentResults[selectedIndex];
            
            // Execute command if exists
            if (result.type === 'command' && result.action) {
                await result.action();
            }

            closeDropdown();
            document.getElementById('global-search-input').value = '';
            document.getElementById('global-search-input').blur();
            
            if (result.view && typeof ViewManager !== 'undefined') {
                ViewManager.loadView(result.view);
            }
        }
    }

    function closeDropdown() {
        const dropdown = document.getElementById('global-search-dropdown');
        if (dropdown) dropdown.classList.add('hidden');
        currentResults = [];
        selectedIndex = -1;
    }

    return { init };
})();

// Initialize immediately — DOM is already ready since this script loads last
SearchController.init();
