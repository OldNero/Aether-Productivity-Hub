'use strict';

/**
 * Aether Command Palette — Global Search & Action Center
 * Optimized for high-speed local snapshotting to eliminate cloud latency during search.
 */
const Palette = {
    isOpen: false,
    selectedIndex: 0,
    results: [],
    modal: null,
    input: null,
    resultsContainer: null,
    
    // Local snapshot to prevent cloud-fetch on every keystroke
    snapshot: {
        tasks: [],
        investments: [],
        views: [
            { id: 'dashboard', title: 'Dashboard', subtitle: 'Global Overview' },
            { id: 'tasks', title: 'Focus List', subtitle: 'Task Management' },
            { id: 'investments', title: 'Portfolio', subtitle: 'Asset Tracking' },
            { id: 'timer', title: 'Pomodoro Timer', subtitle: 'Deep Work' },
            { id: 'habits', title: 'Consistency Canvas', subtitle: 'Habit Tracking' },
            { id: 'settings', title: 'Settings', subtitle: 'Account & Preferences' }
        ]
    },

    init() {
        this.modal = document.getElementById('command-palette');
        this.input = document.getElementById('palette-input');
        this.resultsContainer = document.getElementById('palette-results');
        if (!this.modal || !this.input) return;

        // Wire header button if exists (using robust listener)
        const headerSearchBtn = document.getElementById('open-search-btn');
        const mobileSearchBtn = document.getElementById('mobile-search-btn');
        
        const openPalette = (e) => {
            e.preventDefault();
            this.open();
        };

        if (headerSearchBtn) headerSearchBtn.addEventListener('click', openPalette);
        if (mobileSearchBtn) mobileSearchBtn.addEventListener('click', openPalette);

        this.initEventListeners();
        console.log('Aether: Command Palette engine online [Snapshot Mode].');
    },

    initEventListeners() {
        this.input.oninput = (e) => this.handleSearch(e.target.value);
        this.input.onkeydown = (e) => this.handleKeydown(e);
    },

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    },

    /**
     * Open & Snapshot: Fetches current state from cloud ONCE per session open.
     */
    async open() {
        this.isOpen = true;
        this.modal.classList.add('open');
        this.input.value = '';
        this.results = [];
        this.renderResults();
        
        // Focus immediately for UX
        setTimeout(() => this.input.focus(), 50);

        // Capture Intelligence Snapshot
        try {
            const [tasks, investments] = await Promise.all([
                Store.get('tasks'),
                Store.get('investments')
            ]);
            this.snapshot.tasks = tasks || [];
            this.snapshot.investments = investments || [];
        } catch (err) {
            console.error('Palette: Snapshot failed.', err);
        }
    },

    close() {
        this.isOpen = false;
        this.modal.classList.remove('open');
        this.input.blur();
    },

    /**
     * Optimized Search: Runs 100% synchronously against the snapshot.
     */
    handleSearch(query) {
        query = query.trim().toLowerCase();
        if (!query) {
            this.results = [];
            this.renderResults();
            return;
        }

        const cmdResults = [];

        // 1. Natural Language Commands (Instant Parsing)
        if (query.startsWith('task:') || query.startsWith('add:')) {
            const taskName = query.split(':')[1].trim();
            if (taskName) {
                cmdResults.push({
                    id: 'cmd-add-task',
                    title: `Create task: "${taskName}"`,
                    subtitle: 'Press Enter to save to Focus List',
                    type: 'task',
                    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
                    action: () => this.executeAddTask(taskName)
                });
            }
        }

        if (query.startsWith('goto:')) {
            const viewQuery = query.split(':')[1].trim();
            this.snapshot.views
                .filter(v => v.id.includes(viewQuery) || v.title.toLowerCase().includes(viewQuery))
                .forEach(v => {
                    cmdResults.push({
                        id: `cmd-goto-${v.id}`,
                        title: `Go to ${v.title}`,
                        subtitle: v.subtitle,
                        type: 'goto',
                        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>',
                        action: () => { ViewManager.loadView(v.id); this.close(); }
                    });
                });
        }

        // 2. Fuzzy Snapshot Discovery (if no prefixes matched)
        if (cmdResults.length === 0) {
            // Check Views
            this.snapshot.views.forEach(v => {
                if (v.title.toLowerCase().includes(query)) {
                    cmdResults.push({
                        id: `view-${v.id}`,
                        title: v.title,
                        subtitle: v.subtitle,
                        type: 'goto',
                        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
                        action: () => { ViewManager.loadView(v.id); this.close(); }
                    });
                }
            });

            // Check Tasks
            this.snapshot.tasks
                .filter(t => t.text.toLowerCase().includes(query))
                .slice(0, 5)
                .forEach(t => {
                    cmdResults.push({
                        id: `task-${t.id}`,
                        title: t.text,
                        subtitle: `Task · ${t.completed ? 'Completed' : 'Active'}`,
                        type: 'task',
                        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
                        action: () => { ViewManager.loadView('tasks'); this.close(); }
                    });
                });

            // Check Investments
            this.snapshot.investments
                .filter(inv => inv.symbol.toLowerCase().includes(query))
                .slice(0, 5)
                .forEach(inv => {
                    cmdResults.push({
                        id: `inv-${inv.id}`,
                        title: inv.symbol,
                        subtitle: `${inv.quantity} shares · $${inv.price.toFixed(2)}`,
                        type: 'inv',
                        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
                        action: () => { ViewManager.loadView('investments'); this.close(); }
                    });
                });
        }

        this.results = cmdResults;
        this.selectedIndex = 0;
        this.renderResults();
    },

    renderResults() {
        if (!this.resultsContainer) return;
        
        if (this.results.length === 0) {
            const q = this.input.value;
            this.resultsContainer.innerHTML = `
                <div class="p-8 text-center">
                    <p class="text-zinc-500 text-sm mb-1">${q ? `No results for "${q}"` : 'Aether Search'}</p>
                    <p class="text-[10px] text-muted uppercase tracking-widest">
                        ${q ? 'Try a broader search term' : 'Type codes like <span class="text-zinc-400">goto:</span> or <span class="text-zinc-400">task:</span>'}
                    </p>
                </div>
            `;
            return;
        }

        this.resultsContainer.innerHTML = '';
        this.results.forEach((res, i) => {
            const div = document.createElement('div');
            div.className = `palette-result-item ${i === this.selectedIndex ? 'active' : ''}`;
            div.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="palette-icon-box palette-icon-box--${res.type}">
                        ${res.icon || ''}
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-zinc-100">${res.title}</p>
                        <p class="text-[11px] text-muted uppercase tracking-tighter">${res.subtitle}</p>
                    </div>
                </div>
                <div class="palette-kbd">Enter</div>
            `;
            div.onclick = () => res.action();
            this.resultsContainer.appendChild(div);
        });

        const active = this.resultsContainer.querySelector('.active');
        if (active) active.scrollIntoView({ block: 'nearest' });
    },

    handleKeydown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
            this.renderResults();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex - 1 + this.results.length) % this.results.length;
            this.renderResults();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = this.results[this.selectedIndex];
            if (selected) selected.action();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.close();
        }
    },

    async executeAddTask(text) {
        // Optimistic update
        const tasks = await Store.get('tasks') || [];
        const newTask = {
            id: Store.generateUUID(),
            text: text,
            completed: false,
            created_at: new Date().toISOString()
        };
        tasks.unshift(newTask);
        await Store.set('tasks', tasks);
        
        // Show success
        this.input.value = '';
        this.results = [{
            id: 'success',
            title: 'Task Created!',
            subtitle: 'Syncing to your Focus List...',
            type: 'task',
            icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
            action: () => {}
        }];
        this.renderResults();
        
        setTimeout(() => {
            ViewManager.loadView('tasks');
            this.close();
        }, 800);
    }
};

window.Palette = Palette;
