import { clearOCM } from "./ocm.js";
import { ocmParamsToCheckPerClass } from "./ocmconnectionutils.js";
import { aleiLog, logLevel } from "../log.js";

/*
patches are:
- handle object creation in m_down
- handle object creation in PasteFromClipBoard
- handle parameter change in UpdatePhysicalParam
- handle parameter change in UpdatePhysicalParams
- clear ocm in StartNewMap
tho it's just UpdatePhysicalParams and StartNewMap here. the rest are in the patched functions in main.js. search "// ocm patch" to find them there.
additionally ocm is updated using ocmHandleObjectsCreation whenever alei adds objects to es (search "// ocm update"):
- aleimapdata/handlemapdataobject.js makeALEIMapDataObject and makeBackupObject
- main.js insertXML
- main.js SaveThisMap of extended triggers
*/

export function patchUpdatePhysicalParams() {
    unsafeWindow.ocmParamsToCheckPerClass = ocmParamsToCheckPerClass; // necessary cuz of patching via direct code replacement

    const oldCode = unsafeWindow.UpdatePhysicalParams.toString();

    // i'm usually opposed to modifying a whole block of code cuz it hides what changes were made, but
    // this needs complicated changes so it's necessary. i've marked the changed lines with comments
    let newCode = oldCode.replace(/if \(MatchLayer\(es\[elems\]\)\).*?layer_mismatch=true;/s, `
        if (MatchLayer(es[elems])) {
            const oldValue = es[elems].pm[paramname]; //added line
            let undoEvalString = ""; //added line
            let redoEvalString = ""; //added line
            var lup = (typeof (paramname) == 'string') ? '"' + paramname + '"' : paramname;
            if (typeof (chvalue) == 'number' || chvalue == 0) {
                undoEvalString = 'es[' + elems + '].pm[' + lup + '] = ' + es[elems].pm[paramname] + ';'; //used to be a call to lnd
                redoEvalString = 'es[' + elems + '].pm[' + lup + '] = ' + chvalue + ';'; //used to be a call to ldn
                es[elems].pm[paramname] = Number(chvalue);
                if (chvalue === delete_addr)
                    ldn('delete es[' + elems + '].pm[' + lup + '];');
            } else if (typeof (chvalue) == 'string') {
                undoEvalString = 'es[' + elems + '].pm[' + lup + '] = "' + es[elems].pm[paramname] + '";'; //used to be a call to lnd
                redoEvalString = 'es[' + elems + '].pm[' + lup + '] = "' + chvalue + '";'; //used to be a call to ldn
                es[elems].pm[paramname] = chvalue;
                if (chvalue === delete_addr)
                    ldn('delete es[' + elems + '].pm[' + lup + '];');
            } else {
                alert('Unknown value type: ' + typeof (chvalue));
            }

            // added lines (the next 2 blocks)
            if (aleiSettings.ocmEnabled && chvalue != oldValue) {
                if (paramname == "uid") {
                    ocmHandleObjectUIDChange(es[elems]);
                    undoEvalString += \`ocmHandleObjectUIDChange(es[\${elems}]);\`;
                    redoEvalString += \`ocmHandleObjectUIDChange(es[\${elems}]);\`;
                }
                else if (ocmParamsToCheckPerClass[es[elems]._class].includes(paramname)) {
                    ocmHandleObjectParametersChange(es[elems]);
                    undoEvalString += \`ocmHandleObjectParametersChange(es[\${elems}]);\`;
                    redoEvalString += \`ocmHandleObjectParametersChange(es[\${elems}]);\`;
                }
            }
            if (undoEvalString !== "") {
                lnd(undoEvalString);
                ldn(redoEvalString);
            }

            list_changes += 'Parameter "' + paramname + '" of object "' + (es[elems].pm.uid != null ? es[elems].pm.uid : es[elems]._class) + '" was set to "' + chvalue + '"<br>';
        } else
            layer_mismatch = true;
    `);

    if (newCode === oldCode) {
        aleiLog(logLevel.WARN, "UpdatePhysicalParams direct code replacement failed (ocm)");
    }

    unsafeWindow.UpdatePhysicalParams = eval("(" + newCode + ")");
}

export function patchStartNewMap() {
    unsafeWindow.clearOCM = clearOCM; // necessary cuz of patching via direct code replacement

    const oldCode = unsafeWindow.StartNewMap.toString();

    let newCode = oldCode.replace("ClearUndos();", "ClearUndos(); clearOCM();")
    if (newCode === oldCode) {
        aleiLog(logLevel.WARN, "StartNewMap direct code replacement failed (ocm)");
    }

    unsafeWindow.StartNewMap = eval("(" + newCode + ")");
}