import { currentMapDataFormatVersion, isFormatUpToDate, updateMapDataFormat } from "./formatversions.js";
import { makeALEIMapDataObject, findALEIMapDataObject, readFromALEIMapDataObject, writeToALEIMapDataObject } from "./handlemapdataobject.js";

const initialMapData = {
    v: currentMapDataFormatVersion,
    content: {
        comments: {

        }
    }
};

// map data object stores the permanent data
// data in use represents the temporary data that is being used and modified by the user (ex. comments in triggers)
// aleiMapData variable is the middle step between load/save operations
// load: map data object >>> aleiMapData >>> data in use
// save: data in use >>> aleiMapData >>> map data object 

export let aleiMapData;

// map data object >>> aleiMapData
export function getALEIMapDataFromALEIMapDataObject() {
    const mapDataObject = findALEIMapDataObject();
    if (mapDataObject === null) {
        aleiMapData = getInitialALEIMapData();
    }
    else {
        aleiMapData = readFromALEIMapDataObject(mapDataObject);
        const upToDate = isFormatUpToDate(aleiMapData);
        if (!upToDate) {
            updateMapDataFormat(aleiMapData);
        }
    }
}

// aleiMapData >>> data in use
export function loadALEIMapDataIntoUse() {
    // put comments data into triggers
    for (const triggerUid in aleiMapData.content.comments) {
        const arr = aleiMapData.content.comments[triggerUid]; //array of the comments from each trigger with the uid
        let commentsPlaced = 0;
        for (const obj of es) {
            if (obj._class != "trigger" || !obj.exists || obj.pm.uid != triggerUid) {
                continue;
            }

            obj.comments = arr[commentsPlaced];
            commentsPlaced++;
            if (commentsPlaced == arr.length) {
                break;
            }
        }
    }
}

// data in use >>> aleiMapData
export function updateALEIMapData() {
    // take data from comments
    aleiMapData.content.comments = {};
    for (const obj of es) {
        if (obj._class != "trigger" || !obj.exists || obj.comments === undefined) {
            continue;
        }

        const uid = obj.pm.uid;
        if (aleiMapData.content.comments[uid] === undefined) {
            aleiMapData.content.comments[uid] = new Array(); //its an array in case some triggers have the same name
        }

        // exclude comments that have a higher position than the trigger's maximum
        let commentsDataToAdd = {};
        const maxActionNum = obj.pm.extended === true ? obj.pm.totalNumOfActions : 10;
        for (const position in obj.comments) {
            if (parseInt(position) < maxActionNum) {
                commentsDataToAdd[position] = obj.comments[position];
            }
        }

        aleiMapData.content.comments[uid].push(commentsDataToAdd);
    }
}

// aleiMapData >>> map data object
export function saveToALEIMapDataObject() {
    const mapDataObject = findALEIMapDataObject();
    if (mapDataObject != null) {
        writeToALEIMapDataObject(mapDataObject, aleiMapData);
    }
    else {
        if (aleiMapDataHasContent()) {
            makeALEIMapDataObject(aleiMapData);
        }
    }
}

export function patchSaveThisMap_aleimapdata() {
    const old_SaveThisMap = unsafeWindow.SaveThisMap;

    // this assumes that none of the data in use is stored in the entity parameters (entity.pm). otherwise the 
    // data would end up in the xml. i don't think there's any reason to put the data in the parameters 
    // specifically so just don't do that and this will work
    unsafeWindow.SaveThisMap = function(temp_to_real_compile_data='', callback=null) {
        updateALEIMapData(); //data in use >>> aleiMapData
        saveToALEIMapDataObject(); //aleiMapData >>> map data object
        
        old_SaveThisMap(temp_to_real_compile_data, callback);
    }
}

function clearDataInUse() {
    for (const obj of es) {
        if (obj._class != "trigger" || !obj.exists || obj.comments === undefined) {
            continue;
        }
        delete obj.comments;
    }
}

function aleiMapDataHasContent() {
    const hasComments = Object.keys(aleiMapData.content.comments).length > 0;
    return hasComments;
}

function getInitialALEIMapData() {
    return JSON.parse(JSON.stringify(initialMapData)); //make and return a deep copy
}

(function setupConsoleDebugFunctions() {
    unsafeWindow.RemoveALEIMapData = function() {
        clearDataInUse();
        unsafeWindow.SaveThisMap();
    }
})();