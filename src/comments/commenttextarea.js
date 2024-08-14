import { getCommentText, setCommentData } from "./commentdata.js";

// todo: fix bug where minimum height is 2 lines

const commentPrefix = "//";
const lineHeight = 11 * 1.5; //comment font size * line height in em

let currentCommentedTrigger;
let resizeUpdateTimerId = null;
const resizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeUpdateTimerId);
    resizeUpdateTimerId = setTimeout(resizeUpdate, 200);
});

function resizeUpdate() {
    resizeUpdateTimerId = null;
    const rparams = document.getElementById("rparams");
    if (rparams !== null) {
        const commentBoxes = rparams.querySelectorAll(".alei-comment-box");
        for (const element of commentBoxes) {
            const prefixElement = element.querySelector(".alei-comment-box__prefix");
            const textArea = element.querySelector(".alei-comment-box__text-area");
            autoResizeTextarea(textArea);
            setPrefixText(textArea, prefixElement);
        }
    }
}

export function setCurrentCommentedTrigger(trigger) {
    currentCommentedTrigger = trigger;
}

export function setCommentsResizeObserverTarget(rparams) {
    resizeObserver.disconnect();
    resizeObserver.observe(rparams);
}

export function makeCommentBox(position) {
    const prefixElement = document.createElement("span");
    prefixElement.classList.add(
        "alei-comment-box__text-element",
        "alei-comment-box__prefix"
    );

    const commentTextArea = document.createElement("textarea");
    commentTextArea.classList.add(
        "alei-comment-box__text-element",
        "alei-comment-box__text-area"
    );
    commentTextArea.setAttribute("autocomplete", "off");
    commentTextArea.setAttribute("autocorrect", "off");
    commentTextArea.setAttribute("spellcheck", "false");

    const commentBox = document.createElement("div");
    commentBox.className = "alei-comment-box";
    commentBox.setAttribute("position", position);
    commentBox.appendChild(prefixElement);
    commentBox.appendChild(commentTextArea);

    commentTextArea.addEventListener("input", (function() {
        let saveTimeout;
        //saving the reference to the trigger in case another trigger is selected by the time the timeout runs out
        const saveTarget = currentCommentedTrigger;
        return function() {
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }

            saveTimeout = setTimeout(() => {
                saveContent(commentBox, saveTarget);
            }, 1000);

            commentTextChanged(commentTextArea, prefixElement);
        }
    })());
    commentTextArea.addEventListener("focusout", (function() {
        const saveTarget = currentCommentedTrigger;
        return () => { saveContent(commentBox, saveTarget) };
    })());

    const text = getCommentText(currentCommentedTrigger, commentBox.getAttribute("position"));
    commentTextArea.value = text;
    
    return commentBox;
}

export function setupCommentBoxAfterAddedToDOM(commentBox) {
    const prefixElement = commentBox.querySelector(".alei-comment-box__prefix");
    const commentTextArea = commentBox.querySelector(".alei-comment-box__text-area");
    autoResizeTextarea(commentTextArea);
    setPrefixText(commentTextArea, prefixElement);
}

function commentTextChanged(textarea, prefixElement) {
    autoResizeTextarea(textarea);
    setPrefixText(textarea, prefixElement);
}

function autoResizeTextarea(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight;
}

function setPrefixText(textarea, prefixElement) {
    const lines = Math.floor(textarea.scrollHeight / lineHeight);

    let prefixText = `${commentPrefix}\n`.repeat(lines);
    prefixText = prefixText.slice(0, -1);
    prefixElement.textContent = prefixText;
}

function saveContent(commentBox, trigger) {
    const position = commentBox.getAttribute("position");
    const text = commentBox.querySelector(".alei-comment-box__text-area").value;
    setCommentData(trigger, position, text);
}