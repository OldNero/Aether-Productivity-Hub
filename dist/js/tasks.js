/**
 * Task Management Module
 */
"use strict";

async function updateQuote() {
  const quoteText = document.getElementById('quote-text');
  const quoteAuthor = document.getElementById('quote-author');
  if (!quoteText || !quoteAuthor) return;

  // Enforce a minimum 1s skeleton presence for visual intent
  const [data] = await Promise.all([
    API.fetchQuote(),
    new Promise(resolve => setTimeout(resolve, 1000))
  ]);

  if (data) {
    quoteText.innerHTML = `"${data.quote}"`;
    quoteAuthor.innerHTML = `— ${data.author}`;
  } else {
    quoteText.innerHTML = `"The only way to do great work is to love what you do."`;
    quoteAuthor.innerHTML = `— Steve Jobs`;
  }
}

// create a new task object
function createTask(title, priority = 'medium') {
  return {
    id: Store.generateUUID(),
    title: title,
    priority: priority,
    status: 'active',
    subtasks: [],
    project_id: 'inbox',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

async function getTasks() {
  return await Store.get('tasks') || [];
}

async function saveTasks(taskArray) {
  await Store.set('tasks', taskArray);
}

async function addTask(title, priority, project_id = 'inbox') {
  const tasks = await getTasks();
  const newTask = createTask(title, priority);
  newTask.project_id = project_id;
  tasks.push(newTask);
  await saveTasks(tasks);
  return newTask;
}

async function deleteTask(id) {
  await Store.remove('tasks', id);
}

async function toggleTask(id) {
  const tasks = await getTasks();
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.status = task.status === 'active' ? 'completed' : 'active';
    task.updated_at = new Date().toISOString();
    // Auto-complete all subtasks if task is completed
    if (task.status === 'completed' && task.subtasks) {
        task.subtasks.forEach(s => s.completed = true);
    }
    await saveTasks(tasks);
  }
}

async function addSubtask(taskId, title) {
    const tasks = await getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task && title.trim()) {
        if (!task.subtasks) task.subtasks = [];
        task.subtasks.push({
            id: Store.generateUUID(),
            title: title.trim(),
            completed: false
        });
        task.updated_at = new Date().toISOString();
        await saveTasks(tasks);
    }
}

async function toggleSubtask(taskId, subtaskId) {
    const tasks = await getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task && task.subtasks) {
        const sub = task.subtasks.find(s => s.id === subtaskId);
        if (sub) {
            sub.completed = !sub.completed;
            task.updated_at = new Date().toISOString();
            
            // Auto-complete parent if all subtasks are done? (Optional UX choice)
            // For now, let's just keep them independent.
            
            await saveTasks(tasks);
        }
    }
}

async function updateTaskStatus() {
  const tasks = await getTasks();
  const totalEl = document.getElementById('stat-total-val');
  const activeEl = document.getElementById('stat-active-val');
  const completedEl = document.getElementById('stat-completed-val');

  if (totalEl) totalEl.textContent = tasks.length;
  if (activeEl) activeEl.textContent = tasks.filter(t => t.status === 'active').length;
  if (completedEl) completedEl.textContent = tasks.filter(t => t.status === 'completed').length;
}

async function renderDashboardTasks() {
    const container = document.getElementById('dashboard-task-list');
    
    // Always update counts even if list rendering fails
    await updateTaskStatus();

    if (!container) return;

    container.innerHTML = '';
    const allTasks = await getTasks();
    const tasks = allTasks.filter(t => t.status === 'active').slice(0, 5);

    if (tasks.length === 0) {
        container.innerHTML = '<p class="text-xs text-muted py-4">No active tasks. Time to focus?</p>';
        return;
    }

    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-3 py-2 border-b border-white/5 last:border-0';
        div.innerHTML = `
            <div class="w-1.5 h-1.5 rounded-full bg-zinc-500"></div>
            <span class="text-sm text-zinc-300 flex-1 truncate">${task.title}</span>
            <span class="badge badge--${task.priority} scale-90Origin">${task.priority}</span>
        `;
        container.appendChild(div);
    });
}

async function renderTasks(filterType = 'all') {
  const container = document.getElementById('task-list');
  const skeleton = document.getElementById('tasks-skeleton');
  
  // Always update stats if they exist (on dashboard or focus list)
  await updateTaskStatus();
  await renderDashboardTasks();

  if (!container) return;
  
  // Show skeleton on initial render if container is empty
  let isInitialRender = false;
  if (skeleton && !container.innerHTML.trim() && filterType === 'all') {
      isInitialRender = true;
      container.classList.add('hidden');
      skeleton.classList.remove('hidden');
      // Ensure skeleton is visible for at least 600ms for visual polish
      await new Promise(resolve => setTimeout(resolve, 600));
  }

  container.innerHTML = '';
  let tasks = await getTasks();

  if (filterType === 'active') {
    tasks = tasks.filter((t) => t.status === 'active');
  } else if (filterType === 'completed') {
    tasks = tasks.filter((t) => t.status === 'completed');
  }

  if (tasks.length === 0) {
    document.getElementById('tasks-empty-state')?.classList.remove('hidden');
  } else {
    document.getElementById('tasks-empty-state')?.classList.add('hidden');
  }

  tasks.forEach((task) => {
    const div = document.createElement('div');
    div.className = `task-item group ${task.status === 'completed' ? 'task-item--completed' : ''}`;
    div.dataset.id = task.id;
    
    const subtasks = task.subtasks || [];
    const subtasksDone = subtasks.filter(s => s.completed).length;
    const subtasksTotal = subtasks.length;
    const progressPercent = subtasksTotal > 0 ? (subtasksDone / subtasksTotal) * 100 : 0;

    div.innerHTML = `
      <div class="task-item__header">
        <label class="task-item__checkbox">
            <input type="checkbox" ${task.status === 'completed' ? 'checked' : ''} class="main-task-toggle" />
            <span class="task-item__checkmark"></span>
        </label>
        <div class="task-item__content">
            <span class="task-item__title">${task.title}</span>
            <div class="flex items-center gap-2 mt-1">
                <span class="task-item__meta">${timeElapsed(task.created_at)}</span>
                ${subtasksTotal > 0 ? `
                    <span class="text-[10px] text-muted flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                        ${subtasksDone}/${subtasksTotal}
                    </span>
                ` : ''}
            </div>
        </div>
        <span class="badge badge--${task.priority} mr-3">${task.priority}</span>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="p-1.5 hover:bg-white/5 rounded text-muted hover:text-white transition-colors add-subtask-btn" title="Add subtask">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
            <button class="p-1.5 hover:bg-rose-500/10 rounded text-muted hover:text-rose-400 transition-colors delete-task-btn" title="Delete task">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
        </div>
      </div>

      <!-- Subtask Progress -->
      ${subtasksTotal > 0 ? `
        <div class="w-full pl-13 pr-5 mb-2">
            <div class="h-1 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500/50 rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
            </div>
        </div>
      ` : ''}
 
      <!-- Subtasks List -->
      <div class="subtask-list w-full pl-13 pr-5 space-y-1.5 ${subtasks.length > 0 ? 'mb-3' : ''}">
        ${subtasks.map(sub => `
            <div class="flex items-center gap-2.5 py-0.5 group/sub" data-sub-id="${sub.id}">
                <input type="checkbox" ${sub.completed ? 'checked' : ''} class="sub-task-toggle w-3.5 h-3.5 rounded bg-zinc-800 border-white/10 text-emerald-500 focus:ring-0" />
                <span class="text-xs ${sub.completed ? 'text-zinc-600 line-through' : 'text-zinc-400'} flex-1 truncate">${sub.title}</span>
            </div>
        `).join('')}
      </div>
 
      <!-- Subtask Quick Add Input (hidden by default) -->
      <div class="subtask-add-container w-full pl-13 pb-4 pr-5 hidden">
        <input type="text" class="input py-1.5 text-[10px] subtask-quick-input" placeholder="Enter subtask title..." />
      </div>
    `;
    container.appendChild(div);
  });

  if (isInitialRender && skeleton) {
      skeleton.classList.add('hidden');
      container.classList.remove('hidden');
  }
}

/**
 * Main Initialization for Task View
 */
window.initTasks = async function() {
    console.log("Aether: Initializing Focus List...");
    await renderTasks();
    await updateQuote();

    const taskModal = document.getElementById('modal-task');
    const taskForm = document.getElementById('task-form');
    const addBtn = document.getElementById('add-task-btn');
    const closeBtn = document.getElementById('modal-task-close');
    const cancelBtn = document.getElementById('modal-task-cancel');
    const taskList = document.getElementById('task-list');
    const filters = document.getElementById('task-filters');

    // Modal Controls
    if (addBtn && taskModal) {
        addBtn.onclick = () => taskModal.classList.add('open');
    }

    if (closeBtn && taskModal) {
        closeBtn.onclick = () => taskModal.classList.remove('open');
    }

    if (cancelBtn && taskModal) {
        cancelBtn.onclick = () => taskModal.classList.remove('open');
    }

    // Form Submission
    if (taskForm) {
        taskForm.onsubmit = async (e) => {
            e.preventDefault();
            const title = document.getElementById('task-title-input').value;
            const priority = document.getElementById('task-priority-input').value;
            const projectId = document.getElementById('task-project-input').value;
            
            if (title.trim()) {
                await addTask(title, priority, projectId);
                await renderTasks();
                taskForm.reset();
                taskModal?.classList.remove('open');
            }
        };
    }

    // Filtering
    if (filters) {
        filters.onclick = async (e) => {
            const btn = e.target.closest('.filter-btn');
            if (btn) {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                await renderTasks(btn.dataset.filter);
            }
        };
    }

    // Task Interactions (Delete / Toggle)
    if (taskList) {
        taskList.onclick = async (e) => {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;
            const id = taskItem.dataset.id;

            // Main Task Toggle
            if (e.target.classList.contains('main-task-toggle')) {
                await toggleTask(id);
                updateBulkBar();
                await renderTasks();
            } 
            // Subtask Toggle
            else if (e.target.classList.contains('sub-task-toggle')) {
                const subId = e.target.closest('[data-sub-id]').dataset.subId;
                await toggleSubtask(id, subId);
                await renderTasks();
            }
            // Add Subtask Logic
            else if (e.target.closest('.add-subtask-btn')) {
                const inputContainer = taskItem.querySelector('.subtask-add-container');
                inputContainer.classList.toggle('hidden');
                if (!inputContainer.classList.contains('hidden')) {
                    inputContainer.querySelector('input').focus();
                }
            }
            // Delete Task
            else if (e.target.closest('.delete-task-btn')) {
                await deleteTask(id);
                await renderTasks();
            }
        };

        // Handle subtask quick-add (Enter key)
        taskList.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && e.target.classList.contains('subtask-quick-input')) {
                const taskItem = e.target.closest('.task-item');
                const id = taskItem.dataset.id;
                await addSubtask(id, e.target.value);
                await renderTasks();
            }
        });
    }

    // --- BATCH OPERATIONS LOGIC ---
    const bulkBar = document.getElementById('bulk-actions');
    const bulkCountDisp = document.getElementById('bulk-count');
    const bulkCompleteBtn = document.getElementById('bulk-complete-btn');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
    const bulkCloseBtn = document.getElementById('bulk-close-btn');

    function updateBulkBar() {
        const selected = Array.from(document.querySelectorAll('.main-task-toggle:checked'));
        if (selected.length > 0) {
            bulkCountDisp.textContent = `${selected.length} Selected`;
            bulkBar.classList.remove('translate-y-24', 'opacity-0');
        } else {
            bulkBar.classList.add('translate-y-24', 'opacity-0');
        }
    }

    if (bulkCloseBtn) {
        bulkCloseBtn.onclick = () => {
            document.querySelectorAll('.main-task-toggle:checked').forEach(cb => cb.checked = false);
            updateBulkBar();
        };
    }

    if (bulkCompleteBtn) {
        bulkCompleteBtn.onclick = async () => {
            const selectedIds = Array.from(document.querySelectorAll('.main-task-toggle:checked'))
                .map(cb => cb.closest('.task-item').dataset.id);
            
            const tasks = await getTasks();
            tasks.forEach(t => {
                if (selectedIds.includes(t.id)) {
                    t.status = 'completed';
                    t.subtasks.forEach(s => s.completed = true);
                }
            });
            await saveTasks(tasks);
            updateBulkBar();
            await renderTasks();
        };
    }

    if (bulkDeleteBtn) {
        bulkDeleteBtn.onclick = async () => {
            if (!confirm('Delete selected tasks?')) return;
            const selectedIds = Array.from(document.querySelectorAll('.main-task-toggle:checked'))
                .map(cb => cb.closest('.task-item').dataset.id);
            
            let tasks = await getTasks();
            tasks = tasks.filter(t => !selectedIds.includes(t.id));
            await saveTasks(tasks);
            updateBulkBar();
            await renderTasks();
        };
    }
};
