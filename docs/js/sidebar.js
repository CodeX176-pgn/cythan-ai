"use strict";


import {
    appState,
    loadSavedChats,
    createChat,
    loadChat,
    deleteChat,
    clearAllChats,
    saveCurrentChat,
    getSortedChats,
    updateChatTitle
} from "./state.js";


import {
    messageInput,
    messagesContainer,
    welcomeScreen,
    newChatButton,
    menuButton,
    sidebar,
    sidebarClose
} from "./dom.js";


import {
    autoResizeTextarea,
    updateSendButton
} from "./input.js";


import {
    renderSavedChat
} from "./chat.js";

import { createIcon, refreshIcons } from "./icons.js";


/* ================================================================
   DOM
================================================================ */

const chatHistoryContainer =
    document.querySelector(
        ".chat-history"
    );


/* ================================================================
   OPEN SIDEBAR
================================================================ */

export function openSidebar() {

    if (!sidebar) {

        return;

    }


    sidebar.classList.add(
        "active"
    );


    renderChatHistory();

}


/* ================================================================
   CLOSE SIDEBAR
================================================================ */

export function closeSidebar() {

    if (!sidebar) {

        return;

    }


    sidebar.classList.remove(
        "active"
    );

}


/* ================================================================
   CLEAR CURRENT VIEW
================================================================ */

function clearChatView() {

    if (messagesContainer) {

        messagesContainer.innerHTML =
            "";

    }


    if (welcomeScreen) {

        welcomeScreen.style.display =
            "flex";

    }

}


/* ================================================================
   START NEW CHAT
================================================================ */

export function startNewChat() {

    if (appState.isGenerating) {

        return;

    }


    /*
     * Save the current conversation before creating
     * a blank/new conversation.
     */
    saveCurrentChat();


    appState.activeChatId =
        null;


    appState.chatHistory =
        [];


    clearChatView();


    if (messageInput) {

        messageInput.value =
            "";

        autoResizeTextarea();

        updateSendButton();

        messageInput.focus();

    }


    renderChatHistory();

    closeSidebar();

}

/* ================================================================
   OPEN SAVED CHAT
================================================================ */

export function openSavedChat(
    chatId
) {

    if (appState.isGenerating) {

        return;

    }


    saveCurrentChat();


    if (
        !loadChat(
            chatId
        )
    ) {

        return;

    }


    renderSavedChat();


    if (messageInput) {

        messageInput.value =
            "";

        autoResizeTextarea();

        updateSendButton();

    }


    renderChatHistory();

    closeSidebar();

}


/* ================================================================
   RENAME CHAT
================================================================ */

export function renameChat(
    chatId,
    event
) {

    if (event) {

        event.stopPropagation();

    }


    if (appState.isGenerating) {

        return;

    }


    const chat =
        appState.savedChats.find(
            (item) =>
                item.id === chatId
        );


    if (!chat) {

        return;

    }


    const newTitle =
        window.prompt(
            "Enter a new chat name:",
            chat.title
        );


    if (
        newTitle === null
    ) {

        return;

    }


    const title =
        newTitle.trim();


    if (!title) {

        return;

    }


    updateChatTitle(
        chatId,
        title
    );


    renderChatHistory();

}


/* ================================================================
   DELETE CHAT
================================================================ */

export function removeSavedChat(
    chatId,
    event
) {

    if (event) {

        event.stopPropagation();

    }


    if (appState.isGenerating) {

        return;

    }


    const chat =
        appState.savedChats.find(
            (item) =>
                item.id === chatId
        );


    if (!chat) {

        return;

    }


    const confirmed =
        window.confirm(
            `Delete "${chat.title}"?`
        );


    if (!confirmed) {

        return;

    }


    const wasActive =
        appState.activeChatId ===
        chatId;


    deleteChat(
        chatId
    );


    if (wasActive) {

        clearChatView();

    }


    renderChatHistory();

}


/* ================================================================
   CLEAR ALL CONVERSATIONS
================================================================ */

export function clearAllConversations() {

    if (appState.isGenerating) {

        return;

    }


    if (
        appState.savedChats.length === 0
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


    clearAllChats();

    clearChatView();

    renderChatHistory();


    if (messageInput) {

        messageInput.value =
            "";

        autoResizeTextarea();

        updateSendButton();

    }

}


/* ================================================================
   DATE GROUP
================================================================ */

function getDateGroup(
    timestamp
) {

    const date =
        new Date(
            timestamp
        );


    const now =
        new Date();


    const today =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );


    const chatDate =
        new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );


    const difference =
        today - chatDate;


    const day =
        24 * 60 * 60 * 1000;


    if (
        difference === 0
    ) {

        return "Today";

    }


    if (
        difference === day
    ) {

        return "Yesterday";

    }


    if (
        difference > 0 &&
        difference <=
            day * 7
    ) {

        return "Previous 7 Days";

    }


    return "Older";

}


/* ================================================================
   CREATE GROUP TITLE
================================================================ */

function createGroupTitle(
    text
) {

    const heading =
        document.createElement(
            "p"
        );


    heading.className =
        "history-group-title";


    heading.textContent =
        text;


    return heading;

}


/* ================================================================
   CREATE CHAT ITEM
================================================================ */

function createHistoryItem(
    chat
) {

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "history-item-wrapper";


    const button =
        document.createElement(
            "button"
        );


    button.type =
        "button";


    button.className =
        "history-item";


    if (
        chat.id ===
        appState.activeChatId
    ) {

        button.classList.add(
            "active"
        );

    }


    /* ------------------------------------------------------------
       Icon
    ------------------------------------------------------------ */

    const icon =
        document.createElement(
            "span"
        );


    icon.className =
        "history-icon";


    icon.appendChild(
        createIcon("message-square")
    );


    /* ------------------------------------------------------------
       Title
    ------------------------------------------------------------ */

    const title =
        document.createElement(
            "span"
        );


    title.className =
        "history-item-title";


    title.textContent =
        chat.title ||
        "New Chat";


    /* ------------------------------------------------------------
       Assemble main button
    ------------------------------------------------------------ */

    button.appendChild(
        icon
    );

    button.appendChild(
        title
    );


    /* ------------------------------------------------------------
       Three-dot menu
    ------------------------------------------------------------ */

    const menuButton =
        document.createElement(
            "button"
        );


    menuButton.type =
        "button";


    menuButton.className =
        "history-menu-button";


    menuButton.appendChild(
        createIcon("ellipsis")
    );


    menuButton.title =
        "Chat options";


    menuButton.setAttribute(
        "aria-label",
        "Chat options"
    );


    /* ------------------------------------------------------------
       Menu
    ------------------------------------------------------------ */

    const menu =
        document.createElement(
            "div"
        );


    menu.className =
        "history-menu";


    menu.hidden =
        true;


    /* ------------------------------------------------------------
       Rename
    ------------------------------------------------------------ */

    const renameButton =
        document.createElement(
            "button"
        );


    renameButton.type =
        "button";


    renameButton.className =
        "history-menu-item";


    renameButton.appendChild(
        createIcon("pencil")
    );
    renameButton.append("Rename");


    renameButton.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();

            menu.hidden =
                true;

            renameChat(
                chat.id
            );

        }
    );


    /* ------------------------------------------------------------
       Delete
    ------------------------------------------------------------ */

    const deleteButton =
        document.createElement(
            "button"
        );


    deleteButton.type =
        "button";


    deleteButton.className =
        "history-menu-item delete";


    deleteButton.appendChild(
        createIcon("trash-2")
    );
    deleteButton.append("Delete");


    deleteButton.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();

            menu.hidden =
                true;

            removeSavedChat(
                chat.id
            );

        }
    );


    menu.appendChild(
        renameButton
    );

    menu.appendChild(
        deleteButton
    );


    /* ------------------------------------------------------------
       Toggle menu
    ------------------------------------------------------------ */

    menuButton.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();


            document
                .querySelectorAll(
                    ".history-menu"
                )
                .forEach(
                    (otherMenu) => {

                        if (
                            otherMenu !==
                            menu
                        ) {

                            otherMenu.hidden =
                                true;

                        }

                    }
                );


            menu.hidden =
                !menu.hidden;

        }
    );


    /* ------------------------------------------------------------
       Open chat
    ------------------------------------------------------------ */

    button.addEventListener(
        "click",
        () => {

            menu.hidden =
                true;

            openSavedChat(
                chat.id
            );

        }
    );


    wrapper.appendChild(
        button
    );

    wrapper.appendChild(
        menuButton
    );

    wrapper.appendChild(
        menu
    );


    refreshIcons();
    return wrapper;

}


/* ================================================================
   RENDER CHAT HISTORY
================================================================ */

export function renderChatHistory() {

    if (!chatHistoryContainer) {

        return;

    }


    chatHistoryContainer.innerHTML =
        "";


    /* ------------------------------------------------------------
       Header
    ------------------------------------------------------------ */

    const header =
        document.createElement(
            "div"
        );


    header.className =
        "history-header";


    const title =
        document.createElement(
            "p"
        );


    title.className =
        "history-title";


    title.textContent =
        "Recent Chats";


    /* ------------------------------------------------------------
       Clear all
    ------------------------------------------------------------ */

    const clearButton =
        document.createElement(
            "button"
        );


    clearButton.type =
        "button";


    clearButton.className =
        "clear-history-button";


    clearButton.appendChild(
        createIcon("trash-2")
    );
    clearButton.append("Clear");


    clearButton.title =
        "Clear all conversations";


    clearButton.addEventListener(
        "click",
        clearAllConversations
    );


    header.appendChild(
        title
    );

    header.appendChild(
        clearButton
    );


    chatHistoryContainer.appendChild(
        header
    );


    /* ------------------------------------------------------------
       Get chats
    ------------------------------------------------------------ */

    const chats =
        getSortedChats();


    if (chats.length === 0) {

        const empty =
            document.createElement(
                "p"
            );


        empty.className =
            "history-empty";


        empty.textContent =
            "No conversations yet";


        chatHistoryContainer.appendChild(
            empty
        );


        return;

    }


    /* ------------------------------------------------------------
       Group chats
    ------------------------------------------------------------ */

    const groups = {

        "Today": [],

        "Yesterday": [],

        "Previous 7 Days": [],

        "Older": []

    };


    chats.forEach(
        (chat) => {

            const group =
                getDateGroup(
                    chat.updatedAt
                );


            groups[group].push(
                chat
            );

        }
    );


    /* ------------------------------------------------------------
       Render groups
    ------------------------------------------------------------ */

    Object.keys(groups).forEach(
        (groupName) => {

            const groupChats =
                groups[groupName];


            if (
                groupChats.length === 0
            ) {

                return;

            }


            chatHistoryContainer.appendChild(
                createGroupTitle(
                    groupName
                )
            );


            groupChats.forEach(
                (chat) => {

                    chatHistoryContainer.appendChild(
                        createHistoryItem(
                            chat
                        )
                    );

                }
            );

        }
    );

}


/* ================================================================
   SUGGESTION CARDS
================================================================ */

export function setupSuggestionCards() {

    document
        .querySelectorAll(
            ".suggestion-card"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        if (!messageInput) {

                            return;

                        }


                        const span =
                            button.querySelector(
                                "span"
                            );


                        if (!span) {

                            return;

                        }


                        const text =
                            span.textContent.trim();


                        if (!text) {

                            return;

                        }


                        messageInput.value =
                            text;


                        autoResizeTextarea();

                        updateSendButton();

                        messageInput.focus();

                    }
                );

            }
        );

}


/* ================================================================
   SIDEBAR EVENTS
================================================================ */

export function setupSidebar() {

    window.addEventListener(
        "cythan:close-sidebar",
        closeSidebar
    );

    loadSavedChats();

    renderChatHistory();


    if (newChatButton) {

        newChatButton.addEventListener(
            "click",
            startNewChat
        );

    }


    if (menuButton) {

        menuButton.addEventListener(
            "click",
            openSidebar
        );

    }


    if (sidebarClose) {

        sidebarClose.addEventListener(
            "click",
            closeSidebar
        );

    }


    setupSuggestionCards();

}
