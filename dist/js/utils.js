"use strict";

// generate a new random uuid
const generateId = () => crypto.randomUUID();

// currency converter
const convertCurrency = (amount, conversionRate = 3.75) =>
    amount / conversionRate;

// currency formatter
const formatCurrency = (amount, currency = "USD") =>
    amount.toLocaleString('en-US', { style: 'currency', currency });

// greet user based on time of day (local time)
function getGreeting() {
    let hours = new Date().getHours();

    if (hours >= 5 && hours <= 11) {
        return "Good Morning";
    } else if (hours >= 12 && hours <= 17) {
        return "Good Afternoon";
    } else {
        return "Good Evening";
    }
}

// get current timestap
function timeElapsed(timestamp) {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "recently";

    let seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) {
        return "just now";
    } else if (seconds < 3600) {
        return `${Math.floor(seconds / 60)}m ago`;
    } else if (seconds < 86400) {
        return `${Math.floor(seconds / 3600)}h ago`;
    } else {
        return `${Math.floor(seconds / 86400)}d ago`;
    }
}

/**
 * Aether Intelligence: Insight Engine
 * Generates a human-friendly productivity insight based on raw data.
 */
function generateAetherInsight(tasks = [], sessions = [], habits = null) {
    const insights = [
      "Your deep work rhythm is stabilizing. Keep the focus high.",
      "You've completed more tasks this week than last. Great momentum!",
      "Consistency is key. Your habit streaks are looking healthy.",
      "Most of your focused work happens early. Leverage your morning energy.",
      "Don't forget to take short breaks to maintain long-term stamina.",
      "Portfolio volatility is low today. A good time for deep work.",
      "Aether is synced. Your productivity cloud is 100% resilient."
    ];

    // Data-driven logic
    const activeTasks = tasks.filter(t => !t.completed).length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const sessionCount = sessions.length;

    if (activeTasks > 5) {
        return "You have a high volume of active tasks. Consider a 'Deep Work' sprint to clear the deck.";
    }

    if (completedTasks > 10 && sessionCount < 3) {
        return "High task velocity detected, but low focus sessions. Try a Pomodoro to deepen your concentration.";
    }

    if (habits && habits.log) {
        const today = new Date().toISOString().split('T')[0];
        const todayRituals = Object.values(habits.log[today] || {}).filter(Boolean).length;
        if (todayRituals >= 3) {
            return "Daily rituals complete! You're in a high-performance 'Flow State' today.";
        }
    }

    // Default to a random baseline insight if no data triggers met
    return insights[Math.floor(Math.random() * insights.length)];
}
