// ocm = object connection map

import {  
    removeIncomingConnections, findAndMakeIncomingConnections, 
    removeOutgoingConnections, findAndMakeOutgoingConnections, 
    initializeConnectionsForObjects, 
    shouldConnectionExist 
} from "./ocmconnectionutils.js";
import { aleiLog, logLevel } from "../log.js";
import { aleiSettings } from "../storage/settings.js";

const debugMode = true; // debug mode will check the validity of the ocm after each update and report any problems

// these map entity objects to arrays of entity objects. these always contain every item of es even if the object doesn't have 
// connections or doesn't exist (entity.exists == false). it's possible for an entity object to have a connection to itself.
// Map can cause memory leaks. it's probably ok to use here though cuz the objects in es are never removed anyway (except 
// in the case of making a new map, which is handled)
export let outgoingConnectionsMap = new Map();
export let incomingConnectionsMap = new Map();

// set connection maps by looping each element, happens after map is loaded
export function loadOCM() {
    outgoingConnectionsMap = new Map();
    incomingConnectionsMap = new Map();
    for (const obj of es) {
        outgoingConnectionsMap.set(obj, []);
        incomingConnectionsMap.set(obj, []);
    }
    for (let i = 0; i < es.length; i++) {
        const fromObject = es[i];
        for (let j = 0; j < es.length; j++) {
            const toObject = es[j];
            if (fromObject === toObject && i > j) { // avoid adding connections twice if an object connects to itself
                continue;
            }
            if (shouldConnectionExist(fromObject, toObject)) {
                outgoingConnectionsMap.get(fromObject).push(toObject);
                incomingConnectionsMap.get(toObject).push(fromObject);
            }
        }
    }
}

/*
ocm needs to update when:
- new object is created (initialize connections)
- object uid is changed (update outgoing on everything that matches, incoming on the object)
- object parameter is changed (update incoming on everything that matches, outgoing on the object)
*/

// ocmHandleObjectsCreation should be called when the creation of an object or objects is finished (after all parameters are set).
export function ocmHandleObjectsCreation(objects) {
    initializeConnectionsForObjects(objects, incomingConnectionsMap, outgoingConnectionsMap);

    if (debugMode) {
        aleiLog(logLevel.VERBOSE, "ocmHandleObjectsCreation called");
        checkValidityForDebugging("ocmHandleObjectsCreation");
    }
}

// should be called when object.pm.uid changes
export function ocmHandleObjectUIDChange(object) {
    // first remove all existing incoming connections
    const success = removeIncomingConnections(object, incomingConnectionsMap, outgoingConnectionsMap);
    if (success == false) {
        loadOCM(); // fix ocm
        return;
    }

    // then make new connections
    findAndMakeIncomingConnections(object, incomingConnectionsMap, outgoingConnectionsMap);

    // the uid may have been changed to an uid that is already in use. if rematch uid is on, the uid 
    // references in the connection partners would change and refer to the other object as well.
    // so need to recheck outgoing connections on the connection partners if rematch uid is on.
    // this is probably not the most efficient way to do this
    if (aleiSettings.rematchUID) {
        const partners = incomingConnectionsMap.get(object);
        for (const partner of partners) {
            // first remove all existing outgoing connections
            const success2 = removeOutgoingConnections(partner, incomingConnectionsMap, outgoingConnectionsMap);
            if (success2 == false) {
                loadOCM(); // fix ocm
                return;
            }

            // then make new connections
            findAndMakeOutgoingConnections(partner, incomingConnectionsMap, outgoingConnectionsMap);
        }
    }

    if (debugMode) {
        aleiLog(logLevel.VERBOSE, "ocmHandleObjectUIDChange called");
        checkValidityForDebugging("ocmHandleObjectUIDChange");
    }
}

// should be called when properties except uid are set in object.pm
export function ocmHandleObjectParametersChange(object) {
    // first remove all existing outgoing connections
    const success = removeOutgoingConnections(object, incomingConnectionsMap, outgoingConnectionsMap);
    if (success == false) {
        loadOCM(); // fix ocm
        return;
    }

    // then make new connections
    findAndMakeOutgoingConnections(object, incomingConnectionsMap, outgoingConnectionsMap);

    if (debugMode) {
        aleiLog(logLevel.VERBOSE, "ocmHandleObjectParametersChange called");
        checkValidityForDebugging("ocmHandleObjectParametersChange");
    }
}

// clear ocm (when making a new map)
export function clearOCM() {
    outgoingConnectionsMap.clear();
    incomingConnectionsMap.clear();
}

function checkValidityForDebugging(source) {
    const validityData = validate();
    if (validityData.incoming.valid == false) {
        console.log(`ocm incoming map error (source: ${source})`);
        console.log("original incoming map:", validityData.incoming.originalMap);
        console.log("correct incoming map:", validityData.incoming.correctMap);
        incomingConnectionsMap = validityData.incoming.correctMap;
    }
    if (validityData.outgoing.valid == false) {
        console.log(`ocm outgoing map error (source: ${source})`);
        console.log("original outgoing map:", validityData.outgoing.originalMap);
        console.log("correct outgoing map:", validityData.outgoing.correctMap);
        outgoingConnectionsMap = validityData.outgoing.correctMap;
    }
    if (!validityData.incoming.valid || !validityData.outgoing.valid) {
        NewNote("ALEI: Please check console.", "#FFFF00");
        console.log("please report this problem to the ALEI developers.");
        console.log("it's safe to continue using ALEI as the effects of this problem were fixed automatically.");
    }
    return validityData.incoming.valid && validityData.outgoing.valid;
}

function validate() {
    const originalOutgoing = outgoingConnectionsMap;
    const originalIncoming = incomingConnectionsMap;
    loadOCM(); // i'm assuming loadOCM doesn't have any bugs
    const correctOutgoing = outgoingConnectionsMap;
    const correctIncoming = incomingConnectionsMap;

    // reset maps to what they were originally so that this function won't have side effects
    outgoingConnectionsMap = originalOutgoing;
    incomingConnectionsMap = originalIncoming;

    return {
        outgoing: {
            valid: areMapsIdentical(correctOutgoing, originalOutgoing),
            originalMap: originalOutgoing,
            correctMap: correctOutgoing
        },
        incoming: {
            valid: areMapsIdentical(correctIncoming, originalIncoming),
            originalMap: originalIncoming,
            correctMap: correctIncoming
        }
    };
}

// ocm maps are identical if they contain the same keys and the values contain the same objects (order doesn't matter)
function areMapsIdentical(map1, map2) {
    if (map1.size != map2.size) {
        return false; // number of keys isn't the same
    }

    for (let [key1, arr1] of map1.entries()) {
        let keyFound = false;
        for (let key2 of map2.keys()) {
            if (key1 === key2) {
                keyFound = true;
                let arr2 = map2.get(key2);

                // check if arrays contain the same objects
                if (arr1.length != arr2.length) {
                    return false; // different number of values for a specific key
                }
                for (let obj1 of arr1) {
                    let valueFound = false;
                    for (let obj2 of arr2) {
                        if (obj1 === obj2) {
                            valueFound = true;
                            break;
                        }
                    }
                    if (!valueFound) {
                        return false; // there is a value that isn't in both map's values list for a specific key
                    }
                }

                break;
            }
        }
        if (!keyFound) {
            return false; // there is a key that isn't in both maps
        }
    }

    return true;
}

// adding functions to window so they can be used in undo/redo
unsafeWindow.ocmHandleObjectUIDChange = ocmHandleObjectUIDChange;
unsafeWindow.ocmHandleObjectParametersChange = ocmHandleObjectParametersChange;

// console functions for debugging
unsafeWindow.getIncomingConnections = () => { return incomingConnectionsMap; };
unsafeWindow.getOutgoingConnections = () => { return outgoingConnectionsMap; };
unsafeWindow.validateOCM = () => { if (checkValidityForDebugging("console") === true) console.log("Both object connection maps are correct") };