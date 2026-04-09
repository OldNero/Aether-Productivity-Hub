"use strict";

// create a new task
function createTask(title, priority = "medium") {
    return {
        id: generateId(),
        title: title,
        priority: priority,
        status: "active",
        createdAt: Date.now()
    };

}

// retrieve tasks
function getTasks() {
    return (Store.get('tasks') || []);
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
    tasks = tasks.filter(task => task.id !== id);
    saveTask(tasks);
}

// toggle task state
function toggletask(id) {
    let tasks = getTasks();

    let myTask = tasks.find(task => task.id === id);

    if (myTask.status === "active") {
        myTask.status = "completed";
    } else {
        myTask.status = "active";
    }

    saveTask(tasks);
}

function renderTasks(filterType = "all") {
    let container  = document.getElementById("task-list");
    container.innerHTML = "";

    let tasks = getTasks();

    if (filterType === "active") {
        tasks = tasks.filter(task => task.status === "active");
    } else if (filterType === "completed") {
        tasks = tasks.filter(task => task.status === "completed");
    }

    tasks.forEach(task => {
        let div = document.createElement("div");
        div.className = "task-item";

        if(task.status === "completed") {
            div.classList.add("task-item--completed")
        }

        div.dataset.id = task.id;
        div.innerHTML = `
              <label class="task-item__checkbox">
                <input type="checkbox" ${task.status === "completed" ? "checked" : ""} />
                <span class="task-item__checkmark"></span>
              </label>
              <div class="task-item__content">
                <span class="task-item__title">${task.title}</span>
                <span class="task-item__meta">${timeElapsed(task.createdAt)}</span>
              </div>
              <span class="badge badge--${task.priority}">${task.priority}</span>
              <div class="task-item__actions">
                <button class="btn btn--ghost btn--icon btn--sm btn--danger" aria-label="Delete task">
                  ❌ <!-- Using an emoji for now to keep it simple! -->
                </button>
              </div>
           `

        container.appendChild(div);
    });

    updateTaskStatus();
    renderDashboardTasks();

}

function updateTaskStatus() {
    let tasks = getTasks();

    let total = tasks.length;

    let activeCount = tasks.filter(task => task.status === "active").length;
    let completedCount = tasks.filter(task => task.status === "completed").length;

    document.getElementById("stat-total-val").textContent = total;
    document.getElementById("stat-active-val").textContent = activeCount;
    document.getElementById("stat-completed-val").textContent = completedCount;
}

document.getElementById("task-list").addEventListener("click", (event) => {
    let taskDiv = event.target.closest(".task-item");

    if (taskDiv == null) return;

    let id = taskDiv.dataset.id;

    if(event.target.type == "checkbox") {
        toggletask(id);
        renderTasks();
    } else if (event.target.closest(".btn--danger")) {
        deleteTask(id);
        renderTasks();
    }
});

document.getElementById("add-task-btn").addEventListener("click", () => {
    let modalTask = document.getElementById("modal-task");
    modalTask.classList.add("open");
});

// Close modal when X is clicked
document.getElementById("modal-task-close").addEventListener("click", () => {
    document.getElementById("modal-task").classList.remove("open");
});

// Close modal when Cancel is clicked 
document.getElementById("modal-task-cancel").addEventListener("click", () => {
    document.getElementById("modal-task").classList.remove("open");
});

document.getElementById("task-form").addEventListener("submit", (event) => {
    event.preventDefault();

    let title = document.getElementById("task-title-input").value;
    let priority = document.getElementById("task-priority-input").value;

    if (title.trim() === "") {
        return ;
    } 

    addTask(title,priority);

    renderTasks();

    document.getElementById("task-form").reset();

    document.getElementById("modal-task").classList.remove("open");

})

document.getElementById("task-filters").addEventListener("click", (event) => {
    if (!event.target.closest(".filter-btn")){
        return;
    }

    let filterType = event.target.dataset.filter

    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));

    event.target.classList.add("active");

    renderTasks(filterType);
})

function renderDashboardTasks() {
    let dashboardContainer = document.getElementById("dashboard-task-list");
    dashboardContainer.innerHTML = "";

    let tasks = getTasks();

    let recentTasks = tasks.slice(0,3);

    recentTasks.forEach(task=> {
        let taskItemDiv = document.createElement("div");
        taskItemDiv.classList.add("task-item");

        if(task.status === "completed"){
            taskItemDiv.classList.add("task-item--completed");
        }

        taskItemDiv.dataset.id = task.id;

        taskItemDiv.innerHTML = `
              <label class="task-item__checkbox">
                <input type="checkbox" ${task.status === "completed" ? "checked" : ""} />
                <span class="task-item__checkmark"></span>
              </label>
              <div class="task-item__content">
                <span class="task-item__title">${task.title}</span>
                <span class="task-item__meta">${timeElapsed(task.createdAt)}</span>
              </div>
              <span class="badge badge--${task.priority}">${task.priority}</span>
        `;
        
        dashboardContainer.appendChild(taskItemDiv);
    })

}

renderTasks();