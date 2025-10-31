import { readStorage } from "./storageutils.js";

function stringToBool(val) {
    return val === "true";
}

// backwards/forwards compatibility stuff
if (localStorage['RIGHT_PANEL_WIDTH'] != undefined) {
    localStorage["ALEI_RightPanelWidth"] = localStorage["RIGHT_PANEL_WIDTH"];
    localStorage.removeItem("RIGHT_PANEL_WIDTH");
}

// maps the keys of the settings to the respective storage keys
export const storageKeysMap = {
    logLevel: "ALEI_LogLevel",
    showTriggerIDs: "ALEI_ShowTriggerIDs",
    enableTooltips: "ALEI_ShowTooltips",
    showIDs: "ALEI_ShowIDs", // this setting isn't active
    showZIndex: "ALEI_ShowZIndex", // this setting isn't active
    showSameParameters: "ALEI_ShowSameParameters",
    gridBasedOnSnapping: "ALEI_gridBasedOnSnapping",
    renderObjectNames: "ALEI_RenderObjectNames",
    rematchUID: "ALEI_RemapUID",
    extendedTriggers: "ALEI_ExtendedTriggersEnabled",
    orderedNaming: "ALEI_orderedNaming",
    customRenderer: "ALEI_Renderer_Enabled",
    cartoonishEdges: "ALEI_Renderer_CartoonishEdges",
    originalSelectOverlay: "ALEI_Renderer_OriginalSelectOverlay",
    boxRendering: "ALEI_Renderer_PreviewWalls", 
    showTextPlaceholderDecors: "ALEI_Renderer_ShowTextPlaceholderDecors",
    html5Mode: "ALEI_HTML5Mode",
    renderSpawnAreas: "ALEI_Renderer_SpawnAreas",
    errorCheckOnSave: "ALEI_ErrorCheckOnSave",
    experimentalExtTriggers: "ALEI_ExperimentalExtTriggers",
};

// initialize settings
export const aleiSettings = {
    rightPanelSize:             readStorage("ALEI_RightPanelWidth",                     "30vw",         (val) => val),
    triggerEditTextSize:        readStorage("ALEI_EditTextSize",                        "12px",         (val) => val + "px"),
    starsImage:                 readStorage("ALEI_StarImage",                           "stars2.jpg",   (val) => val),
    logLevel:                   readStorage("ALEI_LogLevel",                            0,              parseInt),
    showTriggerIDs:             readStorage("ALEI_ShowTriggerIDs",                      false,          stringToBool),
    enableTooltips:             readStorage("ALEI_ShowTooltips",                        false,          stringToBool),
    showSameParameters:         readStorage("ALEI_ShowSameParameters",                  true ,          stringToBool),
    rematchUID:                 readStorage("ALEI_RemapUID",                            false,          stringToBool),
    //showIDs:                  readStorage("ALEI_ShowIDs",                             false,          stringToBool),
    //blackTheme:               readStorage("ALEI_BlackTheme",                          false,          stringToBool),
    gridBasedOnSnapping:        readStorage("ALEI_gridBasedOnSnapping",                 true,           stringToBool),
    //showZIndex:               readStorage("ALEI_ShowZIndex",                          false,          stringToBool),
    renderObjectNames:          readStorage("ALEI_RenderObjectNames",                   true,           stringToBool),
    //ocmEnabled:               readStorage("ALEI_OCMEnabled",                          false,          stringToBool),
    ocmEnabled:                 true,
    extendedTriggers:           readStorage("ALEI_ExtendedTriggersEnabled",             true,           stringToBool),
    customRenderer:             readStorage("ALEI_Renderer_Enabled",                    true,           stringToBool),
    orderedNaming:              readStorage("ALEI_orderedNaming",                       true,           stringToBool),
    cartoonishEdges:            readStorage("ALEI_Renderer_CartoonishEdges",            false,          stringToBool),
    originalSelectOverlay:      readStorage("ALEI_Renderer_OriginalSelectOverlay",      false,          stringToBool),
    boxRendering:               readStorage("ALEI_Renderer_PreviewWalls",               true,           stringToBool),
    showTextPlaceholderDecors:  readStorage("ALEI_Renderer_ShowTextPlaceholderDecors",  true,           stringToBool),
    html5Mode:                  readStorage("ALEI_HTML5Mode",                           true,           stringToBool),
    renderSpawnAreas:           readStorage("ALEI_Renderer_SpawnAreas",                 false,          stringToBool),
    errorCheckOnSave:           readStorage("ALEI_ErrorCheckOnSave",                    true,           stringToBool),
    experimentalExtTriggers:    readStorage("ALEI_ExperimentalExtTriggers",             false,           stringToBool),
};

aleiSettings.extendedTriggers = aleiSettings.experimentalExtTriggers;

// necessary cuz aleiSettings is used in some patches. also it's useful to be able to access it in console
unsafeWindow.aleiSettings = aleiSettings;