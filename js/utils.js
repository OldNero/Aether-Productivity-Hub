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

    let seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) {
        return "just now";
    } else if (seconds < 3600) {
        return `${Math.floor(seconds / 60)} minutes ago`;
    } else if (seconds < 86400) {
        return `${Math.floor(seconds / 3600)} hours ago`;
    } else {
        return `${Math.floor(seconds / 86400)} days ago`;
    }

}
