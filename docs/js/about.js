"use strict";

import { createIcon, refreshIcons } from "./icons.js";


/* ================================================================
   ABOUT MODAL
================================================================ */

let aboutModal = null;


/* ================================================================
   OPEN ABOUT
================================================================ */

export function openAbout() {

    window.dispatchEvent(
        new CustomEvent("cythan:close-sidebar")
    );

    if (aboutModal) {
        aboutModal.remove();
    }


    aboutModal =
        createAboutModal();


    document.body.appendChild(
        aboutModal
    );


    requestAnimationFrame(() => {

        aboutModal.classList.add(
            "visible"
        );

    });

}


/* ================================================================
   CLOSE ABOUT
================================================================ */

export function closeAbout() {

    if (!aboutModal) {
        return;
    }


    aboutModal.classList.remove(
        "visible"
    );


    setTimeout(() => {

        if (aboutModal) {

            aboutModal.remove();

            aboutModal =
                null;

        }

    }, 180);

}


/* ================================================================
   CREATE ABOUT MODAL
================================================================ */

function createAboutModal() {

    const overlay =
        document.createElement(
            "div"
        );


    overlay.className =
        "about-overlay";


    overlay.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                overlay
            ) {

                closeAbout();

            }

        }
    );


    const modal =
        document.createElement(
            "section"
        );


    modal.className =
        "about-modal";


    modal.setAttribute(
        "role",
        "dialog"
    );


    modal.setAttribute(
        "aria-modal",
        "true"
    );


    modal.setAttribute(
        "aria-label",
        "About CyThan AI"
    );


    /* ============================================================
       HEADER
    ============================================================ */

    const header =
        document.createElement(
            "header"
        );


    header.className =
        "about-header";


    const title =
        document.createElement(
            "h2"
        );


    title.textContent =
        "About CyThan AI";


    const closeButton =
        document.createElement(
            "button"
        );


    closeButton.type =
        "button";

    closeButton.className =
        "about-close";

    closeButton.appendChild(
        createIcon("x")
    );

    closeButton.setAttribute(
        "aria-label",
        "Close About CyThan AI"
    );


    closeButton.addEventListener(
        "click",
        closeAbout
    );


    header.appendChild(
        title
    );

    header.appendChild(
        closeButton
    );


    modal.appendChild(
        header
    );


    /* ============================================================
       CONTENT
    ============================================================ */

    const content =
        document.createElement(
            "div"
        );


    content.className =
        "about-content";


    /* ------------------------------------------------------------
       BRAND
    ------------------------------------------------------------ */

    const brand =
        document.createElement(
            "div"
        );


    brand.className =
        "about-brand";


    const logo =
        document.createElement(
            "div"
        );

    logo.className =
        "about-logo";


    const lightLogo =
        document.createElement("img");

    lightLogo.className =
        "theme-logo theme-logo-light";

    lightLogo.src =
        "images/cythan-logo-light.png";

    lightLogo.alt =
        "";

    const darkLogo =
        document.createElement("img");

    darkLogo.className =
        "theme-logo theme-logo-dark";

    darkLogo.src =
        "images/cythan-logo-dark.png";

    darkLogo.alt =
        "";

    logo.appendChild(lightLogo);
    logo.appendChild(darkLogo);

    const name =
        document.createElement(
            "h1"
        );


    name.textContent =
        "CyThan AI";


    const tagline =
        document.createElement(
            "p"
        );


    tagline.textContent =
        "Your personal AI assistant.";


    brand.appendChild(
        logo
    );

    brand.appendChild(
        name
    );

    brand.appendChild(
        tagline
    );


    content.appendChild(
        brand
    );


    /* ------------------------------------------------------------
       DESCRIPTION
    ------------------------------------------------------------ */

    content.appendChild(
        createSection(
            "About the project",
            "CyThan AI is a small Summer project exploring artificial intelligence, web development, and conversational user interfaces."
        )
    );


    /* ------------------------------------------------------------
       TECHNOLOGY
    ------------------------------------------------------------ */

    const technologySection =
        document.createElement(
            "section"
        );


    technologySection.className =
        "about-section";


    const technologyTitle =
        document.createElement(
            "h3"
        );


    technologyTitle.textContent =
        "Technology";


    const technologyGrid =
        document.createElement(
            "div"
        );


    technologyGrid.className =
        "about-tech-grid";


    const technologies = [
        ["HTML", "Interface structure"],
        ["CSS", "Responsive design"],
        ["JavaScript", "Frontend logic"],
        ["Python", "Backend"],
        ["FastAPI", "API server"],
        ["Gemini", "AI generation"]
    ];


    technologies.forEach(
        ([name, description]) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "about-tech-item";


            const itemName =
                document.createElement(
                    "strong"
                );


            itemName.textContent =
                name;


            const itemDescription =
                document.createElement(
                    "span"
                );


            itemDescription.textContent =
                description;


            item.appendChild(
                itemName
            );

            item.appendChild(
                itemDescription
            );


            technologyGrid.appendChild(
                item
            );

        }
    );


    technologySection.appendChild(
        technologyTitle
    );

    technologySection.appendChild(
        technologyGrid
    );


    content.appendChild(
        technologySection
    );


    /* ------------------------------------------------------------
       FEATURES
    ------------------------------------------------------------ */

    const featuresSection =
        document.createElement(
            "section"
        );


    featuresSection.className =
        "about-section";


    const featuresTitle =
        document.createElement(
            "h3"
        );


    featuresTitle.textContent =
        "Features";


    const features =
        [
            "Streaming AI responses",
            "Persistent chat history",
            "Chat management",
            "Markdown rendering",
            "Code syntax highlighting",
            "Message and code copying",
            "Response regeneration",
            "Responsive interface",
            "Customizable settings"
        ];


    const featureList =
        document.createElement(
            "div"
        );


    featureList.className =
        "about-feature-list";


    features.forEach(
        (feature) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "about-feature";


            item.innerHTML =
                `
                    <span class="about-feature-check" aria-hidden="true">
                        <i data-lucide="check"></i>
                    </span>

                    <span>
                        ${feature}
                    </span>
                `;


            featureList.appendChild(
                item
            );

        }
    );


    featuresSection.appendChild(
        featuresTitle
    );

    featuresSection.appendChild(
        featureList
    );


    content.appendChild(
        featuresSection
    );


    modal.appendChild(
        content
    );


    /* ============================================================
       FOOTER
    ============================================================ */

    const footer =
        document.createElement(
            "footer"
        );


    footer.className =
        "about-footer";


    footer.textContent =
        "CyThan AI • Summer Project • 2026";


    modal.appendChild(
        footer
    );


    overlay.appendChild(
        modal
    );

    refreshIcons();

    return overlay;

}


/* ================================================================
   CREATE SECTION
================================================================ */

function createSection(
    titleText,
    descriptionText
) {

    const section =
        document.createElement(
            "section"
        );


    section.className =
        "about-section";


    const title =
        document.createElement(
            "h3"
        );


    title.textContent =
        titleText;


    const description =
        document.createElement(
            "p"
        );


    description.textContent =
        descriptionText;


    section.appendChild(
        title
    );

    section.appendChild(
        description
    );


    return section;

}


/* ================================================================
   SETUP ABOUT
================================================================ */

export function setupAbout() {

    const aboutButton =
        document.getElementById(
            "aboutBtn"
        );


    if (!aboutButton) {

        console.warn(
            "About button was not found."
        );

        return;

    }


    aboutButton.addEventListener(
        "click",
        openAbout
    );


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                aboutModal
            ) {

                closeAbout();

            }

        }
    );

}
