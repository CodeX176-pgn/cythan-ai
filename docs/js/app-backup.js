"use strict";

/* ================================================================
   CyThan AI — Frontend Application
   Vanilla JavaScript + FastAPI streaming backend
================================================================ */


/* ================================================================
   CONFIGURATION
================================================================ */

const API_URL = "/api/chat";


/* ================================================================
   DOM ELEMENTS
================================================================ */

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendBtn");

const messagesContainer =
    document.getElementById("messages");

const chatContainer =
    document.querySelector(".chat-container");

const welcomeScreen =
    document.getElementById("welcomeScreen");

const newChatButton =
    document.getElementById("newChatBtn");

const menuButton =
    document.getElementById("menuBtn");

const sidebar =
    document.querySelector(".sidebar");

const sidebarClose =
    document.getElementById("sidebarClose");


/* ================================================================
   APPLICATION STATE
================================================================ */

let chatHistory = [];

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

    /* ------------------------------------------------------------
       Send button
    ------------------------------------------------------------ */

    if (sendButton) {

        sendButton.addEventListener(
            "click",
            handleSubmit
        );

    }


    /* ------------------------------------------------------------
       Textarea input
    ------------------------------------------------------------ */

    if (messageInput) {

        messageInput.addEventListener(
            "input",
            () => {

                autoResizeTextarea();
                updateSendButton();

            }
        );


        /* --------------------------------------------------------
           Enter sends message
           Shift + Enter creates a new line
        -------------------------------------------------------- */

        messageInput.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    handleSubmit();

                }

            }
        );

    }


    /* ------------------------------------------------------------
       New Chat
    ------------------------------------------------------------ */

    if (newChatButton) {

        newChatButton.addEventListener(
            "click",
            startNewChat
        );

    }


    /* ------------------------------------------------------------
       Mobile sidebar
    ------------------------------------------------------------ */

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


    /* ------------------------------------------------------------
       Suggestion cards
    ------------------------------------------------------------ */

    document
        .querySelectorAll(".suggestion-card")
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    const span =
                        button.querySelector("span");

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

        });

}


/* ================================================================
   SUBMIT MESSAGE
================================================================ */

async function handleSubmit() {

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


    /* Add user message */

    appendUserMessage(message);


    /* Clear input */

    messageInput.value = "";

    autoResizeTextarea();

    updateSendButton();


    /* Store user message */

    chatHistory.push({
        role: "user",
        content: message
    });


    /* Generate AI response */

    await streamAIResponse();

}


/* ================================================================
   STREAM AI RESPONSE
================================================================ */

async function streamAIResponse() {

    isGenerating = true;

    setInputState(true);


    let aiMessageElement = null;

    let aiText = "";


    try {

        const latestMessage =
            chatHistory[chatHistory.length - 1];


        const response =
            await fetch(
                API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        message:
                            latestMessage.content,

                        history:
                            chatHistory.slice(0, -1)

                    })
                }
            );


        /* --------------------------------------------------------
           HTTP error
        -------------------------------------------------------- */

        if (!response.ok) {

            let errorMessage =
                "Something went wrong while contacting CyThan AI.";


            try {

                const errorData =
                    await response.json();

                if (errorData.detail) {

                    errorMessage =
                        errorData.detail;

                }

            } catch {

                /* Response wasn't JSON */

            }


            throw new Error(errorMessage);

        }


        /* --------------------------------------------------------
           Check streaming support
        -------------------------------------------------------- */

        if (!response.body) {

            throw new Error(
                "The server did not provide a streaming response."
            );

        }


        /* --------------------------------------------------------
           Create AI message
        -------------------------------------------------------- */

        aiMessageElement =
            createAIMessageElement();


        const reader =
            response.body.getReader();


        const decoder =
            new TextDecoder("utf-8");


        /* --------------------------------------------------------
           Read response stream
        -------------------------------------------------------- */

        while (true) {

            const {
                value,
                done
            } = await reader.read();


            if (done) {
                break;
            }


            const chunk =
                decoder.decode(
                    value,
                    {
                        stream: true
                    }
                );


            aiText += chunk;


            /*
             * Render Markdown while the response streams.
             *
             * Controls are disabled during streaming so the
             * Copy button isn't repeatedly recreated.
             */

            aiMessageElement.innerHTML =
                renderMarkdown(
                    aiText,
                    false
                );


            scrollToBottom();

        }


        /* --------------------------------------------------------
           Flush remaining decoder data
        -------------------------------------------------------- */

        const remaining =
            decoder.decode();


        if (remaining) {

            aiText += remaining;

        }


        /* --------------------------------------------------------
           Final Markdown rendering
        -------------------------------------------------------- */

        aiMessageElement.innerHTML =
            renderMarkdown(
                aiText,
                false
            );


        /* --------------------------------------------------------
           Add syntax highlighting
           and Copy buttons
        -------------------------------------------------------- */

        highlightCodeBlocks(
            aiMessageElement
        );


        addCopyButtons(
            aiMessageElement
        );


        /* --------------------------------------------------------
           Save AI response
        -------------------------------------------------------- */

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


        const friendlyMessage =
            getFriendlyErrorMessage(error);


        if (aiMessageElement) {

            aiMessageElement.textContent =
                friendlyMessage;

        } else {

            appendAIMessage(
                friendlyMessage
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
   USER MESSAGE
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
     * textContent prevents user input from being
     * interpreted as HTML.
     */

    paragraph.textContent =
        text;


    content.appendChild(paragraph);

    article.appendChild(content);

    messagesContainer.appendChild(article);


    scrollToBottom();

}


/* ================================================================
   AI MESSAGE
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


    article.appendChild(avatar);

    article.appendChild(content);

    messagesContainer.appendChild(article);


    scrollToBottom();


    return content;

}


function appendAIMessage(text) {

    const content =
        createAIMessageElement();


    content.textContent =
        text;


    scrollToBottom();

}


/* ================================================================
   INPUT STATE
================================================================ */

function setInputState(disabled) {

    messageInput.disabled =
        disabled;

    sendButton.disabled =
        disabled;


    if (disabled) {

        messageInput.placeholder =
            "CyThan is thinking...";

    } else {

        messageInput.placeholder =
            "Message CyThan AI...";

    }

}


/* ================================================================
   SEND BUTTON STATE
================================================================ */

function updateSendButton() {

    if (!sendButton) {
        return;
    }


    if (isGenerating) {

        sendButton.disabled =
            true;

        return;

    }


    sendButton.disabled =
        messageInput.value.trim().length === 0;

}


/* ================================================================
   AUTO RESIZE TEXTAREA
================================================================ */

function autoResizeTextarea() {

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
   SCROLL CHAT
================================================================ */

function scrollToBottom() {

    if (!chatContainer) {
        return;
    }


    requestAnimationFrame(() => {

        chatContainer.scrollTo({
            top:
                chatContainer.scrollHeight,
            behavior:
                "smooth"
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

    if (isGenerating) {
        return;
    }


    chatHistory = [];


    messagesContainer.innerHTML =
        "";


    if (welcomeScreen) {

        welcomeScreen.style.display =
            "flex";

    }


    messageInput.value =
        "";


    autoResizeTextarea();

    updateSendButton();

    messageInput.focus();

    closeSidebar();

}


/* ================================================================
   MOBILE SIDEBAR
================================================================ */

function openSidebar() {

    if (!sidebar) {
        return;
    }


    sidebar.classList.add(
        "active"
    );

}


function closeSidebar() {

    if (!sidebar) {
        return;
    }


    sidebar.classList.remove(
        "active"
    );

}


/* ================================================================
   ERROR HANDLING
================================================================ */

function getFriendlyErrorMessage(error) {

    const message =
        error?.message?.toLowerCase() || "";


    if (
        message.includes("failed to fetch") ||
        message.includes("networkerror") ||
        message.includes("load failed")
    ) {

        return (
            "I couldn't connect to the CyThan AI server. " +
            "Please make sure the backend is running and try again."
        );

    }


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


    return (
        "Something went wrong while generating the response. " +
        "Please try again."
    );

}


/* ================================================================
   MARKDOWN RENDERING
================================================================ */

function renderMarkdown(text) {

    if (!text) {
        return "";
    }


    return marked.parse(
        text,
        {
            breaks: true,
            gfm: true
        }
    );

}


/* ================================================================
   SYNTAX HIGHLIGHTING
================================================================ */

function highlightCodeBlocks(
    messageElement
) {

    if (
        typeof hljs === "undefined"
    ) {

        console.warn(
            "Highlight.js is not loaded."
        );

        return;

    }


    messageElement
        .querySelectorAll("pre code")
        .forEach((block) => {

            /*
             * Only highlight blocks that haven't
             * already been highlighted.
             */

            if (
                !block.dataset.highlighted
            ) {

                hljs.highlightElement(
                    block
                );

            }

        });

}


/* ================================================================
   COPY BUTTONS
================================================================ */

function addCopyButtons(
    messageElement
) {

    messageElement
        .querySelectorAll("pre")
        .forEach((pre) => {

            /*
             * Prevent duplicate wrappers.
             */

            if (
                pre.parentElement &&
                pre.parentElement.classList.contains(
                    "code-block-wrapper"
                )
            ) {

                return;

            }


            const code =
                pre.querySelector("code");


            if (!code) {
                return;
            }


            /* ----------------------------------------------------
               Wrapper
            ---------------------------------------------------- */

            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "code-block-wrapper";


            /* ----------------------------------------------------
               Header
            ---------------------------------------------------- */

            const header =
                document.createElement(
                    "div"
                );


            header.className =
                "code-block-header";


            /* ----------------------------------------------------
               Language detection
            ---------------------------------------------------- */

            let language =
                "Code";


            const languageClass =
                Array.from(
                    code.classList
                ).find(
                    (className) =>
                        className.startsWith(
                            "language-"
                        )
                );


            if (languageClass) {

                language =
                    languageClass
                        .replace(
                            "language-",
                            ""
                        )
                        .toUpperCase();

            }


            /* ----------------------------------------------------
               Language label
            ---------------------------------------------------- */

            const languageLabel =
                document.createElement(
                    "span"
                );


            languageLabel.className =
                "code-language";


            languageLabel.textContent =
                language;


            /* ----------------------------------------------------
               Copy button
            ---------------------------------------------------- */

            const copyButton =
                document.createElement(
                    "button"
                );


            copyButton.type =
                "button";


            copyButton.className =
                "code-copy-button";


            copyButton.textContent =
                "Copy";


            copyButton.addEventListener(
                "click",
                async () => {

                    try {

                        await navigator.clipboard.writeText(
                            code.textContent
                        );


                        copyButton.textContent =
                            "Copied!";


                        setTimeout(
                            () => {

                                copyButton.textContent =
                                    "Copy";

                            },
                            1500
                        );


                    } catch (error) {

                        console.error(
                            "Copy failed:",
                            error
                        );


                        copyButton.textContent =
                            "Failed";

                    }

                }
            );


            /* ----------------------------------------------------
               Assemble header
            ---------------------------------------------------- */

            header.appendChild(
                languageLabel
            );


            header.appendChild(
                copyButton
            );


            /* ----------------------------------------------------
               Replace original <pre>
            ---------------------------------------------------- */

            pre.parentNode.insertBefore(
                wrapper,
                pre
            );


            wrapper.appendChild(
                header
            );


            wrapper.appendChild(
                pre
            );

        });

}


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


/* ================================================================
   DEBUG MESSAGE
================================================================ */

console.log(
    "CyThan AI frontend loaded successfully."
);
