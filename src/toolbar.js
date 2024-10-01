import { aleiSettings } from "./storage/settings.js";
import { aleiLog, logLevel } from "./log.js";
import { themeNames, aleiThemesCount } from "./themes.js";
import { writeStorage } from "./storage/storageutils.js";

unsafeWindow.ALEI_CustomSnapping = () => {
    let snapping = prompt("Enter snapping:", "");

    if (!snapping) return;
    if (isNaN(Number(snapping))) { NewNote("Invalid snapping.", "#FF0000"); return };

    if (snapping < 0.1) {
        snapping = 0.1;
        NewNote("ALEI: Snapping can't be less than 0.1", "#FF0000");
        return;
    }

    if (snapping > 100) {
        snapping = 100;
        NewNote("ALEI: Snapping can't be greater than 100", "#FF0000");
        return;
    }

    GridSnappingSet(Math.round(snapping * 10));
}

function addSnappingOptions() {
    // Remove default snapping options except for "1", we will replace it them later
    document.querySelector(`a[onmousedown="GridSnappingSet(50);"]`).remove();
    document.querySelector(`a[onmousedown="GridSnappingSet(100);"]`).remove();

    let newHTML = ""
    let snappingOptions = [
        1, 2, 5,
        10, 20, 40,
        50, 100, "C"
    ];

    for (let snappingIndex in snappingOptions) {
        let snapping = snappingOptions[snappingIndex];

        if ((snappingIndex % 3 == 0) && (snappingIndex != 0)) {
            // We have to break into new row.
            newHTML += "<br>";
        }

        let element = document.createElement("a");
        // Set relevant attributes.

        if (snapping != "C") {
            element.innerHTML = snapping / 10;
        } else {
            element.innerHTML = "C";
        }

        let toolClass = "tool_btn";
        if (GRID_SNAPPING == snapping) {
            toolClass = "tool_btn2";
        }

        if (!snappingOptions.includes(GRID_SNAPPING) && snapping == "C") {
            toolClass = "tool_btn2";
        }

        element.setAttribute("class", `${toolClass} tool_wid`);
        element.setAttribute("style", "width: 21px;");

        if (snapping != "C") {
            element.setAttribute("onmousedown", `GridSnappingSet(${snapping}); Render();`);
        } else {
            element.setAttribute("onmousedown", "ALEI_CustomSnapping(); Render();");
        }

        newHTML += element.outerHTML;
        // Add to main HTML.
    }
    // Replace original `1` snapping with new HTML.
    document.querySelector(`a[onmousedown="GridSnappingSet(10);"]`).outerHTML = newHTML;
}

// removes buttons that change right panel size cuz they aren't necessary
function removeParamPanelSizeOptions() {
    const firstButton = document.querySelector(`a[onmousedown="EvalSet('param_panel_size',0);SaveBrowserSettings();UpdateCSS();"]`);
    firstButton.previousElementSibling.remove();
    firstButton.previousElementSibling.remove();
    firstButton.previousElementSibling.remove();
    firstButton.nextElementSibling.remove();
    firstButton.nextElementSibling.remove();
    firstButton.nextElementSibling.remove();
    firstButton.nextElementSibling.remove();
    firstButton.nextElementSibling.remove();
    firstButton.nextElementSibling.remove();
    firstButton.remove();
}

// adds rematch uid buttons under "properties: default/as text" buttons
function addRematchUIDOptions() {
    const noButtonToolClass = aleiSettings.rematchUID ? "tool_btn" : "tool_btn2";
    const yesButtonToolClass = aleiSettings.rematchUID ? "tool_btn2" : "tool_btn";

    const prevElement = document.querySelector(`a[onmousedown="EvalSet('FORCE_TEXT_OPTIONS',true);EvalSet('need_GUIParams_update',true);"]`).nextElementSibling.nextElementSibling;
    prevElement.insertAdjacentHTML("afterend", `
        <br>
        <span class="gui_sel_info">
            Remap UID:
            <br>
        </span>
        <div style="height:5px"></div>
        <a class="${noButtonToolClass} tool_wid" style="width:32px;">No</a
        ><a class="${yesButtonToolClass} tool_wid" style="width:32px;">Yes</a
        ><br>
        <div class="q"></div>
    `);

    const noButton = prevElement.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling;
    const yesButton = noButton.nextElementSibling;

    noButton.addEventListener("click", () => setRematchUIDSetting(false));
    yesButton.addEventListener("click", () => setRematchUIDSetting(true));
}

function setRematchUIDSetting(value) {
    aleiSettings.rematchUID = value;
    writeStorage("ALEI_RemapUID", value);
    unsafeWindow.UpdateTools();
}

// adds show object names buttons under "preview: no/yes" buttons
function addShowObjectNamesOptions() {
    const hideButtonToolClass = aleiSettings.renderObjectNames ? "tool_btn" : "tool_btn2";
    const showButtonToolClass = aleiSettings.renderObjectNames ? "tool_btn2" : "tool_btn";

    const prevElement = document.querySelector(`a[onmousedown="ShowTexturesSet(true);"]`).nextElementSibling.nextElementSibling;
    prevElement.insertAdjacentHTML("afterend", `
        <br>
        <span class="gui_sel_info">
            Object names:
            <br>
        </span>
        <div style="height:5px"></div>
        <a class="${hideButtonToolClass} tool_wid" style="width:32px;">Hide</a
        ><a class="${showButtonToolClass} tool_wid" style="width:32px;">Show</a
        ><br>
        <div class="q"></div>
    `);
    const hideButton = prevElement.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling;
    const showButton = hideButton.nextElementSibling;

    hideButton.addEventListener("click", () => setRenderObjectNamesSetting(false));
    showButton.addEventListener("click", () => setRenderObjectNamesSetting(true));
}

function setRenderObjectNamesSetting(value) {
    aleiSettings.renderObjectNames = value;
    writeStorage("ALEI_RenderObjectNames", value);
    unsafeWindow.ENABLE_TEXT = value;
    unsafeWindow.need_redraw = true;
    unsafeWindow.UpdateTools();
}

function addAleiThemeButtons() {
    const greenThemeButton = document.querySelector('a[onmousedown="ThemeSet(THEME_GREEN);"]');
    const toolsBox = greenThemeButton.parentElement;
    const elementAtEnd = greenThemeButton.nextElementSibling;

    let buttonsAdded = 0;

    for (let themeNum = 4; themeNum < 4 + aleiThemesCount; themeNum++) {
        if (buttonsAdded % 2 == 0) {
            const sep = document.createElement("br");
            toolsBox.insertBefore(sep, elementAtEnd);
        }

        const newButton = document.createElement("a");
        if (themeNum != THEME) {
            newButton.className = "tool_btn tool_wid";
        }
        else {
            newButton.className = "tool_btn2 tool_wid";
        }
        newButton.setAttribute("onmousedown", `ThemeSet(${themeNum});`);
        newButton.style.width = "32px";
        newButton.textContent = themeNames[themeNum];
        toolsBox.insertBefore(newButton, elementAtEnd);

        buttonsAdded++;
    }
}

function onToolUpdate() {
    removeParamPanelSizeOptions();
    addSnappingOptions();
    addRematchUIDOptions();
    addShowObjectNamesOptions();
    addAleiThemeButtons();
}

export function patchUpdateTools() {
    let ut = unsafeWindow.UpdateTools;
    unsafeWindow.UpdateTools = function() {
        ut();
        onToolUpdate();
    }
    unsafeWindow.UpdateTools();
    aleiLog(logLevel.DEBUG, "Patched updateTools.");
}