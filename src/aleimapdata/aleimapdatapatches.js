import { updateALEIMapData, saveToALEIMapDataObject } from "./aleimapdata.js";

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