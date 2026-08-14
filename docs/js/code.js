"use strict";

import { createIcon, refreshIcons } from "./icons.js";


export function highlightCodeBlocks(messageElement) {

    if (typeof hljs === "undefined") {

        console.warn(
            "Highlight.js is not loaded."
        );

        return;
    }


    messageElement
        .querySelectorAll("pre code")
        .forEach((block) => {

            if (!block.dataset.highlighted) {

                hljs.highlightElement(block);

            }

        });

}


export function addCopyButtons(messageElement) {

    messageElement
        .querySelectorAll("pre")
        .forEach((pre) => {

            /*
             * Don't create another wrapper if
             * this code block already has one.
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
                document.createElement("div");

            wrapper.className =
                "code-block-wrapper";


            /* ----------------------------------------------------
               Header
            ---------------------------------------------------- */

            const header =
                document.createElement("div");

            header.className =
                "code-block-header";


            /* ----------------------------------------------------
               Language
            ---------------------------------------------------- */

            let language = "Code";


            const languageClass =
                Array.from(code.classList)
                    .find((className) =>
                        className.startsWith("language-")
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


            const languageLabel =
                document.createElement("span");

            languageLabel.className =
                "code-language";

            languageLabel.textContent =
                language;


            /* ----------------------------------------------------
               Copy button
            ---------------------------------------------------- */

            const copyButton =
                document.createElement("button");

            copyButton.type =
                "button";

            copyButton.className =
                "code-copy-button";

            copyButton.setAttribute(
                "aria-label",
                "Copy code"
            );
            copyButton.title = "Copy code";

            copyButton.appendChild(
                createIcon("copy")
            );


            copyButton.addEventListener(
                "click",
                async () => {

                    try {

                        await navigator.clipboard.writeText(
                            code.textContent
                        );


                        copyButton.replaceChildren(
                            createIcon("check")
                        );
                        copyButton.setAttribute("aria-label", "Copied");


                        setTimeout(() => {

                            copyButton.replaceChildren(
                                createIcon("copy")
                            );
                            copyButton.setAttribute("aria-label", "Copy code");

                        }, 1500);


                    } catch (error) {

                        console.error(
                            "Copy failed:",
                            error
                        );

                        copyButton.replaceChildren(
                            createIcon("copy-x")
                        );

                    }

                }
            );


            /* ----------------------------------------------------
               Assemble
            ---------------------------------------------------- */

            header.appendChild(
                languageLabel
            );

            header.appendChild(
                copyButton
            );


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

            refreshIcons();

        });

}
