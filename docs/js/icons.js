"use strict";

/**
 * CyThan AI icon helpers.
 * Lucide itself is loaded globally from index.html.
 */

export function createIcon(name, className = "") {
    const icon = document.createElement("i");

    icon.dataset.lucide = name;
    icon.setAttribute("aria-hidden", "true");

    if (className) {
        icon.className = className;
    }

    return icon;
}

export function refreshIcons() {
    if (
        typeof window.lucide === "undefined"
    ) {

        console.warn(
            "Lucide Icons has not loaded yet."
        );

        return;

    }


    window.lucide.createIcons();
}
