"use strict";

const STORAGE_KEY = "cythan_ai_chats";
const BACKUP_STORAGE_KEY = "cythan_ai_chats_backup";
const CURRENT_SCHEMA_VERSION = 3;
const MAX_CHATS = 100;
const MAX_MESSAGES_PER_CHAT = 500;
const MAX_MESSAGE_LENGTH = 20000;

export const appState = {
    chatHistory: [],
    savedChats: [],
    activeChatId: null,
    isGenerating: false
};

export function generateChatId() {
    return `chat-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

function normalizeMessage(message) {
    if (!message || typeof message !== "object") return null;

    const role =
        ["user", "assistant"].includes(message.role)
            ? message.role
            : null;

    if (
        !role ||
        typeof message.content !== "string" ||
        !message.content.trim()
    ) {
        return null;
    }

    const content = message.content.slice(0, MAX_MESSAGE_LENGTH);

    return {
        role,
        content,
        timestamp: Number.isFinite(message.timestamp)
            ? message.timestamp
            : Date.now()
    };
}

function normalizeChat(chat) {
    if (!chat || typeof chat !== "object") return null;

    const messages = Array.isArray(chat.messages)
        ? chat.messages
            .slice(-MAX_MESSAGES_PER_CHAT)
            .map(normalizeMessage)
            .filter(Boolean)
        : [];

    const createdAt = Number.isFinite(chat.createdAt)
        ? chat.createdAt
        : Date.now();

    const updatedAt = Number.isFinite(chat.updatedAt)
        ? chat.updatedAt
        : createdAt;

    return {
        id:
            typeof chat.id === "string" && chat.id.trim()
                ? chat.id
                : generateChatId(),

        title:
            typeof chat.title === "string" && chat.title.trim()
                ? chat.title.trim().slice(0, 100)
                : "New Chat",

        titleGenerated:
            Boolean(chat.titleGenerated),

        messages,

        createdAt,
        updatedAt,

        schemaVersion:
            CURRENT_SCHEMA_VERSION
    };
}

function migrateChats(parsed) {
    /*
     * Version 1/2 stored chats as a plain array.
     * Version 3 keeps the same outer format, so migration is
     * intentionally non-destructive and normalizes every record.
     */
    const chats = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.chats)
            ? parsed.chats
            : [];

    return chats
        .map(normalizeChat)
        .filter(Boolean)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_CHATS);
}

function persistSerializedChats(chats) {
    const serialized = JSON.stringify(chats);

    /*
     * Keep a backup of the last known-good state. This is useful if
     * a future change corrupts the primary localStorage value.
     */
    try {
        const previous = localStorage.getItem(STORAGE_KEY);

        if (previous) {
            localStorage.setItem(
                BACKUP_STORAGE_KEY,
                previous
            );
        }

        localStorage.setItem(
            STORAGE_KEY,
            serialized
        );

        return true;
    } catch (error) {
        console.error(
            "Failed to persist CyThan chats:",
            error
        );
        return false;
    }
}

export function loadSavedChats() {
    let raw = null;

    try {
        raw = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        console.error(
            "CyThan localStorage is unavailable:",
            error
        );
        appState.savedChats = [];
        return false;
    }

    if (!raw) {
        appState.savedChats = [];
        return true;
    }

    try {
        const parsed = JSON.parse(raw);
        appState.savedChats = migrateChats(parsed);

        /*
         * If older data was found, rewrite it using the current
         * schema. This is safe because migration is non-destructive.
         */
        persistSerializedChats(appState.savedChats);

        return true;
    } catch (error) {
        console.error(
            "Primary chat storage is corrupted. Trying backup...",
            error
        );

        try {
            const backup = localStorage.getItem(
                BACKUP_STORAGE_KEY
            );

            if (backup) {
                const parsedBackup = JSON.parse(backup);

                appState.savedChats =
                    migrateChats(parsedBackup);

                persistSerializedChats(
                    appState.savedChats
                );

                console.warn(
                    "CyThan restored conversations from backup storage."
                );

                return true;
            }
        } catch (backupError) {
            console.error(
                "Backup chat storage is also corrupted:",
                backupError
            );
        }

        appState.savedChats = [];
        appState.activeChatId = null;
        appState.chatHistory = [];

        return false;
    }
}

export function saveAllChats() {
    const normalized =
        appState.savedChats
            .map(normalizeChat)
            .filter(Boolean)
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, MAX_CHATS);

    appState.savedChats = normalized;

    return persistSerializedChats(
        normalized
    );
}

export function createChat(firstMessage = "") {
    const now = Date.now();

    const chat = {
        id: generateChatId(),

        title:
            createChatTitle(firstMessage),

        titleGenerated:
            Boolean(firstMessage?.trim()),

        messages: [],

        createdAt: now,
        updatedAt: now,

        schemaVersion:
            CURRENT_SCHEMA_VERSION
    };

    appState.savedChats.unshift(chat);

    appState.activeChatId = chat.id;
    appState.chatHistory = chat.messages;

    saveAllChats();

    return chat;
}

export function createChatTitle(message) {
    if (!message) {
        return "New Chat";
    }

    let title =
        message
            .replace(/\s+/g, " ")
            .trim()
            .replace(
                /^[\s.,!?;:]+|[\s.,!?;:]+$/g,
                ""
            );

    const maxLength = 45;

    if (title.length > maxLength) {
        title =
            title.substring(0, maxLength).trim() +
            "...";
    }

    return title || "New Chat";
}

export function updateChatTitle(chatId, title) {
    const chat = getChatById(chatId);

    if (!chat || !title?.trim()) {
        return false;
    }

    chat.title =
        title
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 100);

    chat.titleGenerated = true;
    chat.updatedAt = Date.now();

    return saveAllChats();
}

export function saveCurrentChat() {
    if (!appState.activeChatId) {
        return false;
    }

    const chat =
        getChatById(
            appState.activeChatId
        );

    if (!chat) {
        return false;
    }

    chat.messages =
        appState.chatHistory
            .slice(-MAX_MESSAGES_PER_CHAT)
            .map(normalizeMessage)
            .filter(Boolean);

    /*
     * Keep the title stable. Only generate a title when the chat
     * still has the default title and contains a user message.
     */
    if (
        !chat.titleGenerated &&
        chat.title === "New Chat"
    ) {
        const firstUserMessage =
            chat.messages.find(
                message =>
                    message.role === "user"
            );

        if (firstUserMessage) {
            chat.title =
                createChatTitle(
                    firstUserMessage.content
                );

            chat.titleGenerated = true;
        }
    }

    chat.updatedAt = Date.now();
    chat.schemaVersion = CURRENT_SCHEMA_VERSION;

    /*
     * appState.chatHistory points to the active chat's message
     * array in normal operation. Assigning a fresh array here
     * prevents accidental mutation of persisted objects.
     */
    appState.chatHistory =
        chat.messages.map(
            message => ({ ...message })
        );

    return saveAllChats();
}

export function getChatById(chatId) {
    return appState.savedChats.find(
        chat => chat.id === chatId
    );
}

export function loadChat(chatId) {
    const chat = getChatById(chatId);

    if (!chat) {
        return false;
    }

    appState.activeChatId = chat.id;

    appState.chatHistory =
        chat.messages.map(
            message => ({ ...message })
        );

    return true;
}

export function deleteChat(chatId) {
    const index =
        appState.savedChats.findIndex(
            chat => chat.id === chatId
        );

    if (index === -1) {
        return false;
    }

    appState.savedChats.splice(
        index,
        1
    );

    if (
        appState.activeChatId ===
        chatId
    ) {
        appState.activeChatId = null;
        appState.chatHistory = [];
    }

    saveAllChats();

    return true;
}

export function clearAllChats() {
    appState.savedChats = [];
    appState.chatHistory = [];
    appState.activeChatId = null;

    try {
        /*
         * Remove the primary value as well as its backup when the
         * user explicitly chooses "clear all".
         */
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(BACKUP_STORAGE_KEY);
        return true;
    } catch (error) {
        console.error(
            "Failed to clear CyThan chat storage:",
            error
        );
        return false;
    }
}

export function getSortedChats() {
    return [...appState.savedChats].sort(
        (a, b) =>
            b.updatedAt -
            a.updatedAt
    );
}
