"use strict";

// Marked converts Markdown to HTML. Because AI/user-controlled text can
// contain arbitrary Markdown, sanitize the resulting HTML before it is
// inserted with innerHTML.
const ALLOWED_TAGS = new Set([
    "A", "B", "BLOCKQUOTE", "BR", "CODE", "DEL", "EM", "H1", "H2",
    "H3", "H4", "H5", "H6", "HR", "I", "LI", "OL", "P", "PRE",
    "S", "STRONG", "TABLE", "TBODY", "TD", "TH", "THEAD", "TR", "UL"
]);

const ALLOWED_ATTRIBUTES = {
    A: new Set(["href", "title", "target", "rel"]),
    CODE: new Set(["class"]),
};

function isSafeUrl(value) {
    try {
        const url = new URL(value, window.location.href);
        return ["http:", "https:", "mailto:"].includes(url.protocol);
    } catch {
        return false;
    }
}

function sanitizeHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = html;

    const walker = document.createTreeWalker(
        template.content,
        NodeFilter.SHOW_ELEMENT
    );

    const elements = [];
    while (walker.nextNode()) {
        elements.push(walker.currentNode);
    }

    for (const element of elements) {
        if (!ALLOWED_TAGS.has(element.tagName)) {
            element.replaceWith(...Array.from(element.childNodes));
            continue;
        }

        const allowedAttributes = ALLOWED_ATTRIBUTES[element.tagName] || new Set();
        for (const attribute of Array.from(element.attributes)) {
            const name = attribute.name.toLowerCase();

            // Event-handler attributes and every unknown attribute are removed.
            if (name.startsWith("on") || !allowedAttributes.has(name)) {
                element.removeAttribute(attribute.name);
            }
        }

        if (element.tagName === "A") {
            const href = element.getAttribute("href");
            if (!href || !isSafeUrl(href)) {
                element.removeAttribute("href");
            } else {
                element.setAttribute("rel", "noopener noreferrer nofollow");
                if (element.getAttribute("target") === "_blank") {
                    element.setAttribute("target", "_blank");
                } else {
                    element.removeAttribute("target");
                }
            }
        }
    }

    return template.innerHTML;
}

export function renderMarkdown(text) {
    if (!text) {
        return "";
    }

    if (typeof marked !== "undefined" && typeof marked.parse === "function") {
        const html = marked.parse(String(text), {
            breaks: true,
            gfm: true
        });

        return sanitizeHtml(html);
    }

    // Safe fallback if the Markdown CDN has not loaded.
    const escaped = String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    return escaped.replace(/\n/g, "<br>");
}
