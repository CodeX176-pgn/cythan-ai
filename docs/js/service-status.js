"use strict";

import { API_STATUS_URL } from "./config.js";
import { refreshIcons } from "./icons.js";

let statusBanner = null;
let statusDot = null;
let countdownTimer = null;
let pollingTimer = null;
let temporaryTimer = null;
let lastKnownStatus = "available";

const POLL_INTERVAL = 30000;

// Connection quality thresholds for the status indicator.
// A successful request is never considered an error; slower responses
// are shown as yellow so users know the connection is usable but poor.
const GOOD_LATENCY_MS = 1200;
const STATUS_TIMEOUT_MS = 8000;

/* ================================================================
   STATUS UI
================================================================ */

function ensureStatusUI() {
    if (statusBanner && statusDot) {
        return;
    }

    statusDot = document.querySelector(".status-dot");

    const topbar = document.querySelector(".topbar");
    if (!topbar) {
        return;
    }

    statusBanner = document.createElement("div");
    statusBanner.className = "service-status-banner";
    statusBanner.setAttribute("role", "status");
    statusBanner.setAttribute("aria-live", "polite");
    statusBanner.hidden = true;

    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", "triangle-alert");
    icon.className = "service-status-icon";

    const text = document.createElement("span");
    text.className = "service-status-text";

    const countdown = document.createElement("span");
    countdown.className = "service-status-countdown";

    statusBanner.append(icon, text, countdown);

    topbar.insertAdjacentElement("afterend", statusBanner);

    refreshIcons();
}

function setDotState(state) {
    ensureStatusUI();

    if (!statusDot) {
        return;
    }

    statusDot.classList.remove(
        "status-dot-available",
        "status-dot-unavailable",
        "status-dot-error"
    );

    if (state === "available") {
        statusDot.classList.add("status-dot-available");
        statusDot.title = "No error — good internet connection";
        statusDot.setAttribute("aria-label", "Good internet connection");
        return;
    }

    if (state === "cooldown" || state === "poor") {
        statusDot.classList.add("status-dot-unavailable");
        statusDot.title = state === "poor"
            ? "Poor internet connection"
            : "AI service temporarily unavailable";
        statusDot.setAttribute(
            "aria-label",
            state === "poor"
                ? "Poor internet connection"
                : "AI service temporarily unavailable"
        );
        return;
    }

    statusDot.classList.add("status-dot-error");
    statusDot.title = "Connection error or no internet connection";
    statusDot.setAttribute(
        "aria-label",
        "Connection error or no internet connection"
    );
}

function hideBanner() {
    if (!statusBanner) {
        return;
    }

    statusBanner.hidden = true;
    statusBanner.classList.remove(
        "service-status-warning",
        "service-status-error"
    );

    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
}

function showBanner(message, type = "warning", retryAfter = 0) {
    ensureStatusUI();

    if (!statusBanner) {
        return;
    }

    statusBanner.hidden = false;
    statusBanner.classList.toggle(
        "service-status-warning",
        type === "warning"
    );
    statusBanner.classList.toggle(
        "service-status-error",
        type === "error"
    );

    const icon = statusBanner.querySelector(".service-status-icon");
    if (icon) {
        icon.setAttribute(
            "data-lucide",
            type === "error" ? "circle-alert" : "triangle-alert"
        );
    }

    const text = statusBanner.querySelector(".service-status-text");
    const countdown = statusBanner.querySelector(".service-status-countdown");

    if (text) {
        text.textContent = message;
    }

    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }

    let remaining = Math.max(0, Number(retryAfter) || 0);

    const updateCountdown = () => {
        if (!countdown) {
            return;
        }

        if (remaining <= 0) {
            countdown.textContent = "";
            return;
        }

        countdown.textContent =
            ` Estimated return: ${formatDuration(remaining)}.`;

        remaining -= 1;
    };

    updateCountdown();

    if (remaining > 0) {
        countdownTimer = setInterval(updateCountdown, 1000);
    }

    refreshIcons();
}

function formatDuration(seconds) {
    const total = Math.max(0, Math.ceil(seconds));

    if (total < 60) {
        return `${total}s`;
    }

    const minutes = Math.floor(total / 60);
    const secondsPart = total % 60;

    if (minutes < 60) {
        return secondsPart
            ? `${minutes}m ${secondsPart}s`
            : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const minutesPart = minutes % 60;

    return minutesPart
        ? `${hours}h ${minutesPart}m`
        : `${hours}h`;
}

/* ================================================================
   PUBLIC STATUS API
================================================================ */

export function showRequestRateLimited(retryAfter = 0, message) {
    // The AI service itself may still be healthy; only this client has
    // temporarily exceeded the backend request limit. Keep the status
    // dot green and show a warning banner instead.
    ensureStatusUI();

    if (!statusBanner) {
        return;
    }

    statusBanner.hidden = false;
    statusBanner.classList.add("service-status-warning");
    statusBanner.classList.remove("service-status-error");

    const icon = statusBanner.querySelector(".service-status-icon");
    if (icon) {
        icon.setAttribute("data-lucide", "clock-3");
    }

    const text = statusBanner.querySelector(".service-status-text");
    if (text) {
        text.textContent =
            message ||
            "Too many requests were sent. Please wait a moment before trying again.";
    }

    const countdown = statusBanner.querySelector(".service-status-countdown");

    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }

    let remaining = Math.max(0, Number(retryAfter) || 0);

    const updateCountdown = () => {
        if (!countdown) {
            return;
        }

        countdown.textContent = remaining > 0
            ? ` Try again in ${formatDuration(remaining)}.`
            : "";

        if (remaining > 0) {
            remaining -= 1;
        } else if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
    };

    updateCountdown();

    if (remaining > 0) {
        countdownTimer = setInterval(updateCountdown, 1000);
    }

    setDotState("available");
    lastKnownStatus = "available";
    refreshIcons();
}

export function showQuotaUnavailable(retryAfter = 0, message) {
    lastKnownStatus = "cooldown";
    setDotState("cooldown");

    showBanner(
        message ||
            "CyThan AI is temporarily unavailable because the AI service has reached its current usage limit.",
        "warning",
        retryAfter
    );
}

export function showConnectionUnavailable(message) {
    lastKnownStatus = "error";
    setDotState("error");

    showBanner(
        message ||
            "CyThan AI is temporarily unable to reach the AI service. Please try again shortly.",
        "error"
    );

    if (temporaryTimer) {
        clearTimeout(temporaryTimer);
    }

    temporaryTimer = setTimeout(() => {
        checkServiceStatus();
    }, 15000);
}

export function markServiceAvailable() {
    lastKnownStatus = "available";
    setDotState("available");
    hideBanner();
}

export async function checkServiceStatus() {
    try {
        const startedAt = performance.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(
            () => controller.abort(),
            STATUS_TIMEOUT_MS
        );

        let response;

        try {
            response = await fetch(
                API_STATUS_URL,
                {
                    method: "GET",
                    cache: "no-store",
                    signal: controller.signal
                }
            );
        } finally {
            clearTimeout(timeoutId);
        }

        const latency = performance.now() - startedAt;

        if (!response.ok) {
            throw new Error(`Status endpoint returned ${response.status}`);
        }

        const data = await response.json();

        if (data.available) {
            if (latency > GOOD_LATENCY_MS) {
                lastKnownStatus = "poor";
                setDotState("poor");
                hideBanner();
            } else {
                markServiceAvailable();
            }

            return { ...data, latency_ms: Math.round(latency) };
        }

        lastKnownStatus = "cooldown";
        setDotState("cooldown");

        showBanner(
            data.message ||
                "CyThan AI is temporarily unavailable.",
            "warning",
            Number(data.cooldown_remaining) || 0
        );

        return data;
    } catch (error) {
        console.warn(
            "CyThan service status check failed:",
            error
        );

        // Don't make a temporary status-endpoint failure look like
        // a confirmed Gemini quota outage.
        setDotState("error");
        return null;
    }
}

export function setupServiceStatus() {
    ensureStatusUI();

    checkServiceStatus();

    if (pollingTimer) {
        clearInterval(pollingTimer);
    }

    pollingTimer = setInterval(
        checkServiceStatus,
        POLL_INTERVAL
    );
}

export function getLastKnownServiceStatus() {
    return lastKnownStatus;
}
