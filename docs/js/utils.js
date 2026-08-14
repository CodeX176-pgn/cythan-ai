"use strict";


export function scrollToBottom(chatContainer) {

    if (!chatContainer) {
        return;
    }


    requestAnimationFrame(() => {

        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: "smooth"
        });

    });

}


export function getFriendlyErrorMessage(error) {

    const code =
        error?.code || "";

    const message =
        error?.message?.toLowerCase() || "";


    if (
        code === "AI_SERVICE_UNAVAILABLE" ||
        message.includes("quota") ||
        message.includes("temporarily unavailable")
    ) {

        return (
            "CyThan AI is temporarily unavailable. " +
            "Please try again shortly."
        );

    }


    if (
        message.includes("failed to fetch") ||
        message.includes("networkerror") ||
        message.includes("load failed") ||
        message.includes("getaddrinfo")
    ) {

        return (
            "I couldn't connect to the CyThan AI service. " +
            "Please check your connection and try again."
        );

    }


    if (
        message.includes("api") ||
        message.includes("gemini") ||
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
