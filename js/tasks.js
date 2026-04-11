/**
 * Task Management logic
 */

async function updateQuote() {
  const quoteText = document.getElementById('quote-text');
  const quoteAuthor = document.getElementById('quote-author');

  const data = await API.fetchQuote();
  
  if (data) {
    quoteText.textContent = data.quote;
    quoteAuthor.textContent = data.author;
  }
}

// Initial quote load
updateQuote();

// create a new task
function createTask(title, priority = 'medium') {
  return {
    id: generateId(),
    title: title,
    priority: priority,
    status: 'active',
    createdAt: Date.now(),
  };
}

// retrieve tasks
function getTasks() {
  return Store.get('tasks') || [];
}

// save the task
function saveTask(taskArray) {
  Store.set('tasks', taskArray);
}

// add a task
function addTask(title, priority) {
  let tasks = getTasks();

  let newTask = createTask(title, priority);

  tasks.push(newTask);

  saveTask(tasks);

  return newTask;
}

// deleting a task
function deleteTask(id) {
  let tasks = getTasks();

  // filter non-matching ids and save it to localStorage
  tasks = tasks.filter((task) => task.id !== id);
  saveTask(tasks);
}

// toggle task state
function toggletask(id) {
  let tasks = getTasks();

  let myTask = tasks.find((task) => task.id === id);

  if (myTask.status === 'active') {
    myTask.status = 'completed';
  } else {
    myTask.status = 'active';
  }

  saveTask(tasks);
}

function renderTasks(filterType = 'all') {
  let container = document.getElementById('task-list');
  container.innerHTML = '';

  let tasks = getTasks();

  if (filterType === 'active') {
    tasks = tasks.filter((task) => task.status === 'active');
  } else if (filterType === 'completed') {
    tasks = tasks.filter((task) => task.status === 'completed');
  }

  tasks.forEach((task) => {
    let div = document.createElement('div');
    div.className = 'task-item';

    if (task.status === 'completed') {
      div.classList.add('task-item--completed');
    }

    div.dataset.id = task.id;
    div.innerHTML = `
              <label class="task-item__checkbox">
                <input type="checkbox" ${
                  task.status === 'completed' ? 'checked' : ''
                } />
                <span class="task-item__checkmark"></span>
              </label>
              <div class="task-item__content">
                <span class="task-item__title">${task.title}</span>
                <span class="task-item__meta">${timeElapsed(
                  task.createdAt
                )}</span>
              </div>
              <span class="badge badge--${task.priority}">${
      task.priority
    }</span>
              <div class="task-item__actions">
                <button class="btn btn--ghost btn--icon btn--sm btn--danger" aria-label="Delete task">
                  ❌ <!-- Using an emoji for now to keep it simple! -->
                </button>
              </div>
           `;

    container.appendChild(div);
  });

  updateTaskStatus();
  renderDashboardTasks();
}

function updateTaskStatus() {
  let tasks = getTasks();

  let total = tasks.length;

  let activeCount = tasks.filter((task) => task.status === 'active').length;
  let completedCount = tasks.filter(
    (task) => task.status === 'completed'
  ).length;

  document.getElementById('stat-total-val').textContent = total;
  document.getElementById('stat-active-val').textContent = activeCount;
  document.getElementById('stat-completed-val').textContent = completedCount;
}

document.getElementById('task-list').addEventListener('click', (event) => {
  let taskDiv = event.target.closest('.task-item');

  if (taskDiv == null) return;

  let id = taskDiv.dataset.id;

/**
 * Task Management Module
 * Exported as a global init function for the View Loader
 */

window.initTasks = function() {
    console.log("Aether: Initializing Tasks Module...");
    renderTasks();

    const addBtn = document.getElementById('add-task-btn');
    if (addBtn) {
        addBtn.onclick = () => {
            document.getElementById('modal-task').classList.add('open');
        };
    }

    const closeBtn = document.getElementById('modal-task-close');
    if (closeBtn) {
        closeBtn.onclick = () => {
            document.getElementById('modal-task').classList.remove('open');
        };
    }

    const cancelBtn = document.getElementById('modal-task-cancel');
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            document.getElementById('modal-task').classList.remove('open');
        };
    }

    const form = document.getElementById('task-form');
    if (form) {
        form.onsubmit = (event) => {
            event.preventDefault();
            const title = document.getElementById('task-title-input').value;
            const priority = document.getElementById('task-priority-input').value;
            if (title.trim()) {
                addTask(title, priority);
                renderTasks();
                form.reset();
                document.getElementById('modal-task').classList.remove('open');
            }
        };
    }

    const filters = document.getElementById('task-filters');
    if (filters) {
        filters.onclick = (event) => {
            const btn = event.target.closest('.filter-btn');
            if (btn) {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderTasks(btn.dataset.filter);
            }
        };
    }

    const list = document.getElementById('task-list');
    if (list) {
        list.onclick = (event) => {
            const item = event.target.closest('.task-item');
            if (!item) return;
            const id = item.dataset.id;
            
            if (event.target.type === 'checkbox') {
                toggletask(id);
                renderTasks();
            } else if (event.target.closest('.btn--danger')) {
                deleteTask(id);
                renderTasks();
            }
        };
    }
};

// Internal rendering logic (staying global for dashboard preview)
function renderTasks(filterType = 'all') {
    const container = document.getElementById('task-list');
    if (!container) return;
    
    container.innerHTML = '';
    let tasks = getTasks();

    if (filterType === 'active') {
        tasks = tasks.filter(t => t.status === 'active');
    } else if (filterType === 'completed') {
        tasks = tasks.filter(t => t.status === 'completed');
    }

    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = `task-item ${task.status === 'completed' ? 'task-item--completed' : ''}`;
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
            <div class="flex items-center gap-2">
                <span class="badge badge--${task.priority}">${task.priority}</span>
                <button class="btn--danger p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                    </svg>
                </button>
            </div>
        `;
        container.appendChild(div);
    });

    const empty = document.getElementById('tasks-empty-state');
    if (empty) {
        empty.classList.toggle('hidden', tasks.length > 0);
    }
}
