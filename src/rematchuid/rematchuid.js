import { incomingConnectionsMap } from "../ocm/ocm.js";
import { ocmParamsToCheckPerClass } from "../ocm/ocmconnectionutils.js";
import { aleiLog, logLevel, ANSI_CYAN, ANSI_RESET } from "../log.js";
import { aleiSettings } from "../storage/settings.js";

// updates uid references in all entities that refer to an entity whose uid was changed
// also adds stuff to undo/redo so this assumes that updating uid references will be part of an undoable action. probably always will be
export function updateUIDReferences(entity, oldUID, newUID) {
    aleiLog(logLevel.DEBUG2, `Updating UID references from ${ANSI_CYAN}${oldUID}${ANSI_RESET} to ${ANSI_CYAN}${newUID}${ANSI_RESET}`);

    const incomingConnections = incomingConnectionsMap.get(entity);
    if (incomingConnections === undefined) return {undo: "", redo: ""}; // shouldn't happen but just in case.

    let undoEvalString = "";
    let redoEvalString = "";

    // loop each entity that refers to this entity
    for (const connectionPartner of incomingConnections) {
        // entity may not exist even if connection exists. references shouldn't be updated in that case
        if (!connectionPartner.exists) continue;

        const partnerEsIndex = es.indexOf(connectionPartner);

        for (const paramToCheck of ocmParamsToCheckPerClass[connectionPartner._class]) {
            const paramValue = connectionPartner.pm[paramToCheck];

            const newParamValue = replaceParamValueUID(paramValue, oldUID, newUID);
            if (paramValue == newParamValue) continue; //this param doesn't refer to the entity

            // undo/redo
            undoEvalString += `es[${partnerEsIndex}].pm["${paramToCheck}"] = "${paramValue}";`;
            redoEvalString += `es[${partnerEsIndex}].pm["${paramToCheck}"] = "${newParamValue}";`;

            // set value
            connectionPartner.pm[paramToCheck] = newParamValue;
        }

        // check references in extended triggers
        if (aleiSettings.extendedTriggers && connectionPartner._class == "trigger" && connectionPartner.pm.extended) {
            for (let i = 0; i < connectionPartner.pm.additionalActions.length; i++) {
                // i can see there's a bug here related to the undo/redo stuff:
                // 1. change uid of an object that is referred to by an additional param of an extended trigger
                // 2. shrink the extended trigger to 10 actions. the parameters related to extended triggers will be removed
                // 3. undo the uid change (1). "cannot read properties of undefined"
                // this can be fixed by making trigger size subject to undo/redo.
                // for now there's just a check in the undo/redo strings. so it does nothing instead of burning

                const paramA = connectionPartner.pm.additionalParamA[i];
                const newParamAValue = replaceParamValueUID(paramA, oldUID, newUID);
                if (paramA != newParamAValue) {
                    undoEvalString += `if (es[${partnerEsIndex}].pm.extended) { es[${partnerEsIndex}].pm.additionalParamA[${i}] = "${paramA}"; }`;
                    redoEvalString += `if (es[${partnerEsIndex}].pm.extended) { es[${partnerEsIndex}].pm.additionalParamA[${i}] = "${newParamAValue}"; }`;
                    connectionPartner.pm.additionalParamA[i] = newParamAValue;
                }

                const paramB = connectionPartner.pm.additionalParamB[i];
                const newParamBValue = replaceParamValueUID(paramB, oldUID, newUID);
                if (paramB != newParamBValue) {
                    undoEvalString += `if (es[${partnerEsIndex}].pm.extended) { es[${partnerEsIndex}].pm.additionalParamB[${i}] = "${paramB}"; }`;
                    redoEvalString += `if (es[${partnerEsIndex}].pm.extended) { es[${partnerEsIndex}].pm.additionalParamB[${i}] = "${newParamBValue}"; }`;
                    connectionPartner.pm.additionalParamB[i] = newParamBValue;
                }
            }
        }
    }
    unsafeWindow.need_GUIParams_update = true;
    return {
        undo: undoEvalString,
        redo: redoEvalString
    };
}

export function replaceParamValueUID(paramValue, oldUID, newUID) {
    if (typeof paramValue !== "string") return paramValue;
    // check and replace uid in each part separated by comma
    let parts = paramValue.split(", ");
    for (let partIndex = 0; partIndex < parts.length; partIndex++) {
        if (parts[partIndex] == oldUID) {
            parts[partIndex] = newUID;
        }
    }
    return parts.join(", ");
}