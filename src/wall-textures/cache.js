import { runWallSegmentsAlgorithm } from "./segments.js";
import { getWallSegmentSprites } from "./sprites.js";

const cache = {
    segments: {
        data: {
            map: new Map(),
        },
        dirty: false,
        changedWalls: [], // unused
        watchedParams: new Set(["x", "y", "w", "h"]),
        updateFn: updateSegments,
    },
    sprites: {
        data: {
            map: new Map(),
        },
        dirty: false,
        changedWalls: [],
        watchedParams: new Set(["m"]),
        updateFn: updateSprites,
    },
};

export function get(key, wall) {
    return cache[key]?.data.map.get(wall) ?? null;
}

export function watchedParams(key) {
    return cache[key]?.watchedParams ?? new Set();
}

/**
 * @param {string} key 
 * @param {E[] | "*"} changedWalls 
 */
export function setDirty(key, changedWalls) {
    if (cache[key] !== undefined) {
        cache[key].dirty = true;
        if (changedWalls === "*") {
            cache[key].changedWalls = "*";
        }
        else if (cache[key].changedWalls !== "*") {
            cache[key].changedWalls.push(...changedWalls);
        }
        unsafeWindow.need_redraw = true;
    }
}
unsafeWindow.setWallTexturesCacheDirty = setDirty; // add to window so it can be used in undo/redo

/**
 * patches undo/redo to parse undo/redo eval strings and update the cache if relevant wall properties were changed.  
 * done this way because it's easier than modifying m_down, m_up, m_failed, and whatever.  
 * can't proxy entity.pm because pm is assigned in some parts of the code.  
 * doesn't check entity.exists because that's checked in the entity proxy.
 */
export function patchUndoRedo() {
    const regex = /es\[(?<index>\d+)\]\.pm\.(?<prop>[xywhm])\s*=/g;

    function checkEvalString(evalStr) {
        const matches = [...evalStr.matchAll(regex)];
        const wallMatches = matches.filter(m => es[m.groups.index]?._class === "box");
        const causesSegmentsUpdate = wallMatches.filter(m => m.groups.prop !== "m");
        if (causesSegmentsUpdate.length > 0) {
            setDirty("segments", causesSegmentsUpdate.map(m => es[m.groups.index]));
        }
        else {
            const causesSpritesUpdate = wallMatches.filter(m => m.groups.prop === "m");
            if (causesSpritesUpdate.length > 0) {
                setDirty("sprites", causesSpritesUpdate.map(m => es[m.groups.index]));
            }
        }
    }

    unsafeWindow.DO_UNDO = ((old) => {
        return function DO_UNDO() {
            if (ActionCurrent < ActionArray.length) {
                checkEvalString(ActionArray[ActionCurrent].undo);
            }
            old.call(this);
        };
    })(unsafeWindow.DO_UNDO);

    unsafeWindow.DO_REDO = ((old) => {
        return function DO_REDO() {
            if (ActionCurrent > 0) {
                checkEvalString(ActionArray[ActionCurrent - 1].redo);
            }
            old.call(this);
        };
    })(unsafeWindow.DO_REDO);
}

export function updateIfNecessary() {
    if (cache.segments.dirty) {
        cache.segments.updateFn(cache.segments.data, cache.segments.changedWalls);
        cache.sprites.dirty = true;
        cache.sprites.changedWalls = "*";
        cache.segments.dirty = false;
        cache.segments.changedWalls = [];
    }
    if (cache.sprites.dirty) {
        cache.sprites.updateFn(cache.sprites.data, cache.sprites.changedWalls);
        cache.sprites.dirty = false;
        cache.sprites.changedWalls = [];
    }
}

function updateSegments(data, changedWalls) {
    const walls = es.filter(e => e._class === "box" && e.exists);
    data.map.clear();
    for (const [wall, sides] of runWallSegmentsAlgorithm(walls).entries()) {
        data.map.set(wall, sides);
    }
}

function updateSprites(data, changedWalls) {
    let wallsToUpdate;
    if (changedWalls === "*") {
        wallsToUpdate = es.filter(e => e._class === "box" && e.exists);
    }
    else {
        wallsToUpdate = changedWalls;
    }
    for (const wall of wallsToUpdate) {
        const segments = get("segments", wall);
        if (segments === null) {
            data.map.delete(wall);
        }
        else {
            const topSprites = [];
            for (const segment of segments.top) {
                for (const sprite of getWallSegmentSprites(segment, wall.pm.m, "top")) {
                    sprite.x += segment.start;
                    sprite.y += wall.pm.y;
                    topSprites.push(sprite);
                }
            }
            const bottomSprites = [];
            for (const segment of segments.bottom) {
                for (const sprite of getWallSegmentSprites(segment, wall.pm.m, "bottom")) {
                    sprite.x += segment.start;
                    sprite.y += wall.pm.y + wall.pm.h;
                    bottomSprites.push(sprite);
                }
            }
            data.map.set(wall, { top: topSprites, bottom: bottomSprites });
        }
    }
}