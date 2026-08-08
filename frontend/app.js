"use strict";

/* ================================================================
   CyThan AI — Frontend Application
   Vanilla JavaScript + FastAPI streaming backend
================================================================ */


/* ================================================================
   CONFIGURATION
================================================================ */

const CONFIG = {

    // Local development
    localBackend:
        "http://127.0.0.1:8000",

    // Production — Render
    productionBackend:
        "https://cythan-ai.onrender.com"

};


const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";


const BACKEND_URL =
    isLocal
        ? CONFIG.localBackend
        : CONFIG.productionBackend;


const API_URL =
    `${BACKEND_URL}/api/chat`;
/* ================================================================
   DOM ELEMENTS
================================================================ */

const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const messagesContainer = document.getElementById("messages");
const chatContainer = document.getElementById("chatContainer");

const welcomeScreen = document.getElementById("welcomeScreen");
let typingIndicator = document.getElementById("typingIndicator");

const newChatButton = document.getElementById("newChatButton");

const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");
const sidebarClose = document.getElementById("sidebarClose");
const sidebarOverlay = document.getElementById("sidebarOverlay");


/* ================================================================
   APPLICATION STATE
================================================================ */

/*
 * Stores the conversation that will be sent to Gemini.
 *
 * Example:
 *
 * [
 *   {
 *      role: "user",
 *      content: "Hello"
 *   },
 *   {
 *      role: "assistant",
 *      content: "Hello! How can I help?"
 *   }
 * ]
 */

let chatHistory = [];


/*
 * Prevents multiple requests from being submitted
 * simultaneously.
 */

let isGenerating = false;


/* ================================================================
   INITIALIZATION
================================================================ */

document.addEventListener("DOMContentLoaded", () => {

    setupEventListeners();
    updateSendButton();
    autoResizeTextarea();

});


/* ================================================================
   EVENT LISTENERS
================================================================ */

function setupEventListeners() {

    /* Send button */

    sendButton.addEventListener("click", handleSubmit);


    /* Textarea */

    messageInput.addEventListener("input", () => {

        autoResizeTextarea();
        updateSendButton();

    });


    /*
     * Enter sends the message.
     *
     * Shift + Enter creates a new line.
     */

    messageInput.addEventListener("keydown", (event) => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            handleSubmit();

        }

    });


    /* New chat */

    newChatButton.addEventListener(
        "click",
        startNewChat
    );


    /* Mobile sidebar */

    menuButton.addEventListener(
        "click",
        openSidebar
    );


    sidebarClose.addEventListener(
        "click",
        closeSidebar
    );


    sidebarOverlay.addEventListener(
        "click",
        closeSidebar
    );


    /* Suggested prompts */

    document
        .querySelectorAll(".suggestion-card")
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    const text =
                        button.querySelector("span:last-child")
                            ?.textContent
                            .trim();

                    if (!text) return;

                    messageInput.value = text;

                    autoResizeTextarea();
                    updateSendButton();

                    messageInput.focus();

                }
            );

        });

}


/* ================================================================
   SUBMIT MESSAGE
================================================================ */

async function handleSubmit() {

    /*
     * Prevent submitting an empty message or starting
     * another request while one is already running.
     */

    if (isGenerating) {
        return;
    }


    const message =
        messageInput.value.trim();


    if (!message) {
        return;
    }


    /* Hide welcome screen */

    hideWelcomeScreen();


    /* Add user's message to UI */

    appendUserMessage(message);


    /* Clear input */

    messageInput.value = "";

    autoResizeTextarea();
    updateSendButton();


    /*
     * Store the user's message before sending it
     * to the backend.
     */

    chatHistory.push({
        role: "user",
        content: message
    });


    /* Begin generation */

    await streamAIResponse();

}


/* ================================================================
   STREAM AI RESPONSE
================================================================ */

async function streamAIResponse() {

    isGenerating = true;

    setInputState(true);

    showTypingIndicator();


    let aiMessageElement = null;

    let aiText = "";


    try {

        /*
         * Send the user's message and complete conversation
         * history to FastAPI.
         *
         * The latest user message is already contained in
         * chatHistory.
         */

        const latestMessage =
            chatHistory[chatHistory.length - 1];


        const response = await fetch(
            API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    message: latestMessage.content,
                    history: chatHistory.slice(0, -1)
                })
            }
        );


        /* HTTP-level error */

        if (!response.ok) {

            let errorMessage =
                "Something went wrong while contacting the AI.";

            try {

                const errorData =
                    await response.json();

                if (errorData.detail) {
                    errorMessage = errorData.detail;
                }

            } catch {
                /* Response wasn't JSON */
            }

            throw new Error(errorMessage);

        }


        /* Make sure streaming is supported */

        if (!response.body) {

            throw new Error(
                "The server did not provide a streaming response."
            );

        }


        /* Hide typing indicator */

        hideTypingIndicator();


        /*
         * Create the AI message immediately.
         * Text will be inserted as chunks arrive.
         */

        aiMessageElement =
            createAIMessageElement();


        const reader =
            response.body.getReader();


        const decoder =
            new TextDecoder("utf-8");


        /*
         * Read the response stream continuously.
         */

        while (true) {

            const {
                value,
                done
            } = await reader.read();


            if (done) {
                break;
            }


            /*
             * Decode this chunk.
             *
             * stream: true is important because UTF-8
             * characters can occasionally be split across
             * network chunks.
             */

            const chunk =
                decoder.decode(
                    value,
                    {
                        stream: true
                    }
                );


            /*
             * Append the incoming text character-by-character.
             */

            for (const character of chunk) {

                aiText += character;

                aiMessageElement.textContent =
                    aiText;


                /*
                 * Keep the latest response visible.
                 */

                scrollToBottom();


                /*
                 * Small yield allows the browser to render
                 * the incoming text smoothly.
                 */

                await new Promise(
                    (resolve) =>
                        requestAnimationFrame(resolve)
                );

            }

        }


        /*
         * Flush any remaining UTF-8 data.
         */

        const remaining =
            decoder.decode();


        if (remaining) {

            aiText += remaining;

            aiMessageElement.textContent =
                aiText;

        }


        /*
         * Save the completed AI response to conversation
         * history.
         */

        chatHistory.push({
            role: "assistant",
            content: aiText
        });


        scrollToBottom();


    } catch (error) {

        console.error(
            "CyThan AI request failed:",
            error
        );


        hideTypingIndicator();


        /*
         * If an AI message was already created,
         * replace it with a friendly error.
         */

        if (aiMessageElement) {

            aiMessageElement.textContent =
                getFriendlyErrorMessage(error);

        } else {

            appendAIMessage(
                getFriendlyErrorMessage(error)
            );

        }

    } finally {

        isGenerating = false;

        setInputState(false);

        updateSendButton();

        messageInput.focus();

    }

}


/* ================================================================
   APPEND USER MESSAGE
================================================================ */

function appendUserMessage(text) {

    const article =
        document.createElement("article");


    article.className =
        "message user-message";


    const content =
        document.createElement("div");


    content.className =
        "message-content";


    const paragraph =
        document.createElement("p");


    /*
     * textContent is deliberately used instead of innerHTML
     * to prevent user input from being interpreted as HTML.
     */

    paragraph.textContent =
        text;


    content.appendChild(paragraph);

    article.appendChild(content);

    messagesContainer.appendChild(article);


    scrollToBottom();

}


/* ================================================================
   CREATE AI MESSAGE
================================================================ */

function createAIMessageElement() {

    const article =
        document.createElement("article");


    article.className =
        "message ai-message";


    /* AI avatar */

    const avatar =
        document.createElement("div");


    avatar.className =
        "ai-avatar";


    avatar.textContent =
        "C";


    /* Message content */

    const content =
        document.createElement("div");


    content.className =
        "message-content";


    /*
     * We use a div rather than a <p> because streamed text
     * may temporarily be incomplete.
     */

    article.appendChild(avatar);

    article.appendChild(content);

    messagesContainer.appendChild(article);


    scrollToBottom();


    return content;

}


/* ================================================================
   APPEND COMPLETE AI MESSAGE
================================================================ */

function appendAIMessage(text) {

    const content =
        createAIMessageElement();


    content.textContent =
        text;


    scrollToBottom();

}


/* ================================================================
   TYPING INDICATOR
================================================================ */

function showTypingIndicator() {

    if (!typingIndicator) {
        return;
    }


    typingIndicator.hidden = false;


    /*
     * Move typing indicator to the bottom so it remains
     * visible even after previous messages.
     */

    messagesContainer.appendChild(
        typingIndicator
    );


    scrollToBottom();

}


function hideTypingIndicator() {

    if (!typingIndicator) {
        return;
    }


    typingIndicator.hidden = true;

}


/* ================================================================
   INPUT STATE
================================================================ */

function setInputState(disabled) {

    messageInput.disabled =
        disabled;

    sendButton.disabled =
        disabled;


    /*
     * Make it visually obvious that generation is occurring.
     */

    if (disabled) {

        messageInput.setAttribute(
            "placeholder",
            "CyThan is thinking..."
        );

    } else {

        messageInput.setAttribute(
            "placeholder",
            "Message CyThan..."
        );

    }

}


/* ================================================================
   SEND BUTTON STATE
================================================================ */

function updateSendButton() {

    if (isGenerating) {

        sendButton.disabled = true;

        return;

    }


    sendButton.disabled =
        messageInput.value.trim().length === 0;

}


/* ================================================================
   AUTO-RESIZE TEXTAREA
================================================================ */

function autoResizeTextarea() {

    /*
     * Reset height first so the textarea can shrink again.
     */

    messageInput.style.height =
        "auto";


    /*
     * Limit the height to prevent the input box from
     * taking over the screen.
     */

    const maxHeight = 180;


    const newHeight =
        Math.min(
            messageInput.scrollHeight,
            maxHeight
        );


    messageInput.style.height =
        `${newHeight}px`;


    /*
     * Show scrolling once the maximum height is reached.
     */

    messageInput.style.overflowY =
        messageInput.scrollHeight > maxHeight
            ? "auto"
            : "hidden";

}


/* ================================================================
   SCROLL CHAT TO BOTTOM
================================================================ */

function scrollToBottom() {

    requestAnimationFrame(() => {

        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: "smooth"
        });

    });

}


/* ================================================================
   WELCOME SCREEN
================================================================ */

function hideWelcomeScreen() {

    if (!welcomeScreen) {
        return;
    }


    welcomeScreen.style.display =
        "none";

}


/* ================================================================
   NEW CHAT
================================================================ */

function startNewChat() {

    /*
     * Don't reset the conversation while Gemini is still
     * generating a response.
     */

    if (isGenerating) {
        return;
    }


    chatHistory = [];


    /*
     * Remove all generated messages.
     */

    messagesContainer.innerHTML = "";


    /*
     * Re-create the typing indicator because it was
     * removed when messagesContainer was cleared.
     */

    const typing =
        document.createElement("article");


    typing.className =
        "message ai-message typing-message";


    typing.id =
        "typingIndicator";


    typing.hidden = true;


    typing.innerHTML = `
        <div class="ai-avatar">C</div>
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;


    messagesContainer.appendChild(
        typing
    );


    /*
     * Update the global reference.
     */

    typingIndicator = typing;


    /*
     * Show welcome screen.
     */

    if (welcomeScreen) {

        welcomeScreen.style.display =
            "flex";

    }


    /*
     * Clear input.
     */

    messageInput.value = "";

    autoResizeTextarea();
    updateSendButton();

    messageInput.focus();


    closeSidebar();

}


/* ================================================================
   MOBILE SIDEBAR
================================================================ */

function openSidebar() {

    sidebar.classList.add("open");

    sidebarOverlay.classList.add("active");

}


function closeSidebar() {

    sidebar.classList.remove("open");

    sidebarOverlay.classList.remove("active");

}


/* ================================================================
   ERROR HANDLING
================================================================ */

function getFriendlyErrorMessage(error) {

    const message =
        error?.message?.toLowerCase() || "";


    /*
     * Backend unavailable.
     */

    if (
        message.includes("failed to fetch") ||
        message.includes("networkerror") ||
        message.includes("load failed")
    ) {

        return (
            "I couldn't connect to the CyThan AI server. " +
            "Please check your internet connection and try again."
        );

    }


    /*
     * Gemini/API failure.
     */

    if (
        message.includes("api") ||
        message.includes("gemini") ||
        message.includes("quota") ||
        message.includes("429")
    ) {

        return (
            "The AI service is temporarily unavailable. " +
            "Please try again in a moment."
        );

    }


    /*
     * Generic fallback.
     */

    return (
        "Something went wrong while generating the response. " +
        "Please try again."
    );

}


/* ================================================================
   GLOBAL ERROR HANDLERS
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
