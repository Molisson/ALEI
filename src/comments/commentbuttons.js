import { registerParamSideButton } from "../paramsidebuttons/paramsidebuttons.js";
import { commentExists, addCommentData, removeCommentData, defaultCommentText } from "./commentdata.js";
import { makeCommentBox, setupCommentBoxAfterAddedToDOM } from "./commenttextarea.js";

export function registerCommentAdderButton() {
    const id = "commentAdderButton";
    const className = "alei-comment-adder-button";
    const text = "//+";
    const tooltip = "Add comment above";
    const func = commentAdderButtonClicked;
    const locationData = {
        trigger: {
            triggerActionsItem: {
                type: "trigger actions"
            }
        }
    };
    const allowMultipleSelection = false;
    const visibilityCondition = (data) => !commentExists(data.selectionData.objs[0], data.actionNum - 1);
    registerParamSideButton(id, className, text, tooltip, func, locationData, allowMultipleSelection, visibilityCondition);
}

export function registerCommentRemoverButton() {
    const id = "commentRemoverButton";
    const className = "alei-comment-remover-button";
    const text = "X";
    const tooltip = "Remove comment";
    const func = commentRemoverButtonClicked;
    const locationData = {
        trigger: {
            ".alei-comment-box": {
                type: "elements"
            }
        }
    };
    const allowMultipleSelection = false;
    registerParamSideButton(id, className, text, tooltip, func, locationData, allowMultipleSelection);
}

function commentAdderButtonClicked(data) {
    const trigger = data.selectionData.objs[0];
    const position = data.actionNum - 1;
    addCommentData(trigger, position, defaultCommentText);

    // add comment element above first param element
    const rparams = document.getElementById("rparams");
    const commentElement = makeCommentBox(position);
    const firstParamElement = data.elements[0];
    rparams.insertBefore(commentElement, firstParamElement);
    setupCommentBoxAfterAddedToDOM(commentElement);

    // add border
    const sep = document.createElement("div");
    sep.style.height = "2px";
    rparams.insertBefore(sep, firstParamElement);
}

function commentRemoverButtonClicked(data) {
    const trigger = data.selectionData.objs[0];
    const position = data.elements[0].getAttribute("position");
    removeCommentData(trigger, position);

    // remove the comment box and the border it adds
    const commentBoxElement = data.elements[0];
    commentBoxElement.previousElementSibling.remove();
    commentBoxElement.remove();
}