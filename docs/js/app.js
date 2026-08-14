"use strict";


import {
    appState,
    loadSavedChats,
    getSortedChats,
    loadChat,
    saveCurrentChat
} from "./state.js";


import {
    setupInput,
    setInputState,
    updateSendButton
} from "./input.js";


import {
    handleSubmit,
    renderSavedChat
} from "./chat.js";


import {
    setupSidebar,
    renderChatHistory
} from "./sidebar.js";


import {
    setupSettings
} from "./settings.js";


import { refreshIcons } from "./icons.js";
import { setupServiceStatus } from "./service-status.js";
import { setupAbout, openAbout } from "./about.js";
import { closeSidebar } from "./sidebar.js";


/* ================================================================
   APPLICATION INITIALIZATION
================================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        appState.isGenerating =
            false;


        loadSavedChats();


        setupSettings();
        setupAbout();
        setupServiceStatus();

        refreshIcons();
        
        
        setupInput(
            handleSubmit
        );


        setupSidebar();


        const savedChats =
            getSortedChats();


        if (
            savedChats.length > 0
        ) {

            const mostRecentChat =
                savedChats[0];


            if (
                mostRecentChat.messages &&
                mostRecentChat.messages.length > 0
            ) {

                const loaded =
                    loadChat(
                        mostRecentChat.id
                    );


                if (loaded) {

                    renderSavedChat();

                    renderChatHistory();
                    
                    refreshIcons();

                }

            }

        }


        setInputState(
            false
        );


        updateSendButton();


        console.log(
            "CyThan AI modular frontend loaded successfully."
        );

    }
);


/* ================================================================
   HISTORY UPDATE
================================================================ */

window.addEventListener(
    "cythan:history-updated",
    () => {

        saveCurrentChat();
        renderChatHistory();
        refreshIcons();

    }
);


window.addEventListener(
    "cythan:settings-updated",
    () => {

        if (appState.chatHistory.length > 0) {
            renderSavedChat();
        }

        refreshIcons();

    }
);


window.addEventListener(
    "cythan:close-sidebar",
    closeSidebar
);


window.addEventListener(
    "cythan:open-about",
    () => {
        closeSidebar();
        openAbout();
    }
);


/* ================================================================
   GLOBAL ERROR HANDLER
================================================================ */

window.addEventListener(
    "unhandledrejection",
    (event) => {

        console.error(
            "Unhandled promise rejection:",
            event.reason
        );

    }
);
