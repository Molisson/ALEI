import { aleiSettings, storageKeysMap } from "./settings.js";
import { writeStorage } from "./storageutils.js";
import { aleiLog, logLevel } from "../log.js";
import { loadOCM, clearOCM } from "../ocm/ocm.js";

let settingsMenu;
let settingButtonsPerKey;

export function createALEISettingsMenu() {
    settingsMenu = document.createElement("div");
    settingsMenu.className = "mrpopup";
    settingsMenu.innerHTML = `
        <div id="mrtitle">ALEI Settings</div>
        <div id="mrbox">
            <p class="settings-text">NOTE: Settings in yellow text require page refresh to be applied.</p>
            <button class="settings-button settings-button--width-auto" data-action="clear backups">Clear Backups</button>
            <div class="vertical-gap"></div>
            <div class="settings-item" data-key="logLevel">
                <div class="settings-label" title="Specified which log messages are displayed in the console.">Log Level:</div>
                <button class="settings-button" data-value="0">INFO</button>
                <button class="settings-button" data-value="1">DEBUG</button>
                <button class="settings-button" data-value="2">VERBOSE</button>
            </div>
            <div class="settings-item settings-item--requires-refresh" data-key="showTriggerIDs">
                <div class="settings-label" title="Show or hide numerical IDs for trigger actions. Requires a page refresh.">Action IDs:</div>
                <button class="settings-button" data-value="true">Show</button>
                <button class="settings-button" data-value="false">Hide</button>
            </div>
            <div class="settings-item settings-item--requires-refresh" data-key="enableTooltips">
                <div class="settings-label" title="Enable or disable fancier tooltips. Requires a page refresh.">Tooltips:</div>
                <button class="settings-button" data-value="true">Show</button>
                <button class="settings-button" data-value="false">Hide</button>
            </div>

            <!--
            <div class="settings-item" data-key="showIDs">
                <div class="settings-label" title="placeholder tooltip">Object IDs:</div>
                <button class="settings-button" data-value="true">Show</button>
                <button class="settings-button" data-value="false">Hide</button>
            </div>
            <div class="settings-item" data-key="showZIndex">
                <div class="settings-label" title="placeholder tooltip">Z-Index:</div>
                <button class="settings-button" data-value="true">Show</button>
                <button class="settings-button" data-value="false">Hide</button>
            </div>
            -->

            <div class="settings-item" data-key="showSameParameters">
                <div class="settings-label" title="Show or hide identical parameters when multiple objects are selected.">Same Parameters:</div>
                <button class="settings-button" data-value="true">Show</button>
                <button class="settings-button" data-value="false">Hide</button>
            </div>
            <div class="settings-item" data-key="gridBasedOnSnapping">
                <div class="settings-label" title="Specifies if grid size is determined by the snapping setting.">Grid by snap:</div>
                <button class="settings-button" data-value="true">Yes</button>
                <button class="settings-button" data-value="false">No</button>
            </div>
            <div class="settings-item" data-key="renderObjectNames">
                <div class="settings-label" title="Enable or disable rendering of object names.">Show object names: </div>
                <button class="settings-button" data-value="true">Yes</button>
                <button class="settings-button" data-value="false">No</button>
            </div>
            <div class="settings-item" data-key="rematchUID">
                <div class="settings-label" title="Automatically update object UID references when a UID is changed.">Remap UID: </div>
                <button class="settings-button" data-value="true">Enabled</button>
                <button class="settings-button" data-value="false">Disabled</button>
            </div>
            <div class="settings-item settings-item--requires-refresh" data-key="extendedTriggers">
                <div class="settings-label" title="Enable or disable triggers with more than 10 actions. Requires a page refresh.">Extended triggers:</div>
                <button class="settings-button" data-value="true">Enabled</button>
                <button class="settings-button" data-value="false">Disabled</button>
            </div>
            <div class="settings-item settings-item--requires-refresh" data-key="orderedNaming">
                <div class="settings-label" title="Ensure similar object names are numbered sequentially. Requires a page refresh.">Ordered Naming:</div>
                <button class="settings-button" data-value="true">Yes (Slow)</button>
                <button class="settings-button" data-value="false">No (Fast)</button>
            </div>
            <div class="settings-item settings-item--requires-refresh" data-key="customRenderer">
                <div class="settings-label" title="Enable or disable The Official ALEI-branded Renderer (it's faster!). Requires a page refresh.">Custom Renderer:</div>
                <button class="settings-button" data-value="true">Enabled</button>
                <button class="settings-button" data-value="false">Disabled</button>
            </div>
            <div class="settings-item" data-key="cartoonishEdges">
                <div class="settings-label" title="Render cartoonish edges (custom renderer setting).">[R] Cartoonish Edges:</div>
                <button class="settings-button" data-value="true">Yes</button>
                <button class="settings-button" data-value="false">No</button>
            </div>
            <div class="settings-item" data-key="originalSelectOverlay">
                <div class="settings-label" title="Use the original selection indicator (custom renderer setting).">[R] Original Select:</div>
                <button class="settings-button" data-value="true">Yes</button>
                <button class="settings-button" data-value="false">No</button>
            </div>
            <div class="settings-item" data-key="boxRendering">
                <div class="settings-label" title="Render preview for floors and ceilings (custom renderer setting). Work-in-progress.">[R] Preview walls:</div>
                <button class="settings-button" data-value="true">Yes</button>
                <button class="settings-button" data-value="false">No</button>
            </div>
            <div class="settings-item" data-key="showTextPlaceholderDecors">
                <div class="settings-label" title="Render the text of a text decor instead of the placeholder image (custom renderer setting).">[R] Render placeholders:</div>
                <button class="settings-button" data-value="true">Yes</button>
                <button class="settings-button" data-value="false">No</button>
            </div>
        </div>
    `;

    const settingsItems = settingsMenu.getElementsByClassName("settings-item");

    // make popup content container bigger if it needs more space than default
    const minHeight = 300;
    const heightFromSettingsItems = settingsItems.length * 20;
    const heightFromNonSettingsItems = 90;
    const neededHeight = heightFromNonSettingsItems + heightFromSettingsItems;
    if (neededHeight > minHeight) {
        settingsMenu.querySelector("#mrbox").style.height = `${neededHeight}px`;
    }

    // set "Clear Backups" button event listener
    settingsMenu.querySelector(`[data-action="clear backups"]`).addEventListener("click", () => {
        if (!confirm("This will remove map backups from the browser data. Continue?")) return;
        let removed = [];
        for (let key of Object.keys(localStorage)) {
            if(!(key.slice(0, "pb2_map".length) == "pb2_map")) continue;
            removed.push(key);
            localStorage.removeItem(key);
        }
        NewNote(`ALEI: Cleared backup, removed total ${removed.length} backups.`, "#00FFFF");
        aleiLog(logLevel.DEBUG2, `Removed backup of: ${removed}`);
    });

    function formatValue(settingKey, value) {
        if (value === "true") {
            return true;
        }
        if (value === "false") {
            return false;
        }
        if (settingKey === "logLevel") {
            return parseInt(value) || 0;
        }
        return value;
    }

    const superSpecialCallbacksForTheCoolSettings = {
        renderObjectNames: (value) => {
            ENABLE_TEXT = value;
            need_redraw = true;
            UpdateTools();
        },
        rematchUID: (value) => UpdateTools(),
        ocmEnabled: (value) => {
            // ocmEnabled isn't changeable rn but this is what the callback should be if it was
            if (value) {
                loadOCM();
            }
            else {
                clearOCM();
            }
        }
    }

    function settingValueSelected(settingKey, storageKey, value, callback) {
        //console.log(settingKey, storageKey, value, callback);
        writeStorage(storageKey, value);

        aleiSettings[settingKey] = value;

        if (callback !== null) {
            callback(value);
        }

        // update toggled visual
        for (const buttonValue in settingButtonsPerKey[settingKey]) {
            const button = settingButtonsPerKey[settingKey][buttonValue];
            button.classList.remove("settings-button--toggled");
        }
        settingButtonsPerKey[settingKey][value].classList.add("settings-button--toggled");

        // no idea what this is for. i assume it does something important
        triggerActionsPreventError();
    }

    // buttons are stored in dict so they can be accessed when updating toggled visual
    settingButtonsPerKey = {};

    for (const settingsItem of settingsItems) {
        const settingKey = settingsItem.dataset.key;
        const storageKey = storageKeysMap[settingKey];
        const callback = superSpecialCallbacksForTheCoolSettings[settingKey] || null;

        settingButtonsPerKey[settingKey] = {};

        for (const settingsButton of settingsItem.getElementsByClassName("settings-button")) {
            const value = formatValue(settingKey, settingsButton.dataset.value);
            settingsButton.addEventListener("click", (event) => {
                if (event.button === 0) { // clicked with lmb
                    settingValueSelected(settingKey, storageKey, value, callback)
                }
            });

            // good to keep in mind that the button value gets cast into string when using it as a property key
            settingButtonsPerKey[settingKey][value] = settingsButton
        }
    }

    unsafeWindow.ALEI_settingsMenu = settingsMenu; // needs to be added to window so it can be used in dim_undo
    document.body.appendChild(settingsMenu);

    aleiLog(logLevel.DEBUG, "Created settings window.");
}

export function showSettings() {
    if (settingsMenu === undefined) createALEISettingsMenu();

    updateSettingButtonsToggledVisual();

    mrdimlights.style.display = 'block';
    settingsMenu.style.display = 'block';
    dim_undo = "ALEI_settingsMenu.style.display = 'none'";
};

function updateSettingButtonsToggledVisual() {
    for (const settingKey in settingButtonsPerKey) {
        // remove toggled visual from all buttons of the setting
        for (const buttonValue in settingButtonsPerKey[settingKey]) {
            settingButtonsPerKey[settingKey][buttonValue].classList.remove("settings-button--toggled");
        }

        // add toggled visual to the button that matches the current setting
        const currentValue = aleiSettings[settingKey];
        const toggledButton = settingButtonsPerKey[settingKey][currentValue];
        if (toggledButton !== undefined) {
            toggledButton.classList.add("settings-button--toggled");
        }
    }
}