"use strict";

document.addEventListener("DOMContentLoaded", () => {
    console.log("Page fully loaded.");

    load();

    document.getElementById("greeting-text").textContent = getGreeting();
});

const saveBtn = document.getElementById("save-settings-btn");
saveBtn.addEventListener("click", () => {
    save();
    saveBtn.textContent = "Saved ✓";

    setTimeout(() => saveBtn.textContent = "Save Settings", 1500)
})

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