import { aleiLog, logLevel } from "../log.js";
import { aleiSettings } from "../storage/settings.js";

export const ocmParamsToCheckPerClass = {
    player: ["incar", "ondeath"],
    enemy: ["incar", "ondeath"],
    lamp: [],
    gun: [],
    box: [],
    bg: ["a"],
    water: ["attach"],
    region: ["use_target", "attach"],
    pushf: ["attach"],
    door: ["attach"],
    timer: ["target"],
    decor: ["attach"],
    inf: [],
    song: ["callback"],
    image: [],
    vehicle: [],
    barrel: [],
    trigger: [
        ...Array.from({ length: 10 }, (_, i) => `actions_${i+1}_targetA`),
        ...Array.from({ length: 10 }, (_, i) => `actions_${i+1}_targetB`)
    ]
};

// returns false if there is an error
export function removeIncomingConnections(object, incomingConnectionsMap, outgoingConnectionsMap) {
    const connectionPartnersToRemove = incomingConnectionsMap.get(object);
    for (const partner of connectionPartnersToRemove) {
        const index = outgoingConnectionsMap.get(partner).indexOf(object);
        if (index == -1) {
            aleiLog(logLevel.DEBUG, "removeIncomingConnections error: ocm connections are not symmetrical");
            return false;
        }
        outgoingConnectionsMap.get(partner).splice(index, 1);
    }
    incomingConnectionsMap.set(object, []);
    return true;
}

export function findAndMakeIncomingConnections(object, incomingConnectionsMap, outgoingConnectionsMap) {
    for (const potential of es) {
        if (shouldConnectionExist(potential, object)) {
            outgoingConnectionsMap.get(potential).push(object);
            incomingConnectionsMap.get(object).push(potential);
        }
    }
}

// returns false if there is an error
export function removeOutgoingConnections(object, incomingConnectionsMap, outgoingConnectionsMap) {
    const connectionPartnersToRemove = outgoingConnectionsMap.get(object);
    for (const partner of connectionPartnersToRemove) {
        const index = incomingConnectionsMap.get(partner).indexOf(object);
        if (index == -1) {
            aleiLog(logLevel.DEBUG, "removeOutgoingConnections error: ocm connections are not symmetrical");
            return false;
        }
        incomingConnectionsMap.get(partner).splice(index, 1);
    }
    outgoingConnectionsMap.set(object, []);
    return true;
}

export function findAndMakeOutgoingConnections(object, incomingConnectionsMap, outgoingConnectionsMap) {
    for (const potential of es) {
        if (shouldConnectionExist(object, potential)) {
            outgoingConnectionsMap.get(object).push(potential);
            incomingConnectionsMap.get(potential).push(object);
        }
    }
}

export function initializeConnectionsForObjects(newObjects, incomingConnectionsMap, outgoingConnectionsMap) {
    // initialize all connections to empty array first to avoid errors
    for (const newObject of newObjects) {
        outgoingConnectionsMap.set(newObject, []);
        incomingConnectionsMap.set(newObject, []);
    }

    // find and make all connections
    // this makes sure not to consider any new object twice, as that would cause 2 connected objects within newObjects to get double 
    // connections, ex. incomingConnectionsMap.get(es[0]) == [es[1], es[1]] and outgoingConnectionsMap.get(es[1]) == [es[0], es[0]].
    // that problem is relevant when multiple objects are created through copy&paste
    for (const newObject of newObjects) {
        for (const potential of es) {
            // skip this one if potential is one of newObjects that was processed previously
            if (potential.connectionsAdded === true) {
                continue;
            }

            // outgoing connection
            if (shouldConnectionExist(newObject, potential)) {
                outgoingConnectionsMap.get(newObject).push(potential);
                incomingConnectionsMap.get(potential).push(newObject);
            }

            // incoming connection. avoid adding connection twice if object connects to itself
            if (potential !== newObject && shouldConnectionExist(potential, newObject)) {
                outgoingConnectionsMap.get(potential).push(newObject);
                incomingConnectionsMap.get(newObject).push(potential);
            }
        }
        newObject.connectionsAdded = true;
    }
    newObjects.forEach((newObject) => delete newObject.connectionsAdded);
}

/*
this doesn't work the same way as the original code in Render.
in the original code:
- shows green line (outgoing connection) if typeof fromvalue == "string" && fromvalue.length > 1 && fromvalue.charAt(0) == "#" && toObject.pm.uid == fromvalue (&& toObject.exists)
- shows white line (incoming connection) if tovalue == fromObject.pm.uid (&& toObject.exists)
with the original code, a decor named after a variable would draw a white line to all triggers where the variable is used, but those triggers would not draw a 
green line to the decor. the ocm depends on symmetry in the connections so this code works differently, which also means that trick no longer works.
additionally, this only checks the parameters that are relevant to connections and it doesn't consider if the object exists because it makes the ocm code simpler.
*/
export function shouldConnectionExist(fromObject, toObject) {
    const uid = toObject.pm.uid;
    if (uid === undefined) {
        return false;
    }
    
    // check params for uid
    for (let param of ocmParamsToCheckPerClass[fromObject._class]) {
        if (containsUID(fromObject.pm[param], uid)) {
            return true;
        }
    }

    // check additional params on extended triggers
    if (aleiSettings.extendedTriggers && fromObject._class == "trigger" && fromObject.pm.extended) {
        for (let i = 0; i < fromObject.pm.additionalActions.length; i++) {
            const paramA = fromObject.pm.additionalParamA[i];
            const paramB = fromObject.pm.additionalParamB[i];
            if (containsUID(paramA, uid) || containsUID(paramB, uid)) {
                return true;
            }
        }
    }

    return false;
}

function containsUID(paramValue, uid) {
    if (typeof paramValue !== "string") return false;
    // check each part separated by comma to support multiple parameters (#region*1, #region*2)
    for (const part of paramValue.split(", ")) {
        if (part == uid) {
            return true;
        }
    }
    return false;
}