import { aleiSettings } from "../../../storage/settings.js";
import { getParamsToDisplay, GenParamVal } from "../paramsguiutils.js";
import { getCommentPositions } from "../comments/commentdata.js";
import { makeCommentBox, setCurrentCommentedTrigger, 
    setCommentsResizeObserverTarget, setupCommentBoxAfterAddedToDOM } from "../comments/commenttextarea.js";
import { addParamSideButtons } from "../paramsidebuttons/paramsidebuttons.js";
import { makeTriggerActionsInteractable } from "../../../triggeractions/interactability.js";
import { aleiExtendedTriggerActionLimit } from "../../../html5mode.js";

const triggerActionParamRegex = /^actions_(\d+)_(type|targetA|targetB)$/;

/**
 * @param {E[]} selection 
 * @returns {string}
 */
export function addNormalParamDisplay(rparams, selection) {
    const paramsToDisplay = getParamsToDisplay(selection);

    let html = "";
    html += getNormalParamsHTML(paramsToDisplay);
    html += getAdditionalParamsHTML(paramsToDisplay);
    html += getButtonsHTML(selection);
    rparams.insertAdjacentHTML("beforeend", html);

    if (selection.length === 1 && selection[0]._class == "trigger") {
        addComments(rparams, selection[0]);
        addEditTriggersAsTextButton(rparams);
    }
    addParamSideButtons(rparams);

    makeTriggerActionsInteractable(rparams);

    StreetMagic();
}

/**
 * get html for all parameters except extended trigger parameters
 * @param {{normal: Map<number, {value: *, multiple: boolean, same: boolean}>, additional: {type: {value: *, same: boolean}, targetA: {value: *, same: boolean}, targetB: {value: *, same: boolean}, multiple: boolean}[]}} paramsToDisplay 
 * @returns {string}
 */
function getNormalParamsHTML(paramsToDisplay) {
    let html = "";
    let labelClass = "pa1 p_u1 r_lt";
    let fieldClass = "pa2 p_u2 r_rt";
    let index = 0;
    let trigger_action_count = 0;
    const lastIndex = paramsToDisplay.normal.size - 1;
    for (const [paramIndex, paramData] of paramsToDisplay.normal.entries()) {
        // remove top rounding (r_lt, r_rt)
        if (index === 1) {
            labelClass = "pa1 p_u1";
            fieldClass = "pa2 p_u2";
        }

        // add bottom rounding (r_lb, r_rb), remove bottom border (p_u0)
        if (index === lastIndex && paramsToDisplay.additional.length === 0) {
            labelClass += " p_u0 r_lb";
            fieldClass += " p_u0 r_rb";
        }

        const paramName = param_type[paramIndex][0];
        const paramType = param_type[paramIndex][1];
        const title = param_type[paramIndex][2];
        const paramVal = (!paramData.multiple || (paramData.same && aleiSettings.showSameParameters)) ? GenParamVal(paramType, paramData.value) : "<nochange>...</nochange>";

        // add opening tag for trigger action parameters container
        if (paramType === "trigger_type") {
            const match = paramName.match(triggerActionParamRegex);
            if (match !== null && match[2] === "type") {
                const actionNum = match[1];
                trigger_action_count = actionNum;
                if ( actionNum <= aleiExtendedTriggerActionLimit ) {
                    html += `<div class="trigger-action" data-action-num="${actionNum}">`;
                }
            }
        }

        //  this is the most complicated code ever.
        if (
            ( paramType === "trigger_type" && trigger_action_count <= aleiExtendedTriggerActionLimit ) ||
            ( ( paramName.startsWith( "actions_" ) && paramType === "nochange" ) && trigger_action_count <= aleiExtendedTriggerActionLimit ) ||
            !paramName.startsWith( "actions_" ) //  stupid hack, somehow.
        ) {
            html += `
                <div class="p_i">
                    <span class="${labelClass}">${title}:</span
                    ><span class="${fieldClass}" onclick="letedit(this, '${paramType}')" onmouseover="letover(this, '${paramType}')" id="pm_${paramName}">${paramVal}</span>
                </div>
            `;
        }

        // add closing tag for trigger action parameters container
        if (paramName.endsWith("_targetB")) {
            html += '</div>';
        }

        index++;
    }
    return html;
}

/**
 * get html for extended trigger parameters
 * @param {{normal: Map<number, {value: *, multiple: boolean, same: boolean}>, additional: {type: {value: *, same: boolean}, targetA: {value: *, same: boolean}, targetB: {value: *, same: boolean}, multiple: boolean}[]}} paramsToDisplay 
 * @returns {string}
 */
function getAdditionalParamsHTML(paramsToDisplay) {
    let html = "";
    if (paramsToDisplay.additional.length > 0) {
        const lastIndex = paramsToDisplay.additional.length - 1;
        paramsToDisplay.additional.forEach((actionData, i) => {
            const actionNum = i + ( aleiExtendedTriggerActionLimit + 1 );
            const typeParamVal =    (!actionData.multiple || (actionData.type.same    && aleiSettings.showSameParameters)) ? GenParamVal("trigger_type", actionData.type.value) : "<nochange>...</nochange>";
            const targetAParamVal = (!actionData.multiple || (actionData.targetA.same && aleiSettings.showSameParameters)) ? GenParamVal("nochange", actionData.targetA.value)  : "<nochange>...</nochange>";
            const targetBParamVal = (!actionData.multiple || (actionData.targetB.same && aleiSettings.showSameParameters)) ? GenParamVal("nochange", actionData.targetB.value)  : "<nochange>...</nochange>";

            html += `
                <div class="trigger-action" data-action-num="${actionNum}">
                    <div class="p_i">
                        <span class="pa1 p_u1">Action '${actionNum}' type:</span
                        ><span class="pa2 p_u2" onclick="letedit(this, 'trigger_type')" onmouseover="letover(this, 'trigger_type')" id="pm_actions_${actionNum}_type">${typeParamVal}</span>
                    </div>
                    <div class="p_i">
                        <span class="pa1 p_u1">- parameter A:</span
                        ><span class="pa2 p_u2" onclick="letedit(this, 'nochange')" onmouseover="letover(this, 'nochange')" id="pm_actions_${actionNum}_targetA">${targetAParamVal}</span>
                    </div>
                    <div class="p_i">
                        <span class="${i !== lastIndex ? "pa1 p_u1" : "pa1 p_u1 p_u0 r_lb"}">- parameter B:</span
                        ><span class="${i !== lastIndex ? "pa2 p_u2" : "pa2 p_u2 p_u0 r_rb"}" onclick="letedit(this, 'nochange')" onmouseover="letover(this, 'nochange')" id="pm_actions_${actionNum}_targetB">${targetBParamVal}</span>
                    </div>
                </div>
            `;
        });
    }
    return html;
}

const editTriggersAsText_button = '<a class="tool_btn tool_wid" style="width:100%;display:block;" onclick="edit_triggers_as_text=true;UpdateGUIParams()">Edit triggers as text</a>';
const getImageSize_button = '<a onclick="getImageSize();" class="tool_btn tool_wid" style="display: block; width: 100%; margin-top: 4px;">Get image size</a>';
const centerDecorationX_button = '<a onclick="centerImageX();" class="tool_btn tool_wid" style="display: block; width: 100%; margin-top: 4px;">Center decoration X</a>';
const centerDecorationY_button = '<a onclick="centerImageY();" class="tool_btn tool_wid" style="display: block; width: 100%; margin-top: 4px;">Center decoration Y</a>';
const extendTrigger_buttons = `
    <div class="two-element-grid">
        <a onclick="addTriggerActionCount(1)" class="tool_btn tool_wid" style="display: block; width: 95%; margin-top: 4px;">(+) Extend trigger action list.</a>
        <a onclick="addTriggerActionCount(-1)" class="tool_btn tool_wid" style="display: block; width: 95%; margin-top: 4px;">(-) Shrink trigger action list.</a>
    </div>

    <div class="two-element-grid">
        <div class="two-element-grid">
            <a onclick="addTriggerActionCount(5)" class="tool_btn tool_wid" style="display: block; width: 90%; margin-top: 4px;">(+5)</a>
            <a onclick="addTriggerActionCount(10)" class="tool_btn tool_wid" style="display: block; width: 90%; margin-top: 4px;">(+10)</a>
        </div>

        <div class="two-element-grid">
            <a onclick="addTriggerActionCount(-5)" class="tool_btn tool_wid" style="display: block; width: 90%; margin-top: 4px;">(-5)</a>
            <a onclick="addTriggerActionCount(-10)" class="tool_btn tool_wid" style="display: block; width: 90%; margin-top: 4px;">(-10)</a>
        </div>
    </div>
`;

function getButtonsHTML(selection) {
    if (selection.length === 1) {
        if (selection[0]._class == "bg") {
            return getImageSize_button;
        }
        else if (selection[0]._class == "decor") {
            return getImageSize_button + centerDecorationX_button + centerDecorationY_button;
        }
        else if (selection[0]._class == "trigger") {
            if (unsafeWindow.ExtendedTriggersLoaded) {
                return extendTrigger_buttons;
            }
        }
    }
    return "";
}

function addEditTriggersAsTextButton(rparams) {
    // Simple, but broad fix.
    const html = editTriggersAsText_button;

    rparams.insertAdjacentHTML("afterend", html);
};

function addComments(rparams, trigger) {
    setCurrentCommentedTrigger(trigger);
    setCommentsResizeObserverTarget(rparams);
    const commentPositions = getCommentPositions(trigger);
    for (const position of commentPositions) {
        const actionNum = position + 1;
        const triggerActionContainer = document.getElementById(`pm_actions_${actionNum}_type`)?.parentElement?.parentElement ?? null;
        if (triggerActionContainer === null || !triggerActionContainer.classList.contains("trigger-action")) {
            continue;
        }
        const commentBox = makeCommentBox(position);
        triggerActionContainer.insertAdjacentElement("beforebegin", commentBox);
        setupCommentBoxAfterAddedToDOM(commentBox);
    }
}

/**
 * update parameters whose type depends on the value of another parameter 
 * (like the value of engine mark's modificator or trigger action's type)
 */
export function StreetMagic() {
    /**
     * given a html element, either returns the value contained in the "real" attribute of a pvalue child element, 
     * or returns the innerHTML. replaces the innerHTML_to_value function
     * @param {HTMLElement} element 
     * @returns 
     */
    function takeParamValueFromElement(element) {
        const pvalue = element.querySelector("pvalue");
        if (pvalue !== null) {
            return pvalue.getAttribute("real").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
        }
        else {
            if (element.querySelector("nochange") !== null || element.innerHTML.includes("&lt;nochange&gt;...&lt;/nochange&gt;")) {
                return "<nochange>...</nochange>";
            }
            return element.innerHTML.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
        }
    }

    function changeParamElementType(paramElementID, paramType) {
        const valobj = document.getElementById(paramElementID);
        if (valobj === null) return;
        valobj.setAttribute("onclick", `letedit(this, '${paramType}')`);
        valobj.setAttribute("onmouseover", `letover(this, '${paramType}')`);
        const paramValue = takeParamValueFromElement(valobj);
        if (paramValue === "<nochange>...</nochange>") {
            valobj.innerHTML = "<nochange>...</nochange>";
        }
        else {
            valobj.innerHTML = GenParamVal(paramType, paramValue);
        }
    }

    // check engine mark params
    let mark_obj = document.getElementById("pm_mark");
    if (mark_obj !== null) {
        const newParamType = mark_pairs["mark_" + takeParamValueFromElement(mark_obj)] ?? "nochange";
        changeParamElementType("pm_forteam", newParamType);
    }

    // check trigger params
    let actionNum = 1;
    while ((mark_obj = document.getElementById(`pm_actions_${actionNum}_type`)) !== null) {
        for (const param of ["A", "B"]) {
            const newParamType = mark_pairs[`trigger_type_${param}${takeParamValueFromElement(mark_obj)}`] ?? "nochange";
            changeParamElementType(`pm_actions_${actionNum}_target${param}`, newParamType);
        }
        actionNum++;
    }
}