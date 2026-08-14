"use strict";

export function renderMarkdown(text) {

    if (!text) {
        return "";
    }

    if (typeof marked !== "undefined" && typeof marked.parse === "function") {
        return marked.parse(text, {
            breaks: true,
            gfm: true
        });
    }

    // Safe fallback if the Markdown CDN has not loaded.
    const escaped = String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    return escaped.replace(/\n/g, "<br>");
}
