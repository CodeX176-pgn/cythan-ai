"use strict";


import { settings } from "./settings.js";

import {
    appState,
    createChat,
    saveCurrentChat
} from "./state.js";


import {
    messageInput,
    messagesContainer,
    welcomeScreen,
    chatContainer
} from "./dom.js";


import {
    streamAIResponse
} from "./streaming.js";


import {
    getComposerMode,
    setInputState,
    updateSendButton
} from "./input.js";


import {
    scrollToBottom,
    getFriendlyErrorMessage
} from "./utils.js";


import {
    renderMarkdown
} from "./markdown.js";


import {
    highlightCodeBlocks,
    addCopyButtons
} from "./code.js";


import {
    createIcon,
    refreshIcons
} from "./icons.js";


/* ================================================================
   MESSAGE TIMESTAMP
================================================================ */

function createMessageTimestamp(
    timestamp
) {

    if (
        !settings.showTimestamps ||
        !Number.isFinite(timestamp)
    ) {

        return null;

    }


    const element =
        document.createElement("time");


    const date =
        new Date(timestamp);


    element.className =
        "message-timestamp";


    element.dateTime =
        date.toISOString();


    element.title =
        date.toLocaleString();


    element.textContent =
        date.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );


    return element;

}


/* ================================================================
   COPY MESSAGE
================================================================ */

async function copyMessage(
    text,
    button
) {

    if (!text) {
        return;
    }


    try {

        await navigator.clipboard.writeText(
            text
        );


        const original =
            button.dataset.originalLabel ||
            "Copy";


        button.replaceChildren(
            createIcon("check")
        );


        button.append(
            "Copied"
        );


        button.classList.add(
            "copied"
        );


        setTimeout(() => {

            button.replaceChildren(
                createIcon("copy")
            );


            button.append(
                original
            );


            button.classList.remove(
                "copied"
            );


            refreshIcons();

        }, 1400);


    } catch (error) {

        console.error(
            "Copy failed:",
            error
        );

    }

}


/* ================================================================
   MESSAGE ACTIONS
================================================================ */

function createMessageActions(
    contentElement,
    options = {}
) {

    const actions =
        document.createElement("div");


    actions.className =
        "message-actions";


    /* ============================================================
       EDIT
    ============================================================ */

    if (
        typeof options.edit === "function"
    ) {

        const editButton =
            document.createElement("button");


        editButton.type =
            "button";


        editButton.className =
            "message-action-btn";


        editButton.setAttribute(
            "aria-label",
            "Edit message"
        );


        editButton.title =
            "Edit message";


        editButton.appendChild(
            createIcon("pencil")
        );


        editButton.append(
            "Edit"
        );


        editButton.addEventListener(
            "click",
            options.edit
        );


        actions.appendChild(
            editButton
        );

    }


    /* ============================================================
       COPY
    ============================================================ */

    const copyButton =
        document.createElement("button");


    copyButton.type =
        "button";


    copyButton.className =
        "message-action-btn";


    copyButton.setAttribute(
        "aria-label",
        "Copy message"
    );


    copyButton.title =
        "Copy message";


    copyButton.dataset.originalLabel =
        "Copy";


    copyButton.appendChild(
        createIcon("copy")
    );


    copyButton.append(
        "Copy"
    );


    copyButton.addEventListener(
        "click",
        () => {

            copyMessage(
                contentElement.innerText.trim(),
                copyButton
            );

        }
    );


    actions.appendChild(
        copyButton
    );


    /* ============================================================
       REGENERATE
    ============================================================ */

    if (
        typeof options.regenerate === "function"
    ) {

        const regenerateButton =
            document.createElement("button");


        regenerateButton.type =
            "button";


        regenerateButton.className =
            "message-action-btn regenerate-button";


        regenerateButton.setAttribute(
            "aria-label",
            "Regenerate response"
        );


        regenerateButton.title =
            "Regenerate response";


        regenerateButton.appendChild(
            createIcon("refresh-cw")
        );


        regenerateButton.append(
            "Regenerate"
        );


        regenerateButton.addEventListener(
            "click",
            options.regenerate
        );


        actions.appendChild(
            regenerateButton
        );

    }


    refreshIcons();


    return actions;

}


/* ================================================================
   EDIT USER MESSAGE
================================================================ */

async function editUserMessage(
    article,
    historyIndex
) {

    if (
        appState.isGenerating
    ) {

        return;

    }


    const message =
        appState.chatHistory[
            historyIndex
        ];


    if (
        !message ||
        message.role !== "user"
    ) {

        return;

    }


    const content =
        article.querySelector(
            ".message-content"
        );


    if (!content) {
        return;
    }


    /* ------------------------------------------------------------
       Prevent duplicate editing
    ------------------------------------------------------------ */

    if (
        content.querySelector(
            ".message-edit-input"
        )
    ) {

        return;

    }


    const originalText =
        message.content;


    const originalTimestamp =
        message.timestamp ||
        Date.now();


    /* ------------------------------------------------------------
       Clear current content
    ------------------------------------------------------------ */

    content.innerHTML =
        "";


    /* ------------------------------------------------------------
       Edit textarea
    ------------------------------------------------------------ */

    const textarea =
        document.createElement("textarea");


    textarea.className =
        "message-edit-input";


    textarea.value =
        originalText;


    textarea.setAttribute(
        "aria-label",
        "Edit message"
    );


    content.appendChild(
        textarea
    );


    /* ------------------------------------------------------------
       Edit actions
    ------------------------------------------------------------ */

    const editActions =
        document.createElement("div");


    editActions.className =
        "message-edit-actions";


    const cancelButton =
        document.createElement("button");


    cancelButton.type =
        "button";


    cancelButton.className =
        "message-edit-cancel";


    cancelButton.textContent =
        "Cancel";


    const saveButton =
        document.createElement("button");


    saveButton.type =
        "button";


    saveButton.className =
        "message-edit-send";


    saveButton.appendChild(
        createIcon("send")
    );


    saveButton.append(
        "Save & Regenerate"
    );


    editActions.appendChild(
        cancelButton
    );


    editActions.appendChild(
        saveButton
    );


    content.appendChild(
        editActions
    );


    refreshIcons();


    textarea.focus();


    textarea.setSelectionRange(
        textarea.value.length,
        textarea.value.length
    );


    /* ============================================================
       CANCEL
    ============================================================ */

    cancelButton.addEventListener(
        "click",
        () => {

            renderSavedChat();

        }
    );


    /* ============================================================
       SAVE
    ============================================================ */

    saveButton.addEventListener(
        "click",
        async () => {

            const newText =
                textarea.value.trim();


            if (!newText) {

                textarea.focus();

                return;

            }


            if (
                appState.isGenerating
            ) {

                return;

            }


            /* ----------------------------------------------------
               Update user message
            ---------------------------------------------------- */

            message.content =
                newText;


            message.timestamp =
                Date.now();


            /*
             * Everything after the edited user message
             * belongs to the old conversation branch.
             *
             * Remove it before regenerating.
             */

            appState.chatHistory =
                appState.chatHistory.slice(
                    0,
                    historyIndex + 1
                );


            /* ----------------------------------------------------
               Update persistent chat
            ---------------------------------------------------- */

            saveCurrentChat();


            /* ----------------------------------------------------
               Render conversation up to edited message
            ---------------------------------------------------- */

            renderSavedChat();


            /* ----------------------------------------------------
               Generate new response
            ---------------------------------------------------- */

            appState.isGenerating =
                true;


            setInputState(
                true
            );


            let aiMessageElement =
                null;


            try {

                aiMessageElement =
                    createAIMessageElement({

                        timestamp:
                            Date.now(),

                        regenerate: () => {

                            regenerateResponse(
                                aiMessageElement
                            );

                        }

                    });


                await streamAIResponse(

                    message,

                    aiMessageElement

                );


                saveCurrentChat();


                window.dispatchEvent(
                    new CustomEvent(
                        "cythan:history-updated"
                    )
                );


            } catch (error) {

                console.error(
                    "CyThan edit regeneration failed:",
                    error
                );


                if (
                    aiMessageElement
                ) {

                    aiMessageElement.textContent =
                        getFriendlyErrorMessage(
                            error
                        );

                }


            } finally {

                appState.isGenerating =
                    false;


                setInputState(
                    false
                );


                updateSendButton();


                scrollToBottom(
                    chatContainer
                );

            }

        }
    );

}


/* ================================================================
   USER MESSAGE
================================================================ */

export function appendUserMessage(
    text,
    timestamp = Date.now(),
    historyIndex = null
) {

    const article =
        document.createElement("article");

    article.className =
        "message user-message";


    /* ============================================================
       MESSAGE BUBBLE
    ============================================================ */

    const content =
        document.createElement("div");

    content.className =
        "message-content";


    const paragraph =
        document.createElement("p");

    paragraph.textContent =
        text;


    content.appendChild(
        paragraph
    );


    /* ============================================================
       TIMESTAMP
    ============================================================ */

    const timestampElement =
        createMessageTimestamp(
            timestamp
        );

    if (timestampElement) {

        content.appendChild(
            timestampElement
        );

    }


    /* ============================================================
       MESSAGE BUBBLE
    ============================================================ */

    article.appendChild(
        content
    );


    /* ============================================================
       ACTIONS — OUTSIDE THE BUBBLE
    ============================================================ */

    const actions =
        createMessageActions(

            paragraph,

            {
                edit:
                    historyIndex !== null
                        ? () =>
                            editUserMessage(
                                article,
                                historyIndex
                            )
                        : null
            }

        );


    actions.classList.add(
        "user-message-actions"
    );


    article.appendChild(
        actions
    );


    messagesContainer.appendChild(
        article
    );


    refreshIcons();


    scrollToBottom(
        chatContainer
    );


    return article;

}


/* ================================================================
   AI MESSAGE
================================================================ */

export function createAIMessageElement(
    options = {}
) {

    const article =
        document.createElement("article");


    article.className =
        "message ai-message";


    /* ------------------------------------------------------------
       AI Avatar
    ------------------------------------------------------------ */

    const avatar =
        document.createElement("div");


    avatar.className =
        "ai-avatar";


    const avatarIcon =
        document.createElement("img");


    avatarIcon.src =
        "images/cythan-icon.png";


    avatarIcon.alt =
        "CyThan AI";

    /*
     * Keep repeated chat avatars cheap for long conversations.
     * Browsers can defer decoding/loading off-screen copies.
     */
    avatarIcon.loading =
        "lazy";

    avatarIcon.decoding =
        "async";


    avatar.appendChild(
        avatarIcon
    );


    /* ------------------------------------------------------------
       Message content
    ------------------------------------------------------------ */

    const content =
        document.createElement("div");


    content.className =
        "message-content";


    /* ------------------------------------------------------------
       Response content
    ------------------------------------------------------------ */

    const responseContent =
        document.createElement("div");


    responseContent.className =
        "response-content";


    content.appendChild(
        responseContent
    );


    /* ------------------------------------------------------------
       Timestamp
    ------------------------------------------------------------ */

    const timestamp =
        createMessageTimestamp(

            Number.isFinite(
                options.timestamp
            )
                ? options.timestamp
                : Date.now()

        );


    if (timestamp) {

        content.appendChild(
            timestamp
        );

    }


    /* ------------------------------------------------------------
       Actions
    ------------------------------------------------------------ */

    const actions =
        createMessageActions(

            responseContent,

            options

        );


    content.appendChild(
        actions
    );


    /* ------------------------------------------------------------
       AI MESSAGE BODY

       Keep the response bubble and its action buttons as separate
       siblings so the actions render underneath the bubble.
    ------------------------------------------------------------ */

    const body =
        document.createElement("div");


    body.className =
        "ai-message-body";


    body.appendChild(
        content
    );


    body.appendChild(
        actions
    );


    /* ------------------------------------------------------------
       Assemble
    ------------------------------------------------------------ */

    article.appendChild(
        avatar
    );


    article.appendChild(
        body
    );


    messagesContainer.appendChild(
        article
    );


    scrollToBottom(
        chatContainer
    );


    refreshIcons();


    return responseContent;

}


/* ================================================================
   HIDE WELCOME SCREEN
================================================================ */

export function hideWelcomeScreen() {

    if (!welcomeScreen) {
        return;
    }


    welcomeScreen.style.display =
        "none";

}


/* ================================================================
   REGENERATE RESPONSE
================================================================ */

export async function regenerateResponse(
    aiMessageElement
) {

    if (
        appState.isGenerating
    ) {

        return;

    }


    const article =
        aiMessageElement?.closest(
            ".message"
        );


    if (!article) {
        return;
    }


    const articles =
        [
            ...messagesContainer.querySelectorAll(
                ".message"
            )
        ];


    const uiIndex =
        articles.indexOf(
            article
        );


    if (
        uiIndex < 1
    ) {

        return;

    }


    const assistantMessage =
        appState.chatHistory[
            uiIndex
        ];


    const userMessage =
        appState.chatHistory[
            uiIndex - 1
        ];


    if (
        !assistantMessage ||
        assistantMessage.role !==
            "assistant"
    ) {

        return;

    }


    if (
        !userMessage ||
        userMessage.role !==
            "user"
    ) {

        return;

    }


    /* ------------------------------------------------------------
       Remove old assistant response
    ------------------------------------------------------------ */

    appState.chatHistory.splice(
        uiIndex,
        1
    );


    article.remove();

    /*
     * Persist the conversation immediately after removing the old
     * assistant response. A failed regeneration must not resurrect
     * the stale response after a refresh.
     */
    saveCurrentChat();

    window.dispatchEvent(
        new CustomEvent(
            "cythan:history-updated"
        )
    );


    /* ------------------------------------------------------------
       Create replacement
    ------------------------------------------------------------ */

    let replacement =
        null;


    replacement =
        createAIMessageElement({

            timestamp:
                Date.now(),

            regenerate: () =>
                regenerateResponse(
                    replacement
                )

        });


    appState.isGenerating =
        true;


    setInputState(
        true
    );


    try {

        await streamAIResponse(
            userMessage,
            replacement
        );


        saveCurrentChat();


        window.dispatchEvent(
            new CustomEvent(
                "cythan:history-updated"
            )
        );


    } catch (error) {

        console.error(
            "CyThan AI regeneration failed:",
            error
        );


        replacement.textContent =
            getFriendlyErrorMessage(
                error
            );

    } finally {

        appState.isGenerating =
            false;


        setInputState(
            false
        );


        updateSendButton();


        scrollToBottom(
            chatContainer
        );

    }

}


/* ================================================================
   SUBMIT MESSAGE
================================================================ */

export async function handleSubmit() {

    if (
        appState.isGenerating
    ) {

        return;

    }


    const message =
        messageInput.value.trim();


    if (!message) {

        return;

    }


    if (
        getComposerMode() !==
        "chat"
    ) {

        return;

    }


    hideWelcomeScreen();


    /* ------------------------------------------------------------
       Create persistent chat
    ------------------------------------------------------------ */

   if (!appState.activeChatId) {

        createChat(
            message
        );

        window.dispatchEvent(
            new CustomEvent(
                "cythan:history-updated"
            )
        );

    }


    const timestamp =
        Date.now();


    /* ------------------------------------------------------------
       UI
    ------------------------------------------------------------ */

    appendUserMessage(
        message,
        timestamp,
        appState.chatHistory.length
    );


    messageInput.value =
        "";


    /* ------------------------------------------------------------
       State
    ------------------------------------------------------------ */

    appState.chatHistory.push({

        role:
            "user",

        content:
            message,

        timestamp

    });

    /*
     * Persist the user's message before contacting Gemini.
     * If the network fails or the browser is refreshed while the
     * response is streaming, the conversation is still recoverable.
     */
    saveCurrentChat();

    window.dispatchEvent(
        new CustomEvent(
            "cythan:history-updated"
        )
    );


    appState.isGenerating =
        true;


    setInputState(
        true
    );


    let aiMessageElement =
        null;


    try {

        aiMessageElement =
            createAIMessageElement({

                timestamp:
                    Date.now(),

                regenerate: () =>
                    regenerateResponse(
                        aiMessageElement
                    )

            });


        await streamAIResponse(

            appState.chatHistory[
                appState.chatHistory.length - 1
            ],

            aiMessageElement

        );


        saveCurrentChat();


        window.dispatchEvent(
            new CustomEvent(
                "cythan:history-updated"
            )
        );


    } catch (error) {

        console.error(
            "CyThan request failed:",
            error
        );


        if (
            aiMessageElement
        ) {

            aiMessageElement.textContent =
                getFriendlyErrorMessage(
                    error
                );

        }

        /*
         * Keep the user's message persisted even when Gemini fails.
         * The temporary error UI is deliberately not stored as an
         * assistant message.
         */
        saveCurrentChat();

        window.dispatchEvent(
            new CustomEvent(
                "cythan:history-updated"
            )
        );

    } finally {

        appState.isGenerating =
            false;


        setInputState(
            false
        );


        updateSendButton();


        scrollToBottom(
            chatContainer
        );

    }

}


/* ================================================================
   RENDER SAVED CHAT
================================================================ */

export function renderSavedChat() {

    messagesContainer.innerHTML =
        "";


    if (
        !appState.chatHistory?.length
    ) {

        if (welcomeScreen) {

            welcomeScreen.style.display =
                "flex";

        }


        return;

    }


    hideWelcomeScreen();


    appState.chatHistory.forEach(
        (
            message,
            index
        ) => {

            /* ----------------------------------------------------
               USER
            ---------------------------------------------------- */

            if (
                message.role ===
                "user"
            ) {

                appendUserMessage(

                    message.content,

                    message.timestamp,

                    index

                );


                return;

            }


            /* ----------------------------------------------------
               ASSISTANT
            ---------------------------------------------------- */

            if (
                message.role ===
                "assistant"
            ) {

                let aiMessageElement =
                    null;


                aiMessageElement =
                    createAIMessageElement({

                        timestamp:
                            message.timestamp,

                        regenerate: () =>
                            regenerateResponse(
                                aiMessageElement
                            )

                    });


                aiMessageElement.innerHTML =
                    renderMarkdown(
                        message.content
                    );


                highlightCodeBlocks(
                    aiMessageElement
                );


                addCopyButtons(
                    aiMessageElement
                );

            }

        }
    );


    scrollToBottom(
        chatContainer
    );

}
