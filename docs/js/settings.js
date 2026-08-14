"use strict";

import {
    appState,
    clearAllChats,
    saveCurrentChat
} from "./state.js";

import {
    createIcon,
    refreshIcons
} from "./icons.js";


/* ================================================================
   STORAGE
================================================================ */

const SETTINGS_KEY = "cythan_ai_settings";


/* ================================================================
   DEFAULT SETTINGS
================================================================ */

export const defaultSettings = {

    theme: "dark",

    accentColor: "cyan",

    enterToSend: true,

    showTimestamps: false

};


/* ================================================================
   APPLICATION SETTINGS
================================================================ */

export const settings = {
    ...defaultSettings
};

function notifySettingsUpdated() {
    window.dispatchEvent(
        new CustomEvent("cythan:settings-updated")
    );
}


/* ================================================================
   LOAD SETTINGS
================================================================ */

export function loadSettings() {

    try {

        const stored =
            localStorage.getItem(
                SETTINGS_KEY
            );

        if (!stored) {
            return;
        }

        const parsed =
            JSON.parse(stored);

        if (
            !parsed ||
            typeof parsed !== "object"
        ) {
            return;
        }


        if (
            ["dark", "light", "system"]
                .includes(parsed.theme)
        ) {

            settings.theme =
                parsed.theme;

        }


        if (
            [
                "cyan",
                "purple",
                "blue",
                "green",
                "orange"
            ].includes(
                parsed.accentColor
            )
        ) {

            settings.accentColor =
                parsed.accentColor;

        }


        if (
            typeof parsed.enterToSend ===
            "boolean"
        ) {

            settings.enterToSend =
                parsed.enterToSend;

        }


        if (
            typeof parsed.showTimestamps ===
            "boolean"
        ) {

            settings.showTimestamps =
                parsed.showTimestamps;

        }

    } catch (error) {

        console.error(
            "Failed to load settings:",
            error
        );

    }

}


/* ================================================================
   SAVE SETTINGS
================================================================ */

export function saveSettings() {

    try {

        localStorage.setItem(
            SETTINGS_KEY,
            JSON.stringify(settings)
        );

    } catch (error) {

        console.error(
            "Failed to save settings:",
            error
        );

    }

}


/* ================================================================
   APPLY THEME
================================================================ */

export function applyTheme() {

    const root =
        document.documentElement;


    let theme =
        settings.theme;


    if (theme === "system") {

        theme =
            window.matchMedia(
                "(prefers-color-scheme: light)"
            ).matches
                ? "light"
                : "dark";

    }


    root.dataset.theme =
        theme;

}


/* ================================================================
   APPLY ACCENT COLOR
================================================================ */

export function applyAccentColor() {

    const root =
        document.documentElement;


    const colors = {

        cyan: "#00d9ff",

        purple: "#a970ff",

        blue: "#5c7cff",

        green: "#42d392",

        orange: "#ff9f43"

    };


    const accent =
        colors[
            settings.accentColor
        ] || colors.cyan;


    root.style.setProperty(
        "--accent",
        accent
    );


    /*
     * Generate a darker version for
     * elements using --accent-dark.
     */

    const accentDark = {

        cyan: "#009dbb",

        purple: "#7547c7",

        blue: "#405bc7",

        green: "#249b6b",

        orange: "#c96d18"

    };


    root.style.setProperty(
        "--accent-dark",
        accentDark[
            settings.accentColor
        ] || accentDark.cyan
    );

}


/* ================================================================
   APPLY ALL SETTINGS
================================================================ */

export function applySettings() {

    applyTheme();

    applyAccentColor();

}


/* ================================================================
   SET THEME
================================================================ */

export function setTheme(theme) {

    if (
        ![
            "dark",
            "light",
            "system"
        ].includes(theme)
    ) {

        return;

    }


    settings.theme =
        theme;


    saveSettings();

    applyTheme();

    renderSettings();
    notifySettingsUpdated();

}


/* ================================================================
   SET ACCENT COLOR
================================================================ */

export function setAccentColor(color) {

    if (
        ![
            "cyan",
            "purple",
            "blue",
            "green",
            "orange"
        ].includes(color)
    ) {

        return;

    }


    settings.accentColor =
        color;


    saveSettings();

    applyAccentColor();

    renderSettings();
    notifySettingsUpdated();

}


/* ================================================================
   SET ENTER TO SEND
================================================================ */

export function setEnterToSend(enabled) {

    settings.enterToSend =
        Boolean(enabled);


    saveSettings();

    renderSettings();
    notifySettingsUpdated();

}


/* ================================================================
   SET TIMESTAMPS
================================================================ */

export function setShowTimestamps(enabled) {

    settings.showTimestamps =
        Boolean(enabled);


    saveSettings();

    renderSettings();
    notifySettingsUpdated();

}


/* ================================================================
   RESET SETTINGS
================================================================ */

export function resetSettings() {

    Object.assign(
        settings,
        defaultSettings
    );


    saveSettings();

    applySettings();

    renderSettings();
    notifySettingsUpdated();

}


/* ================================================================
   SETTINGS MODAL
================================================================ */

let settingsModal = null;


/* ================================================================
   OPEN SETTINGS
================================================================ */

export function openSettings() {

    window.dispatchEvent(
        new CustomEvent("cythan:close-sidebar")
    );

    if (settingsModal) {

        settingsModal.remove();

    }


    settingsModal =
        createSettingsModal();


    document.body.appendChild(
        settingsModal
    );


    requestAnimationFrame(() => {

        settingsModal.classList.add(
            "visible"
        );

    });

}


/* ================================================================
   CLOSE SETTINGS
================================================================ */

export function closeSettings() {

    if (!settingsModal) {
        return;
    }


    settingsModal.classList.remove(
        "visible"
    );


    setTimeout(() => {

        if (settingsModal) {

            settingsModal.remove();

            settingsModal = null;

        }

    }, 180);

}


/* ================================================================
   CREATE MODAL
================================================================ */

function createSettingsModal() {

    const overlay =
        document.createElement("div");


    overlay.className =
        "settings-overlay";


    overlay.addEventListener(
        "click",
        (event) => {

            if (
                event.target === overlay
            ) {

                closeSettings();

            }

        }
    );


    const modal =
        document.createElement("section");


    modal.className =
        "settings-modal";


    modal.setAttribute(
        "role",
        "dialog"
    );


    modal.setAttribute(
        "aria-modal",
        "true"
    );


    modal.setAttribute(
        "aria-label",
        "Settings"
    );


    /* ============================================================
       HEADER
    ============================================================ */

    const header =
        document.createElement("header");


    header.className =
        "settings-header";


    const title =
        document.createElement("h2");


    title.textContent =
        "Settings";


    const closeButton =
        document.createElement("button");


    closeButton.type =
        "button";

    closeButton.className =
        "settings-close";


    closeButton.appendChild(
        createIcon("x")
    );


    closeButton.setAttribute(
        "aria-label",
        "Close settings"
    );


    closeButton.addEventListener(
        "click",
        closeSettings
    );


    header.appendChild(title);

    header.appendChild(closeButton);

    modal.appendChild(header);


    /* ============================================================
       CONTENT
    ============================================================ */

    const content =
        document.createElement("div");


    content.className =
        "settings-content";


    /* Appearance */

    content.appendChild(
        createSectionTitle(
            "Appearance"
        )
    );


    content.appendChild(
        createThemeControl()
    );


    content.appendChild(
        createAccentControl()
    );


    /* Chat */

    content.appendChild(
        createSectionTitle(
            "Chat"
        )
    );


    content.appendChild(
        createToggleControl(
            "Enter to send",
            "Press Enter to send messages",
            settings.enterToSend,
            setEnterToSend
        )
    );


    content.appendChild(
        createToggleControl(
            "Show timestamps",
            "Display message times",
            settings.showTimestamps,
            setShowTimestamps
        )
    );


    /* Data */

    content.appendChild(
        createSectionTitle(
            "Data"
        )
    );


    content.appendChild(
        createClearHistoryControl()
    );


    content.appendChild(
        createResetSettingsControl()
    );


    /* About */

    content.appendChild(
        createSectionTitle(
            "About"
        )
    );


    content.appendChild(
        createAboutControl()
    );


    modal.appendChild(content);


    /* ============================================================
       FOOTER
    ============================================================ */

    const footer =
        document.createElement("footer");


    footer.className =
        "settings-footer";


    footer.textContent =
        "CyThan AI • Summer Project";


    modal.appendChild(footer);


    overlay.appendChild(modal);


    requestAnimationFrame(() => {
        refreshIcons();
    });


    return overlay;

}


/* ================================================================
   SECTION TITLE
================================================================ */

function createSectionTitle(text) {

    const heading =
        document.createElement("h3");


    heading.className =
        "settings-section-title";


    heading.textContent =
        text;


    return heading;

}


/* ================================================================
   THEME CONTROL
================================================================ */

function createThemeControl() {

    const row =
        document.createElement("div");


    row.className =
        "settings-row";


    const info =
        createInfoBlock(
            "Theme",
            "Choose how CyThan AI looks"
        );


    const select =
        document.createElement("select");


    select.className =
        "settings-select";


    [
        ["dark", "Dark"],
        ["light", "Light"],
        ["system", "System"]
    ].forEach(
        ([value, label]) => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                value;

            option.textContent =
                label;

            select.appendChild(
                option
            );

        }
    );


    select.value =
        settings.theme;


    select.addEventListener(
        "change",
        () => {

            setTheme(
                select.value
            );

        }
    );


    row.appendChild(info);

    row.appendChild(select);


    return row;

}


/* ================================================================
   ACCENT COLOR CONTROL
================================================================ */

function createAccentControl() {

    const row =
        document.createElement("div");


    row.className =
        "settings-row";


    const info =
        createInfoBlock(
            "Accent color",
            "Choose CyThan AI's highlight color"
        );


    const select =
        document.createElement("select");


    select.className =
        "settings-select";


    [
        ["cyan", "Cyan"],
        ["purple", "Purple"],
        ["blue", "Blue"],
        ["green", "Green"],
        ["orange", "Orange"]
    ].forEach(
        ([value, label]) => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                value;

            option.textContent =
                label;

            select.appendChild(
                option
            );

        }
    );


    select.value =
        settings.accentColor;


    select.addEventListener(
        "change",
        () => {

            setAccentColor(
                select.value
            );

        }
    );


    row.appendChild(info);

    row.appendChild(select);


    return row;

}


/* ================================================================
   TOGGLE CONTROL
================================================================ */

function createToggleControl(
    titleText,
    descriptionText,
    value,
    onChange
) {

    const row =
        document.createElement("div");


    row.className =
        "settings-row";


    const info =
        createInfoBlock(
            titleText,
            descriptionText
        );


    const label =
        document.createElement("label");


    label.className =
        "settings-switch";


    const checkbox =
        document.createElement("input");


    checkbox.type =
        "checkbox";


    checkbox.checked =
        value;


    const slider =
        document.createElement("span");


    slider.className =
        "settings-slider";


    checkbox.addEventListener(
        "change",
        () => {

            onChange(
                checkbox.checked
            );

        }
    );


    label.appendChild(checkbox);

    label.appendChild(slider);


    row.appendChild(info);

    row.appendChild(label);


    return row;

}


/* ================================================================
   INFO BLOCK
================================================================ */

function createInfoBlock(
    titleText,
    descriptionText
) {

    const info =
        document.createElement("div");


    info.className =
        "settings-row-info";


    const title =
        document.createElement("strong");


    title.textContent =
        titleText;


    const description =
        document.createElement("span");


    description.textContent =
        descriptionText;


    info.appendChild(title);

    info.appendChild(description);


    return info;

}


/* ================================================================
   CLEAR HISTORY
================================================================ */

function createClearHistoryControl() {

    const row =
        document.createElement("div");


    row.className =
        "settings-row danger-row";


    const info =
        createInfoBlock(
            "Clear all conversations",
            "Delete all saved chats from this browser"
        );


    const button =
        document.createElement("button");


    button.type =
        "button";

    button.className =
        "settings-danger-button";


    button.appendChild(
        createIcon("trash-2")
    );

    button.append("Clear");


    button.addEventListener(
        "click",
        () => {

            if (
                appState.isGenerating
            ) {

                return;

            }


            const confirmed =
                window.confirm(
                    "Delete all conversations? This cannot be undone."
                );


            if (!confirmed) {
                return;
            }


            saveCurrentChat();

            clearAllChats();


            window.dispatchEvent(
                new CustomEvent(
                    "cythan:history-updated"
                )
            );


            closeSettings();

        }
    );


    row.appendChild(info);

    row.appendChild(button);


    return row;

}


/* ================================================================
   RESET SETTINGS
================================================================ */

function createResetSettingsControl() {

    const row =
        document.createElement("div");


    row.className =
        "settings-row danger-row";


    const info =
        createInfoBlock(
            "Reset settings",
            "Restore all settings to their defaults"
        );


    const button =
        document.createElement("button");


    button.type =
        "button";

    button.className =
        "settings-danger-button";


    button.appendChild(
        createIcon("rotate-ccw")
    );

    button.append("Reset");


    button.addEventListener(
        "click",
        () => {

            const confirmed =
                window.confirm(
                    "Reset all CyThan AI settings?"
                );


            if (!confirmed) {
                return;
            }


            resetSettings();

        }
    );


    row.appendChild(info);

    row.appendChild(button);


    return row;

}


/* ================================================================
   ABOUT
================================================================ */

function createAboutControl() {

    const row =
        document.createElement("div");


    row.className =
        "settings-row about-row";


    const info =
        createInfoBlock(
            "About CyThan AI",
            "Learn more about CyThan AI"
        );


    const button =
        document.createElement("button");


    button.type =
        "button";

    button.className =
        "settings-secondary-button";


    button.appendChild(
        createIcon("info")
    );

    button.append("About");


    button.addEventListener(
        "click",
        () => {

            closeSettings();

            window.dispatchEvent(
                new CustomEvent(
                    "cythan:open-about"
                )
            );

        }
    );


    row.appendChild(info);

    row.appendChild(button);


    return row;

}


/* ================================================================
   RENDER SETTINGS
================================================================ */

function renderSettings() {

    if (!settingsModal) {
        return;
    }


    const selects =
        settingsModal.querySelectorAll(
            ".settings-select"
        );


    if (selects[0]) {

        selects[0].value =
            settings.theme;

    }


    if (selects[1]) {

        selects[1].value =
            settings.accentColor;

    }


    const checkboxes =
        settingsModal.querySelectorAll(
            'input[type="checkbox"]'
        );


    if (checkboxes[0]) {

        checkboxes[0].checked =
            settings.enterToSend;

    }


    if (checkboxes[1]) {

        checkboxes[1].checked =
            settings.showTimestamps;

    }


    refreshIcons();

}


/* ================================================================
   SETUP SETTINGS
================================================================ */

export function setupSettings() {

    loadSettings();

    applySettings();


    const settingsButton =
        document.getElementById(
            "settingsBtn"
        );


    if (settingsButton) {

        settingsButton.addEventListener(
            "click",
            openSettings
        );

    }


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                settingsModal
            ) {

                closeSettings();

            }

        }
    );


    const mediaQuery =
        window.matchMedia(
            "(prefers-color-scheme: light)"
        );


    mediaQuery.addEventListener(
        "change",
        () => {

            if (
                settings.theme === "system"
            ) {

                applyTheme();

            }

        }
    );

}
