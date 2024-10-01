import { ocmHandleObjectsCreation } from "../ocm/ocm.js";
import { aleiSettings } from "../storage/settings.js";

// TODO: rparams of alei map data object should contain options to change or remove map data

const nameOfMapDataObject = "::ALEI Map Data (important!)::";
const nameOfBackupObject = "::ALEI Map Data backup::";

export function makeALEIMapDataObject(data) {
    let mapDataObject = new E("decor");
    mapDataObject.pm.uid = nameOfMapDataObject;
    mapDataObject.pm.model = "null";
    writeToALEIMapDataObject(mapDataObject, data);
    es.push(mapDataObject);
    need_redraw = true;
    UpdateGUIObjectsList();

    // ocm update so it doesn't become invalid
    if (aleiSettings.ocmEnabled) ocmHandleObjectsCreation([mapDataObject]);
}

export function makeBackupObject(aleiMapData) {
    let backupObject = new E("decor");
    backupObject.pm.uid = nameOfBackupObject;
    backupObject.pm.model = "null";
    writeToALEIMapDataObject(backupObject, aleiMapData);
    es.push(backupObject);
    need_redraw = true;
    UpdateGUIObjectsList();

    // ocm update so it doesn't become invalid
    if (aleiSettings.ocmEnabled) ocmHandleObjectsCreation([backupObject]);
}

export function findALEIMapDataObject() {
    for (let obj of es) {
        if (obj.pm.uid == nameOfMapDataObject && obj._class == "decor" && obj.exists) {
            return obj;
        }
    }
    return null;
}

export function writeToALEIMapDataObject(mapDataObject, data) {
    mapDataObject.pm.text = escapeBadCharacters(JSON.stringify(data));
}

export function readFromALEIMapDataObject(mapDataObject) {
    return JSON.parse(unescapeBadCharacters(mapDataObject.pm.text));
}

// this is just all characters that caused problems
// backslash was problematic because they were being escaped with more backslashes when the map was saved i guess
function escapeBadCharacters(text) {
    text = text.replaceAll('"', "&quot;");
    text = text.replaceAll("<", "&lt;");
    text = text.replaceAll(">", "&gt;");
    text = text.replaceAll("\\", "&bs;"); //&bs; isn't actually an official thing but it's a good format
    return text
}

function unescapeBadCharacters(text) {
    text = text.replaceAll("&quot;", '"');
    text = text.replaceAll("&lt;", "<");
    text = text.replaceAll("&gt;", ">");
    text = text.replaceAll("&bs;", "\\");
    return text
}