"use strict";

let startTime, elapsed = 0;
let timerInterval = null;
let isRunning = false;

function startTimer(){
    if (isRunning) return;

    startTime = Date.now() - elapsed;
    isRunning = true;

    timerInterval = setInterval(updateDisplay, 100);
}

function pauseTimer(){
    clearInterval(timerInterval);
    isRunning = false;

    elapsed = Date.now() - startTime;
}

function updateDisplay() {
    elapsed = Date.now() - startTime;

    let hours   = Math.floor(elapsed / 3600000)
    let minutes = Math.floor((elapsed % 3600000) / 60000)
    let seconds = Math.floor((elapsed % 60000) / 1000)

    let hrsStr = String(hours).padStart(2, "0")
    let minStr = String(minutes).padStart(2, "0")
    let secStr = String(seconds).padStart(2, "0")
    
    document.getElementById("timer-hours").textContent = hrsStr
    document.getElementById("timer-minutes").textContent = minStr
    document.getElementById("timer-seconds").textContent = secStr

    document.getElementById("dash-timer-display").textContent = `${hrsStr}:${minStr}:${secStr}`;
}

function resetTimer() {
    clearInterval(timerInterval);
    elapsed = 0;
    isRunning = false;
    
    // Manually force the screen back to zero
    document.getElementById("timer-hours").textContent = "00";
    document.getElementById("timer-minutes").textContent = "00";
    document.getElementById("timer-seconds").textContent = "00";

    document.getElementById("dash-timer-display").textContent = "00:00:00";

}

// Wire up the DOM Buttons
const startBtn = document.getElementById("timer-start-btn");
const resetBtn = document.getElementById("timer-reset-btn");

startBtn.addEventListener("click", () => {
    // If it's running, pause it. If it's paused, start it!
    if (isRunning) {
        pauseTimer();
        // Update the SVG icon to show a "Play" button
        startBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>';
    } else {
        startTimer();
        // Update the SVG icon to show a "Pause" button
        startBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    }
    
    // Only let the user click Reset if there is actually time on the clock!
    resetBtn.disabled = false;
});

resetBtn.addEventListener("click", () => {
    resetTimer();
    // Put the Play icon back
    startBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>';
    resetBtn.disabled = true;
    
    // Reset Dashboard UI
    document.getElementById("dash-timer-start").innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg> Start';
    document.getElementById("dash-timer-status").textContent = "Idle";
    document.getElementById("dash-timer-status").className = "badge badge--idle";
});

// Sync Dashboard Button
const dashStartBtn = document.getElementById("dash-timer-start");
const dashStatusBadge = document.getElementById("dash-timer-status");

dashStartBtn.addEventListener("click", () => {
    startBtn.click();
    
    if (isRunning) {
        dashStartBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause';
        dashStatusBadge.textContent = "Running";
        dashStatusBadge.className = "badge badge--running";
    } else {
        dashStartBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg> Start';
        dashStatusBadge.textContent = "Paused";
        dashStatusBadge.className = "badge badge--warning";
    }
});
