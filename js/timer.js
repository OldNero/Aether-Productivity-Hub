/* eslint-disable no-undef */
'use strict';

let startTime,
  elapsed = 0;
let timerInterval = null;
let isRunning = false;

function startTimer() {
  if (isRunning) return;

  startTime = Date.now() - elapsed;
  isRunning = true;

  timerInterval = setInterval(updateDisplay, 100);
}

function pauseTimer() {
  clearInterval(timerInterval);
  isRunning = false;

  elapsed = Date.now() - startTime;
}

function updateDisplay() {
  elapsed = Date.now() - startTime;

  let hours = Math.floor(elapsed / 3600000);
  let minutes = Math.floor((elapsed % 3600000) / 60000);
  let seconds = Math.floor((elapsed % 60000) / 1000);

  let hrsStr = String(hours).padStart(2, '0');
  let minStr = String(minutes).padStart(2, '0');
  let secStr = String(seconds).padStart(2, '0');

  document.getElementById('timer-hours').textContent = hrsStr;
  document.getElementById('timer-minutes').textContent = minStr;
  document.getElementById('timer-seconds').textContent = secStr;

  document.getElementById(
    'dash-timer-display'
  ).textContent = `${hrsStr}:${minStr}:${secStr}`;

  // --- SVG Ring Animation Math ---

  // 1. Calculate the progression percentage
  // (Let's make 1 full rotation equal to 1 hour, which is 3,600,000 milliseconds)
  let progressFraction = (elapsed % 3600000) / 3600000;

  // 2. Main Timer Ring Math (Radius is 105)
  let mainRadius = 105;
  let mainCircumference = 2 * Math.PI * mainRadius;
  let mainOffset = mainCircumference * (1 - progressFraction);

  // Grab the HTML element and apply the CSS SVG values
  let mainRing = document.getElementById('timer-progress-ring');
  mainRing.style.strokeDasharray = mainCircumference;
  mainRing.style.strokeDashoffset = mainOffset;

  // 3. Mini Dashboard Ring Math (Radius is 52)
  let miniRadius = 52;
  let miniCircumference = 2 * Math.PI * miniRadius;
  let miniOffset = miniCircumference * (1 - progressFraction);

  let dashRing = document.getElementById('dash-timer-ring');
  if (dashRing) {
    dashRing.style.strokeDasharray = miniCircumference;
    dashRing.style.strokeDashoffset = miniOffset;
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  saveSession();
  renderSessions();
  elapsed = 0;
  isRunning = false;

  // Manually force the screen back to zero
  document.getElementById('timer-hours').textContent = '00';
  document.getElementById('timer-minutes').textContent = '00';
  document.getElementById('timer-seconds').textContent = '00';

  document.getElementById('dash-timer-display').textContent = '00:00:00';

  // Reset the SVG Rings to full empty
  let mainCircumference = 2 * Math.PI * 105;
  document.getElementById('timer-progress-ring').style.strokeDashoffset =
    mainCircumference;

  let miniCircumference = 2 * Math.PI * 52;
  document.getElementById('dash-timer-ring').style.strokeDashoffset =
    miniCircumference;
}

// Wire up the DOM Buttons
let startBtn = document.getElementById('timer-start-btn');
let resetBtn = document.getElementById('timer-reset-btn');
let lapBtn = document.getElementById('timer-lap-btn');

startBtn.addEventListener('click', () => {
  // If it's running, pause it. If it's paused, start it!
  if (isRunning) {
    pauseTimer();
    // Update the SVG icon to show a "Play" button
    startBtn.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>';
  } else {
    startTimer();
    // Update the SVG icon to show a "Pause" button
    startBtn.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  }

  // Only let the user click Reset if there is actually time on the clock!
  resetBtn.disabled = false;
});

lapBtn.addEventListener("click", () => {
  if (elapsed === 0) return;

  let sessions = getSessions();

  let newSession = {
    duration: elapsed,
    timestamp: Date.now(),
  };

  Store.set('sessions', [...sessions, newSession]);

  renderSessions();
});

resetBtn.addEventListener('click', () => {
  resetTimer();
  // Put the Play icon back
  startBtn.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>';
  resetBtn.disabled = true;

  // Reset Dashboard UI
  document.getElementById('dash-timer-start').innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg> Start';
  document.getElementById('dash-timer-status').textContent = 'Idle';
  document.getElementById('dash-timer-status').className = 'badge badge--idle';
});

// Sync Dashboard Button
const dashStartBtn = document.getElementById('dash-timer-start');
const dashStatusBadge = document.getElementById('dash-timer-status');

dashStartBtn.addEventListener('click', () => {
  startBtn.click();

  if (isRunning) {
    dashStartBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause';
    dashStatusBadge.textContent = 'Running';
    dashStatusBadge.className = 'badge badge--running';
  } else {
    dashStartBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg> Start';
    dashStatusBadge.textContent = 'Paused';
    dashStatusBadge.className = 'badge badge--warning';
  }
});

function getSessions() {
  return Store.get('sessions') || [];
}

function saveSession() {
  if (elapsed === 0) {
    return;
  }

  let sessions = getSessions();

  let newSession = {
    duration: elapsed,
    timestamp: Date.now(),
  };

  Store.set('sessions', [...sessions, newSession]);
}

function renderSessions() {
  let sessionListDiv = document.getElementById('session-list');
  sessionListDiv.innerHTML = '';

  let sessions = getSessions();

  for (let i = sessions.length - 1; i >= 0; i--) {
    // 1. Calculate our 3 units of time from the saved raw millisecond duration
    let hours = Math.floor(sessions[i].duration / 3600000);
    let minutes = Math.floor((sessions[i].duration % 3600000) / 60000);
    let seconds = Math.floor((sessions[i].duration % 60000) / 1000);
    // 2. Turn them into nicely formatted "01:05:08" Strings
    let hrsStr = String(hours).padStart(2, '0');
    let minStr = String(minutes).padStart(2, '0');
    let secStr = String(seconds).padStart(2, '0');
    // 3. Build the DOM element (Notice how we use `i + 1` to get the real Session Number!)
    let div = document.createElement('div');
    div.className = 'session-item';

    // Inject all of our data into the HTML template
    div.innerHTML = `
      <div class="session-item__info">
        <span class="session-item__label">Session #${i + 1}</span>
        <span class="session-item__date">${timeElapsed(
          sessions[i].timestamp
        )}</span>
      </div>
      <span class="session-item__duration">${hrsStr}:${minStr}:${secStr}</span>
    `;
    sessionListDiv.appendChild(div);
  }
}

function clearSessions() {
  if (confirm('Are you sure you want to clear all history?')) {
    Store.set('sessions', []);

    renderSessions();
  }
}

document
  .getElementById('clear-sessions-btn')
  .addEventListener('click', clearSessions);
