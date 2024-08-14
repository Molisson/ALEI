import { makeBackupObject } from "./handlemapdataobject.js";

/*
if you change the map data format, make sure to:
- add it to _mapdataformatexamples.json
- increment the format version
- write an update function for it and put it in mapDataFormatUpdateFunctions
- also update initialMapData in aleimapdata.js if it's necessary
*/

export const currentMapDataFormatVersion = 1;

// property name refers to the format version that is being updated to
// update functions update from the previous version to the next. ex. v.1 -> v.2 or v.2 -> v.3
// todo: it'd be smart to add tests for these
const mapDataFormatUpdateFunctions = {
    2: function(aleiMapData) {
        // this should modify aleiMapData to update from v.1 -> v.2
        throw new Error("mapDataFormatUpdateFunctions[2] not implemented");
    }
}

export function isFormatUpToDate(aleiMapData) {
    return aleiMapData.v == currentMapDataFormatVersion;
}

export function updateMapDataFormat(aleiMapData) {
    makeBackupObject(aleiMapData);
    let oldVersion = aleiMapData.v;
    for (let i = oldVersion; i < currentMapDataFormatVersion; i++) {
        let nextVersion = i + 1;
        let updateToNext = mapDataFormatUpdateFunctions[nextVersion];
        if (updateToNext != undefined) {
            updateToNext(aleiMapData)
        }
        else {
            // it's a severe error that could cause crashes and corrupted ALEI map data so this throws an error instead of logging it
            NewNote("ALEI: An error occured while updating ALEI map data.<br>Report this problem to the developers and disable ALEI if the problem persists.", note_bad);
            throw new Error(`v.${i} -> v.${nextVersion} map data update function doesn't exist`);
        }
    }
}