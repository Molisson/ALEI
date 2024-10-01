import { updateALEIMapData, saveToALEIMapDataObject, initializeALEIMapData } from "./aleimapdata.js";
import { aleiLog, logLevel } from "../log.js";

export function patchSaveThisMap() {
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

export function patchStartNewMap() {
    // set initial value for aleiMapData when a new map is created by pressing "New map". otherwise old data would 
    // persist. it might not be necessary to reset it cuz aleiMapData is only a middle step for the save/load 
    // operations but it seems dangerous anyway

    unsafeWindow.initializeALEIMapData = initializeALEIMapData;

    const oldCode = unsafeWindow.StartNewMap.toString();

    let newCode = oldCode.replace("ClearUndos();", "ClearUndos(); initializeALEIMapData();")
    if (newCode === oldCode) {
        aleiLog(logLevel.WARN, "StartNewMap direct code replacement failed (aleimapdata)");
    }

    unsafeWindow.StartNewMap = eval("(" + newCode + ")");
}