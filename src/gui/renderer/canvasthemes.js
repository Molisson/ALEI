/**
 * creates the canvas theme map for blue theme and applies any overwrites that a theme may have. returns the result.
 */
function createCanvasThemeMap(overwrites={}) {
    const canvasTheme = {
        // Grid colors.
        backgroundColor: "#5880AB",
        gridColor: "#FFFFFF",
        // Object select colors.
        selectOutlineColor: "#A5A500",
        selectEdgeOpacityFactor: 1,
        selectTextColor: "#FF0",
        // Selection area colors.
        selectionColor: "#FFF",
        selectionCtrlColor: "#AFA",
        selectionAltColor: "#FAA",
        selectionOpacity: 0.1, // Note that this and below is NOT opacity FACTOR
        selectionEdgeOpacity: 0.8,
        // Highlighted object edge color. (When included in selection area). undefined means to use selgrd3 (dotted line)
        highLightedObjEdgeColor: undefined, // NOTE: #FFFF00 seems nice. Bright but it is clearly noticeable.
        highLightedObjEdgeOpacity: 1,
        // Object connection line.
        objectConnectionDash: [4, 4],
        objectConnectionOutgoingColor: "#66ff66", // old name objectConnectionToColor
        objectConnectionIncomingColor: "#ffffff", // old name objectConnectionFromColor
        objectConnectionOpacityFactor: 1, // TODO: Should this just be "opacity" and not "opacity factor"?
        objectColors: {
            box: {col: "#FFF", edgeCol: "#FFF"},
            door: {col: "#000", edgeCol: "#000", invisibleOpacityFactor: 0.05},
            water: {
                col: "#3592B9", edgeCol: "#91EAFF", opacityFactor: 0.24,
                acidCol: "#BBFB59", acidEdgeCol: "#91EAFF", acidOpacityFactor: 0.81
            },
            pushf: {col: "#2BFF40", edgeCol: "#3CFF4F"},
            region: {col: "#FFD52B", edgeCol: "#FFB03C", edgeOpacityFactor: 0.5, buttonOpacityFactor: 0.5},
            bg: {col: "#000", edgeCol: "#910000", edgeOpacityFactor: 0.3, coloredOpacityFactor: 0.22}
        },
    };

    /** checks if an object is a Plain Old Javascript Object */
    const isPlainObject = (obj) => obj !== null && typeof obj === "object" && Object.getPrototypeOf(obj) === Object.prototype;

    function deepMerge(target, source) {
        for (const key in source) {
            if (isPlainObject(target[key]) && isPlainObject(source[key])) {
                deepMerge(target[key], source[key]);
            }
            else {
                target[key] = source[key];
            }
        }
    }

    // apply overwrites
    deepMerge(canvasTheme, overwrites);

    return canvasTheme;
}

export const canvasThemes = {
    0: createCanvasThemeMap(), // THEME_BLUE
    1: createCanvasThemeMap({ // THEME_DARK
        backgroundColor: "#222222",
        gridColor: "#888888",
        selectOutlineColor: "#FFFF00",
    }),
    2: createCanvasThemeMap({ // THEME_PURPLE
        backgroundColor: "#222222",
        gridColor: "#888888",
        selectOutlineColor: "#FFFF00",
    }),
    3: createCanvasThemeMap({ // THEME_GREEN
        backgroundColor: "#222222",
        gridColor: "#888888",
        selectOutlineColor: "#FFFF00",
    }),
    4: createCanvasThemeMap({ // ALEI Black Theme
        backgroundColor: "#161616",
        gridColor: "#FFFFFFA0",
        selectOutlineColor: "#FFE554",
        selectTextColor: "#FFE554",
        objectColors: {
            box: {col: "#FFF", edgeCol: "#FFF"},
            door: {col: "#000", edgeCol: "#000", invisibleOpacityFactor: 0.05},
            water: {
                col: "#3592B9", edgeCol: "#91EAFF", opacityFactor: 0.24,
                acidCol: "#BBFB59", acidEdgeCol: "#91EAFF", acidOpacityFactor: 0.81
            },
            pushf: {col: "#2BFF40", edgeCol: "#3CFF4F"},
            region: {col: "#FFD52B", edgeCol: "#FFB03C", edgeOpacityFactor: 0.5, buttonOpacityFactor: 0.5},
            bg: {col: "#000", edgeCol: "#910000", edgeOpacityFactor: 0.6, coloredOpacityFactor: 0.22}
        },
    }),
    5: createCanvasThemeMap({ // ALEI Sage Theme
        backgroundColor: "#161616",
        gridColor: "#FFFFFFA0",
        selectOutlineColor: "#FFE554",
        selectTextColor: "#FFE554",
        objectColors: {
            box: {col: "#FFF", edgeCol: "#FFF"},
            door: {col: "#000", edgeCol: "#000", invisibleOpacityFactor: 0.05},
            water: {
                col: "#3592B9", edgeCol: "#91EAFF", opacityFactor: 0.24,
                acidCol: "#BBFB59", acidEdgeCol: "#91EAFF", acidOpacityFactor: 0.81
            },
            pushf: {col: "#2BFF40", edgeCol: "#3CFF4F"},
            region: {col: "#FFD52B", edgeCol: "#FFB03C", edgeOpacityFactor: 0.5, buttonOpacityFactor: 0.5},
            bg: {col: "#000", edgeCol: "#910000", edgeOpacityFactor: 0.6, coloredOpacityFactor: 0.22}
        },
    }),
    6: createCanvasThemeMap({ // ALEI OEDA Theme
        backgroundColor: "#161616",
        gridColor: "#FFFFFFA0",
        selectOutlineColor: "#FFE554",
        selectTextColor: "#FFE554",
        objectColors: {
            box: {col: "#FFF", edgeCol: "#FFF"},
            door: {col: "#000", edgeCol: "#000", invisibleOpacityFactor: 0.05},
            water: {
                col: "#3592B9", edgeCol: "#91EAFF", opacityFactor: 0.24,
                acidCol: "#BBFB59", acidEdgeCol: "#91EAFF", acidOpacityFactor: 0.81
            },
            pushf: {col: "#2BFF40", edgeCol: "#3CFF4F"},
            region: {col: "#FFD52B", edgeCol: "#FFB03C", edgeOpacityFactor: 0.5, buttonOpacityFactor: 0.5},
            bg: {col: "#000", edgeCol:"#910000", edgeOpacityFactor: 0.6, coloredOpacityFactor: 0.22}
        },
    }),
    7: createCanvasThemeMap({ // ALEI Crossfire Theme
        backgroundColor: "#2A2F33",
        gridColor: "#FFFFFFA0",
        selectOutlineColor: "#FFE554",
        selectTextColor: "#FFE554",
    }),
};

/**
 * sets highLightedObjEdgeColor of each theme in canvasThemes that should use selgrd3 to selgrd3. they have to be set like this because selgrd3 is undefined at first.  
 * it's assumed that the theme should use selgrd3 if highLightedObjEdgeColor is undefined
 */
export function setHighLightedObjEdgeColors() {
    const ready = () => {
        for (const theme in canvasThemes) {
            if (canvasThemes[theme].highLightedObjEdgeColor === undefined) {
                canvasThemes[theme].highLightedObjEdgeColor = unsafeWindow.selgrd3;
            }
        }
    };

    if (unsafeWindow.selgrd3 instanceof CanvasPattern) {
        ready();
    }
    else {
        const originalOnLoad = unsafeWindow.img_slct3.onload;
        unsafeWindow.img_slct3.onload = () => {
            originalOnLoad();
            ready();
        };
    }
}