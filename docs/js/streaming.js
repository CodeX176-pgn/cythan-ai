"use strict";

import { API_URL } from "./config.js";
import { appState } from "./state.js";
import { renderMarkdown } from "./markdown.js";
import { highlightCodeBlocks, addCopyButtons } from "./code.js";
import { scrollToBottom } from "./utils.js";
import { chatContainer } from "./dom.js";
import {
    showQuotaUnavailable,
    showConnectionUnavailable,
    showRequestRateLimited,
    markServiceAvailable
} from "./service-status.js";

function createServiceError(data, fallbackMessage) {
    const error = new Error(
        data?.message ||
        data?.detail ||
        fallbackMessage
    );

    error.code = data?.error || "UNKNOWN_ERROR";
    error.retryAfter = Number(data?.retry_after) || 0;

    return error;
}

function tryParseStructuredError(text) {
    const trimmed = text.trim();

    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
        return null;
    }

    try {
        const data = JSON.parse(trimmed);

        if (
            data &&
            typeof data === "object" &&
            typeof data.error === "string"
        ) {
            return data;
        }
    } catch {
        // Normal assistant text can contain braces/JSON-like text.
    }

    return null;
}

export async function streamAIResponse(
    latestMessage,
    aiMessageElement
) {
    let aiText = "";

    try {
        let currentIndex =
            appState.chatHistory.indexOf(
                latestMessage
            );

        /*
         * saveCurrentChat() may normalize the active history and
         * create fresh message objects. In that case the object
         * identity above is no longer available. Fall back to the
         * last matching role/content/timestamp so the current user
         * message is never sent twice.
         */
        if (currentIndex < 0 && latestMessage) {
            for (
                let index =
                    appState.chatHistory.length - 1;
                index >= 0;
                index--
            ) {
                const candidate =
                    appState.chatHistory[index];

                if (
                    candidate?.role === latestMessage.role &&
                    candidate?.content === latestMessage.content &&
                    (
                        !latestMessage.timestamp ||
                        candidate.timestamp === latestMessage.timestamp
                    )
                ) {
                    currentIndex = index;
                    break;
                }
            }
        }

        const history =
            currentIndex >= 0
                ? appState.chatHistory.slice(
                    0,
                    currentIndex
                )
                : appState.chatHistory;

        const response = await fetch(
            API_URL,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    message:
                        latestMessage.content,

                    history:
                        history.map(
                            ({ role, content }) => ({
                                role,
                                content
                            })
                        )
                })
            }
        );

        if (!response.ok) {
            let errorData = null;

            try {
                errorData = await response.json();
            } catch {
                // Response wasn't JSON.
            }

            const error = createServiceError(
                errorData,
                "Something went wrong while contacting CyThan AI."
            );

            if (error.code === "REQUEST_RATE_LIMITED") {
                showRequestRateLimited(
                    error.retryAfter,
                    error.message
                );
            } else if (
                error.code === "AI_SERVICE_UNAVAILABLE" ||
                response.status === 429 ||
                response.status === 503
            ) {
                if (error.retryAfter > 0) {
                    showQuotaUnavailable(
                        error.retryAfter,
                        error.message
                    );
                } else {
                    showConnectionUnavailable(
                        error.message
                    );
                }
            }

            throw error;
        }

        if (!response.body) {
            throw new Error(
                "The server did not provide a streaming response."
            );
        }

        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder("utf-8");

        /*
         * Performance optimization:
         * Gemini can deliver many small chunks per second. Updating
         * Markdown, highlighting code, and recalculating scroll
         * position for every chunk can make long responses sluggish.
         *
         * Accumulate text immediately, but batch DOM updates into
         * animation frames.
         */
        let renderScheduled = false;
        let scheduledFrame = null;
        let streamFinished = false;

        const renderStreamUpdate = () => {

            renderScheduled = false;
            scheduledFrame = null;

            if (!aiMessageElement) {
                return;
            }

            aiMessageElement.innerHTML =
                renderMarkdown(aiText);

            if (streamFinished) {

                const article =
                    aiMessageElement.closest(
                        ".message"
                    );

                if (article) {

                    highlightCodeBlocks(
                        article
                    );

                    addCopyButtons(
                        article
                    );

                }

            }

            scrollToBottom(
                chatContainer
            );

        };


        const scheduleRender = () => {

            if (renderScheduled) {
                return;
            }

            renderScheduled = true;

            scheduledFrame =
                requestAnimationFrame(
                    renderStreamUpdate
                );

        };


        while (true) {

            const { value, done } =
                await reader.read();

            if (done) {
                break;
            }

            aiText += decoder.decode(
                value,
                { stream: true }
            );

            scheduleRender();

        }


        aiText += decoder.decode();

        streamFinished = true;


        /*
         * Flush any queued frame so the complete response is visible
         * before validation and persistence continue.
         */
        if (scheduledFrame !== null) {

            cancelAnimationFrame(
                scheduledFrame
            );

            scheduledFrame = null;
            renderScheduled = false;

        }

        renderStreamUpdate();

        const structuredError =
            tryParseStructuredError(aiText);

        if (structuredError) {
            const error =
                createServiceError(
                    structuredError,
                    "CyThan AI encountered an error."
                );

            if (
                error.code ===
                "AI_SERVICE_UNAVAILABLE"
            ) {
                if (error.retryAfter > 0) {
                    showQuotaUnavailable(
                        error.retryAfter,
                        error.message
                    );
                } else {
                    showConnectionUnavailable(
                        error.message
                    );
                }
            }

            throw error;
        }

        const trimmedText =
            aiText.trim();

        if (!trimmedText) {
            throw new Error(
                "CyThan AI returned an empty response."
            );
        }

        markServiceAvailable();

        appState.chatHistory.push({
            role: "assistant",
            content: aiText,
            timestamp: Date.now()
        });

        scrollToBottom(
            chatContainer
        );

        return aiText;
    } catch (error) {
        console.error(
            "CyThan AI request failed:",
            error
        );

        // A fetch/network failure means the browser could not reach
        // CyThan's backend. Reflect that immediately in the top-bar
        // status indicator. Server/API errors are handled above.
        if (
            error?.name === "TypeError" ||
            error?.name === "AbortError" ||
            /failed to fetch|networkerror|load failed/i.test(
                String(error?.message || "")
            )
        ) {
            showConnectionUnavailable(
                "CyThan AI cannot reach the service. Check your internet connection."
            );
        }

        throw error;
    }
}
