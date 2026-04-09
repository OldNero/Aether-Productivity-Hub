"use strict";

document.addEventListener("DOMContentLoaded", () => {
    console.log("Page fully loaded.");

    load();

    document.getElementById("greeting-text").textContent = getGreeting();
});

// calls save fn to save settings
const saveBtn = document.getElementById("save-settings-btn");
saveBtn.addEventListener("click", () => {
    save();
    saveBtn.textContent = "Saved ✓";

    setTimeout(() => saveBtn.textContent = "Save Settings", 1500)
});

// list all sidebar links
const currentSection = document.querySelectorAll(".sidebar__link");

// remove active instances from all buttons
currentSection.forEach(button => {
    button.addEventListener("click", () => {
        currentSection.forEach(btn => btn.classList.remove("active"));
        document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));

        button.classList.add("active");

        const viewName = button.dataset.view;
        document.getElementById("view-" + viewName).classList.add("active");

    })
});

// listen for ctrl+k and focus on the search bar
document.addEventListener("keydown", (e) => {

    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();

        console.log("search...");
    }

    if (e.key === 'Escape') {
        document.getElementById("modal-overlay").classList.remove("active");
    }
});

document.getElementById("dash-view-all-tasks").addEventListener("click", () => {
   // Find the actual sidebar button for tasks, and programmatically click it!
   document.querySelector('.sidebar__link[data-view="tasks"]').click();
});
