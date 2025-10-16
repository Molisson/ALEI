import { addEntitiesToUIDMap } from "./uidmap.js";
import { addEntitiesToParameterMap } from "./parametermap.js";
import { ocmHandleEntitiesCreation } from "../ocm/ocm.js";
import { aleiSettings } from "../storage/settings.js";
import * as wallTextures from "../wall-textures/wall-textures.js";
import { aleiLog, logLevel } from "../log.js";
import * as spawnAreas from "../spawn-areas.js";
import { html5ModeActive } from "../html5mode.js";

export function onEntitiesCreated(newEntities) {
    addEntitiesToUIDMap(newEntities);
    addEntitiesToParameterMap(newEntities);
    if (aleiSettings.ocmEnabled) ocmHandleEntitiesCreation(newEntities);
    if (aleiSettings.renderSpawnAreas && newEntities.some(entity => spawnAreas.classes.has(entity._class))) spawnAreas.scheduleUpdate();
    if (newEntities.some(e => e._class === "box")) wallTextures.setDirty(); 
}

export let SelectedObjects = [];
unsafeWindow.getSelectedObjects = () => { return SelectedObjects; };

export function clearSelectedObjects() {
    SelectedObjects = [];
}

export function patchEntityClass() {
    let og_E = unsafeWindow.E;
    unsafeWindow.E = function(_class) {
        let result = new og_E(_class);

        // Adding property.
        if(_class == "water") result.pm.attach = -1;
        else if(_class == "decor") result.pm.text = "Hello World!";
        else if(_class == "trigger") {
            let entries = Object.entries(result.pm);
            entries.splice(5, 0, ["execute", false]);
            result.pm = Object.fromEntries(entries);
        }
        else if(_class == "region") result.pm.uses_timer = false;
        else if(_class == "door" && html5ModeActive) {
            result.pm.mute = false;
        }

        result.fixWidths = (function(old) {
            return function() {
                old.call(this);
                if (spawnAreas.classes.has(this._class)) spawnAreas.scheduleUpdate();
                if (this._class === "box") wallTextures.setDirty(); 
            }
        })(result.fixWidths);

        result.Remove = () => { // Better be safe...
            NewNote(`ALEI: This absolutely should not happen, please report to ALEI developers, error: E.Remove got called when it shouldn't be`, `#FF0000`);
            debugger;
        };

        let proxy = new Proxy(result, {
            set: function(target, key, value, receiver) {
                if (key == "selected") {
                    const oldValue = target.selected;
                    if ((value && !oldValue)) {
                        SelectedObjects.push(receiver);
                    } else if (!value && oldValue) {
                        SelectedObjects.splice(SelectedObjects.indexOf(receiver), 1);
                    }
                }

                if (key === "exists") {
                    const oldValue = target.exists;
                    if (value !== oldValue) {
                        if (aleiSettings.renderSpawnAreas && spawnAreas.classes.has(target._class)) {
                            spawnAreas.scheduleUpdate();
                        }
                        if (target._class === "box") wallTextures.setDirty(); 
                    }
                }

                return Reflect.set(target, key, value, receiver);
            }
        });
        return proxy;
    }
    aleiLog(logLevel.DEBUG, "Patched entity.");
}