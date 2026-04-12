/**
 * Task Management Module
 */
"use strict";

async function updateQuote() {
  const quoteText = document.getElementById('quote-text');
  const quoteAuthor = document.getElementById('quote-author');
  if (!quoteText || !quoteAuthor) return;

  const data = await API.fetchQuote();
  if (data) {
    quoteText.textContent = data.quote;
    quoteAuthor.textContent = data.author;
  }
}

// create a new task object
function createTask(title, priority = 'medium') {
  return {
    id: generateId(),
    title: title,
    priority: priority,
    status: 'active',
    createdAt: Date.now(),
  };
}

function getTasks() {
  return Store.get('tasks') || [];
}

function saveTasks(taskArray) {
  Store.set('tasks', taskArray);
}

function addTask(title, priority) {
  const tasks = getTasks();
  const newTask = createTask(title, priority);
  tasks.push(newTask);
  saveTasks(tasks);
  return newTask;
}

function deleteTask(id) {
  let tasks = getTasks();
  tasks = tasks.filter((task) => task.id !== id);
  saveTasks(tasks);
}

function toggleTask(id) {
  const tasks = getTasks();
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.status = task.status === 'active' ? 'completed' : 'active';
    saveTasks(tasks);
  }
}

function updateTaskStatus() {
  const tasks = getTasks();
  const totalEl = document.getElementById('stat-total-val');
  const activeEl = document.getElementById('stat-active-val');
  const completedEl = document.getElementById('stat-completed-val');

  if (totalEl) totalEl.textContent = tasks.length;
  if (activeEl) activeEl.textContent = tasks.filter(t => t.status === 'active').length;
  if (completedEl) completedEl.textContent = tasks.filter(t => t.status === 'completed').length;
}

function renderDashboardTasks() {
    const container = document.getElementById('dashboard-task-list');
    
    // Always update counts even if list rendering fails
    updateTaskStatus();

    if (!container) return;

    container.innerHTML = '';
    const tasks = getTasks().filter(t => t.status === 'active').slice(0, 5);

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

function renderTasks(filterType = 'all') {
  const container = document.getElementById('task-list');
  
  // Always update stats if they exist (on dashboard or focus list)
  updateTaskStatus();
  renderDashboardTasks();

  if (!container) return;
  
  container.innerHTML = '';
  let tasks = getTasks();

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
window.initTasks = function() {
    console.log("Aether: Initializing Focus List...");
    renderTasks();
    updateQuote();

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
        taskForm.onsubmit = (e) => {
            e.preventDefault();
            const title = document.getElementById('task-title-input').value;
            const priority = document.getElementById('task-priority-input').value;
            
            if (title.trim()) {
                addTask(title, priority);
                renderTasks();
                taskForm.reset();
                taskModal?.classList.remove('open');
            }
        };
    }

    // Filtering
    if (filters) {
        filters.onclick = (e) => {
            const btn = e.target.closest('.filter-btn');
            if (btn) {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderTasks(btn.dataset.filter);
            }
        };
    }

    // Task Interactions (Delete / Toggle)
    if (taskList) {
        taskList.onclick = (e) => {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;
            const id = taskItem.dataset.id;

            if (e.target.type === 'checkbox') {
                toggleTask(id);
                renderTasks();
            } else if (e.target.closest('.delete-task-btn')) {
                deleteTask(id);
                renderTasks();
            }
        };
    }
};
