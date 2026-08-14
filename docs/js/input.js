"use strict";

import { appState } from "./state.js";

import {
    messageInput,
    sendButton
} from "./dom.js";

import { settings } from "./settings.js";

/* ================================================================
   INPUT STATE
================================================================ */

export function setInputState(disabled) {

    if (messageInput) {

        messageInput.disabled =
            disabled;

        messageInput.placeholder =
            disabled
                ? "CyThan is thinking..."
                : "Message CyThan AI...";

    }


    if (sendButton) {

        sendButton.disabled =
            disabled;

    }

}


/* ================================================================
   SEND BUTTON
================================================================ */

export function updateSendButton() {

    if (!sendButton || !messageInput) {
        return;
    }


    if (appState.isGenerating) {

        sendButton.disabled =
            true;

        return;

    }


    sendButton.disabled =
        !messageInput.value.trim();

}


/* ================================================================
   TEXTAREA RESIZING
================================================================ */

export function autoResizeTextarea() {

    if (!messageInput) {
        return;
    }


    messageInput.style.height =
        "auto";


    const maxHeight = 180;


    const newHeight =
        Math.min(
            messageInput.scrollHeight,
            maxHeight
        );


    messageInput.style.height =
        `${newHeight}px`;


    messageInput.style.overflowY =
        messageInput.scrollHeight > maxHeight
            ? "auto"
            : "hidden";

}


/* ================================================================
   INPUT EVENTS
================================================================ */

export function setupInput(
    handleSubmit
) {

    if (!messageInput) {
        return;
    }


    messageInput.addEventListener(
        "input",
        () => {

            autoResizeTextarea();

            updateSendButton();

        }
    );


    messageInput.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                if (!settings.enterToSend) {
                    return;
                }

                event.preventDefault();

                handleSubmit();

            }

        }
    );


    if (sendButton) {

        sendButton.addEventListener(
            "click",
            handleSubmit
        );

    }


    autoResizeTextarea();

    updateSendButton();

}

/* ================================================================
   COMPOSER MODE
================================================================ */

let composerMode = "chat";


export function getComposerMode() {

    return composerMode;

}


export function setComposerMode(mode) {

    if (
        mode !== "chat"
    ) {
        return;
    }

    composerMode = mode;

}
