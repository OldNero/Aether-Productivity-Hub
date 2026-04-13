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
    createdAt: Date.now(),
  };
}

async function getTasks() {
  return await Store.get('tasks') || [];
}

async function saveTasks(taskArray) {
  await Store.set('tasks', taskArray);
}

async function addTask(title, priority) {
  const tasks = await getTasks();
  const newTask = createTask(title, priority);
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
    await saveTasks(tasks);
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
  
  // Always update stats if they exist (on dashboard or focus list)
  await updateTaskStatus();
  await renderDashboardTasks();

  if (!container) return;
  
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
    div.innerHTML = `
      <label class="task-item__checkbox">
        <input type="checkbox" ${task.status === 'completed' ? 'checked' : ''} />
        <span class="task-item__checkmark"></span>
      </label>
      <div class="task-item__content">
        <span class="task-item__title">${task.title}</span>
        <span class="task-item__meta">${timeElapsed(task.createdAt)}</span>
      </div>
      <span class="badge badge--${task.priority} mr-3">${task.priority}</span>
      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button class="p-1.5 hover:bg-rose-500/10 rounded text-muted hover:text-rose-400 transition-colors delete-task-btn" title="Delete task">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
    container.appendChild(div);
  });
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
            
            if (title.trim()) {
                await addTask(title, priority);
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

            if (e.target.type === 'checkbox') {
                await toggleTask(id);
                await renderTasks();
            } else if (e.target.closest('.delete-task-btn')) {
                await deleteTask(id);
                await renderTasks();
            }
        };
    }
};
