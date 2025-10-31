import { aleiLog, logLevel, ANSI_CYAN, ANSI_RESET } from "../log.js";
import { aleiSettings } from "../storage/settings.js";
import { getParameterValueParts, replaceParamValueUID, _encodeXMLChars } from "./parameterutils.js";
import { ocmHandleEntityUIDChange, ocmHandleEntityParametersChange } from "../ocm/ocm.js";
import { updateUIDMap } from "./uidmap.js";
import { parameterMap, updateParameterMap } from "./parametermap.js";
import * as wallTxCache from "../wall-textures/cache.js";
import * as spawnAreas from "../spawn-areas.js";
import { aleiExtendedTriggerActionLimit, html5ModeActive } from "../html5mode.js";

export let REGION_EXECUTE_PARAM_ID; // set in updateParameters

export function updateParameters() {
    // Does things to parameters depending on purpose.
    function add(key, type, name, objType) {
        param_type[param_type.length] = [key, type, name, "", objType];
    }
    // Adding parameters that the game accepts but ALE does not have.
    add("moving", "bool", "Is moving", "door");
    add("tarx", "value", "Target X", "door");
    add("tary", "value", "Target Y", "door");
    add("mute", "bool", "Is muted", "door"); //  Recent H5 update
    // Adding our own parameter.
    add("__id", "value", "Object ID", "*");
    add("__priority", "value", "Object priority", "*");
    add("execute", "bool", "Executes directly", "trigger");
    add("uses_timer", "bool", "Calls timer", "region");
    add("text", "string", "Placeholder text", "decor");
    add("attach", "door+none", "Attach to", "water");

    // Patching parameters
    param_type[0] = ['uid', 'string', 'Name', 'Object Name', '*'];

    // Setting global variables for future use
    for(let i = 0; i < param_type.length; i++) {
        let param = param_type[i];
        let key = param[0];
        let selector = param[4];

        if((key == "use_target") && (selector == "region")) {
            REGION_EXECUTE_PARAM_ID = i;
            continue;
        }
        if(["w", "h"].indexOf(key) != -1) { // Enables height and width parameters to be able to have negative height and width.
            param_type[i][1] = "value+round10";
            continue;
        }
    }
    special_values_table["timer+none"] = new Array();
    special_values_table["timer+none"][-1] = "- No timer -";
    special_values_table["timer+none"]["[listof]"] = "timer"; // Somebody save me.
}

const triggerActionsRegex = /^actions_(\d+)_(targetA|targetB|type)$/;
const boolParams = new Set(["flare", "vis", "enabled", "friction", "loop", "s", "moving", "mute", "execute", "uses_timer"]);
const stringParams = new Set(["uid", "c", "url", "text"]);

export function patchUpdatePhysicalParam() {
    unsafeWindow.UpdatePhysicalParam = UpdatePhysicalParam;
    unsafeWindow.UpdatePhysicalParams = UpdatePhysicalParams;
}

/**
 *  This function updates the actual entity class's pm property based on selection.
 *  This function is invoked from setletedit().
 * 
 *  shorthand for UpdatePhysicalParams([paramname], [chvalue], false, showNote)
 *  @param {string}                 paramname            Property to update   Eg: actions_1_type
 *  @param {string|number|boolean}  chvalue              Value to update with Eg: 0
 *  @param {boolean}                showNote             Default=true. Indicates whether to show confirmation note.
 */
function UpdatePhysicalParam(paramname, chvalue, showNote = true) {
    UpdatePhysicalParams([paramname], [chvalue], false, showNote);
}

/**
 * updates parameters (pm) of selected entities. called from UpdatePhysicalParam or when editing 
 * and saving a trigger as text
 * @param {string[]} paramname_arr - array of parameters to update
 * @param {(string|number|boolean)[]} chvalue_arr - array of values to update with
 * @param {boolean} forcefully_create_params - set parameter value even if the entity doesn't have that parameter. never used. not supported for params of extended triggers
 * @param {boolean} showNote - Default=true. Indicates whether to show confirmation note.
 */
function UpdatePhysicalParams(paramname_arr, chvalue_arr, forcefully_create_params, showNote = true) {
    ACTION_cancel(); // lcz();
    let layer_mismatch = false;
    let list_changes = "";
    for (let entityIndex = 0; entityIndex < es.length; entityIndex++) {
        const entity = es[entityIndex];
        if (!entity.exists) continue;
        if (!entity.selected) continue;
        
        for (let paramIndex = 0; paramIndex < paramname_arr.length; paramIndex++) {
            const paramname = paramname_arr[paramIndex];
            let chvalue = chvalue_arr[paramIndex];

            if (!physicalParamExists(entity, paramname) && !forcefully_create_params) continue;
            if (!MatchLayer(entity)) {
                layer_mismatch = true;
                break;
            }

            if (typeof chvalue == "string") {
                chvalue = tryToCastStringParam(paramname, chvalue);
            }
            else if (typeof chvalue != "number" && typeof chvalue != "boolean") {
                alert(`Unknown value type: ${typeof chvalue}`);
                continue;
            }

            const ret = setPhysicalParam(entityIndex, paramname, _encodeXMLChars(chvalue));
            ACTION_add_undo(ret.undo);
            ACTION_add_redo(ret.redo);

            if (paramname == "__id") {
                NewNote(`ALEI: Changing Object ID does not do anything, don't expect that to apply.`, "#FFFFFF");
            }
            else if (paramname == "__priority") {
                ApplyObjectProperties(entity);
            }
            else if (paramname == "uses_timer") { // I do not have to do this, but i will for convenience
                if([true, "true"].includes(entity.pm.uses_timer)) {
                    param_type[REGION_EXECUTE_PARAM_ID][1] = "timer+none";
                } else {
                    param_type[REGION_EXECUTE_PARAM_ID][1] = "trigger+none";
                }
                need_GUIParams_update = true;
            }

            const name = entity.pm.uid !== undefined ? entity.pm.uid : entity._class;
            list_changes += `Parameter "${paramname}" of object "${name}" was set to "${chvalue}"<br>`;
        }
    }
    need_redraw = true;

    if (showNote) {
        NewNote('Operation complete:<br><br>' + list_changes, note_passive);
    }
    if (layer_mismatch) {
        NewNote("Note: Some changes weren't made due to mismatch of active layer and class of selected objects", note_neutral);
    }
    ACTION_finalize(false);
}

/**
 * helper function for UpdatePhysicalParams
 * @param {E} entity 
 * @param {string} paramname 
 */
function physicalParamExists(entity, paramname) {
    if (entity.pm.hasOwnProperty(paramname)) return true;
    if (entity.pm.extended && unsafeWindow.ExtendedTriggersLoaded) {
        const match = paramname.match(triggerActionsRegex);
        return match !== null && Number(match[1]) <= entity.pm.totalNumOfActions;
    }
    return false;
}

/**
 * helper function for UpdatePhysicalParams. fixes some boolean and integer parameters being set to string values.
 * @param {string} paramname 
 * @param {string} stringValue 
 * @returns {string|number|boolean}
 */
function tryToCastStringParam(paramname, stringValue) {
    // attempt to cast into bool if it's supposed to be a bool
    if (boolParams.has(paramname)) {
        const cast = {
            "true": true,
            "false": false
        }[stringValue];
        return cast !== undefined ? cast : stringValue;
    }

    // attempt to cast into number if the parameter isn't specifically supposed to be a string
    if (!stringParams.has(paramname)) {
        const num = parseFloat(stringValue);
        return (Number.isFinite(num) && num.toString() === stringValue) ? num : stringValue;
    }

    return stringValue
}

/**
 * sets the parameter value and calls update functions (for uid map, parameter map, rematch uid, ocm).  
 * returns undo/redo eval strings for the actions that were taken
 * @param {number} entityIndex - index of the entity in es
 * @param {string} paramname 
 * @param {number|string|boolean} newValue 
 * @returns {{undo: string, redo: string}}
 */
function setPhysicalParam(entityIndex, paramname, newValue) {
    // these are necessary because eric's undo evals strings added through lnd in reverse order.
    // order is important for the update functions called here
    let undoEvalString = "";
    let redoEvalString = "";

    let oldValue;
    let partialEvalStringOfSetPm;

    const match = paramname.match(triggerActionsRegex);
    if (match && Number(match[1]) > aleiExtendedTriggerActionLimit) {
        // paramname is an additional parameter of an extended trigger

        const actionIndex = Number(match[1]) - ( aleiExtendedTriggerActionLimit + 1 ); // action_11_... starts at element 0
        const propertyName = {
            type: "additionalActions",
            targetA: "additionalParamA",
            targetB: "additionalParamB"
        }[match[2]];

        oldValue = es[entityIndex].pm[propertyName][actionIndex];
        partialEvalStringOfSetPm = `es[${entityIndex}].pm["${propertyName}"][${actionIndex}]`;

        // set parameter
        es[entityIndex].pm[propertyName][actionIndex] = newValue;
    }
    else {
        // paramname is an ordinary parameter

        oldValue = es[entityIndex].pm[paramname];
        partialEvalStringOfSetPm = `es[${entityIndex}].pm["${paramname}"]`;

        // set parameter
        es[entityIndex].pm[paramname] = newValue;
    }
    
    // add undo/redo str for set parameter
    const evalableOldValue = typeof oldValue == "string" ? `"${oldValue}"` : oldValue;
    const evalableNewValue = typeof newValue == "string" ? `"${newValue}"` : newValue;
    undoEvalString += `${partialEvalStringOfSetPm} = ${evalableOldValue};`;
    redoEvalString += `${partialEvalStringOfSetPm} = ${evalableNewValue};`;
    
    if (newValue !== oldValue) {
        if (paramname == "uid") {
            const newUID = newValue.toString();
            const oldUID = oldValue.toString();

            // update uid map
            updateUIDMap(es[entityIndex], oldUID, newUID);
            undoEvalString += `updateUIDMap(es[${entityIndex}], "${newUID}", "${oldUID}");`;
            redoEvalString += `updateUIDMap(es[${entityIndex}], "${oldUID}", "${newUID}");`;
            
            // ocm handle uid change
            if (aleiSettings.ocmEnabled) {
                ocmHandleEntityUIDChange(es[entityIndex]);
                undoEvalString += `ocmHandleEntityUIDChange(es[${entityIndex}]);`;
                redoEvalString += `ocmHandleEntityUIDChange(es[${entityIndex}]);`;
            }

            // rematch uid (automatically update uid references)
            if (aleiSettings.rematchUID) {
                const ret = updateUIDReferences(oldUID, newUID);
                undoEvalString += ret.undo;
                redoEvalString += ret.redo;
            }
        }
        else {
            // update parameter map
            updateParameterMap(es[entityIndex], paramname, oldValue, newValue);
            undoEvalString += `updateParameterMap(es[${entityIndex}], "${paramname}", ${evalableNewValue}, ${evalableOldValue});`;
            redoEvalString += `updateParameterMap(es[${entityIndex}], "${paramname}", ${evalableOldValue}, ${evalableNewValue});`;

            // ocm handle parameters change
            // this is probably a bit inefficient cuz it updates the connections from all parameters instead of just the one that was changed
            if (aleiSettings.ocmEnabled) {
                ocmHandleEntityParametersChange(es[entityIndex]);
                undoEvalString += `ocmHandleEntityParametersChange(es[${entityIndex}]);`;
                redoEvalString += `ocmHandleEntityParametersChange(es[${entityIndex}]);`;
            }

            if (spawnAreas.classes.has(es[entityIndex]._class) && spawnAreas.params.has(paramname)) {
                if (aleiSettings.renderSpawnAreas) spawnAreas.scheduleUpdate();
                undoEvalString += `if (aleiSettings.renderSpawnAreas) scheduleSpawnAreasUpdate();`;
                redoEvalString += `if (aleiSettings.renderSpawnAreas) scheduleSpawnAreasUpdate();`;
            }

            if (wallTxCache.watchedParams("segments").has(paramname)) {
                wallTxCache.setDirty("segments", [es[entityIndex]]);
                undoEvalString += `setWallTexturesCacheDirty("segments", [es[${entityIndex}]])`;
                redoEvalString += `setWallTexturesCacheDirty("segments", [es[${entityIndex}]])`;
            }
            if (wallTxCache.watchedParams("sprites").has(paramname)) {
                wallTxCache.setDirty("sprites", [es[entityIndex]]);
                undoEvalString += `setWallTexturesCacheDirty("sprites", [es[${entityIndex}]])`;
                redoEvalString += `setWallTexturesCacheDirty("sprites", [es[${entityIndex}]])`;
            }
        }
    }
    
    return {
        undo: undoEvalString,
        redo: redoEvalString
    };
}

/**
 * rematch uid function. updates uid references in all entities that refer to an entity whose uid was changed.  
 * returns undo/redo eval strings for the actions that were taken
 * @param {string} oldUID 
 * @param {string} newUID 
 * @returns {{undo: string, redo: string}}
 */
function updateUIDReferences(oldUID, newUID) {
    if (getParameterValueParts(oldUID).length != 1 || getParameterValueParts(newUID).length != 1) return { undo: "", redo: "" };
    if (!parameterMap.has(oldUID)) return { undo: "", redo: "" };

    aleiLog(logLevel.VERBOSE, `Updating UID references from ${ANSI_CYAN}${oldUID}${ANSI_RESET} to ${ANSI_CYAN}${newUID}${ANSI_RESET}`);

    let undoEvalString = "";
    let redoEvalString = "";

    for (const [connectionPartner, parametersThatRefer] of parameterMap.get(oldUID)) {
        if (!connectionPartner.exists) continue;

        const partnerEsIndex = es.indexOf(connectionPartner);

        for (const paramName of parametersThatRefer) {
            if (paramName == "uid") continue; // shouldn't happen but checking just in case cuz it would probably break stuff
            
            let oldParamValue;
            const match = paramName.match(triggerActionsRegex);
            if (match && Number(match[1]) > aleiExtendedTriggerActionLimit) {
                const propertyName = {
                    type: "additionalActions",
                    targetA: "additionalParamA",
                    targetB: "additionalParamB"
                }[match[2]];
                oldParamValue = connectionPartner.pm[propertyName][Number(match[1]) - ( aleiExtendedTriggerActionLimit + 1 )];
            }
            else {
                oldParamValue = connectionPartner.pm[paramName];
            }

            const newParamValue = replaceParamValueUID(oldParamValue, oldUID, newUID);
            const ret = setPhysicalParam(partnerEsIndex, paramName, newParamValue);
            undoEvalString += ret.undo;
            redoEvalString += ret.redo;
        }
    }

    unsafeWindow.need_GUIParams_update = true;
    
    return {
        undo: undoEvalString,
        redo: redoEvalString
    };
}

export function assignObjectIDs() {
    // TODO: Refactor
    let idmap = {};
    for (let element of es) {
        if (!element.exists) continue;
        if (idmap[element._class] === undefined) idmap[element._class] = -1;

        idmap[element._class] += 1;
        element.aleiID = idmap[element._class];
    }
}
export function assignObjectPriority() {
    // TODO: Refactor
    for (let element of es) {
        if (!element.exists) continue;
        if(element.aleiPriority == undefined) element.aleiPriority = 1;
    }
}

export let propertyAppliedObjects = [];
export function AssignObjectProperties(e) {
    if(e.aleiID == undefined) assignObjectIDs();
    if(e.aleiPriority == undefined) assignObjectPriority();

    if(propertyAppliedObjects.indexOf(e) == -1) propertyAppliedObjects.push(e);

    let entries = Object.entries(e.pm);
    entries.splice(0, 0, ["__id", e.aleiID]);

    if(["bg", "decor"].indexOf(e._class) !== -1) {
        entries.splice(1, 0, ["__priority", e.aleiPriority]);
    };

    e.pm = Object.fromEntries(entries);
}

export let sortRequired = false;
export function SortObjectsByPriority() {
    function getPriority(a, b) {
        return b.aleiPriority - a.aleiPriority;
    }
    es = es.sort(getPriority);
}

function ApplyObjectProperties(e) {
    if(["bg", "decor"].indexOf(e._class) == -1) return;
    if(e.aleiPriority !== e.pm.__priority) {
        e.aleiPriority = e.pm.__priority;
        sortRequired = true;

        // TODO: How can I force update GUI object list?
        // UpdateGUIObjectsList does not do it.
    }
}

export function RemoveObjectProperties(e) {
    delete e.pm.__id;
    delete e.pm.__priority;
}