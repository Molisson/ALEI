import { aleiLog, logLevel } from "./log.js";
import { readStorage, writeStorage } from "./storage/storageutils.js";

const themes = {
    0: "blue-theme",
    1: "dark-theme",
    2: "purple-theme",
    3: "green-theme",
    4: "alei-dark-theme",
}

export const themeNames = {
    0: "Blue",
    1: "Dark",
    2: "Purple",
    3: "Green",
    4: "Black",
};

export const aleiThemesCount = 1;

export function replaceThemeSet() {
    function AleiThemeSet(value) {
        const oldTheme = themes[THEME];
        const newTheme = themes[value];
        document.body.classList.remove(oldTheme);
        document.body.classList.add(newTheme);
        //aleiLog(logLevel.DEBUG, "Changed theme: " + oldTheme + " -> " + newTheme);
        
        THEME = value;
        need_redraw = true;
        UpdateTools();
        
        // put theme into vanilla localStorage
        // if this is an alei theme, blue theme will be put instead
        // requires SaveBrowserSettings to be patched first
        SaveBrowserSettings();

        // put theme into alei localStorage
        storeAleiTheme(value);
    }

    unsafeWindow.ThemeSet = AleiThemeSet;
}

export function patchSaveBrowserSettings() {
    const originalCode = unsafeWindow.SaveBrowserSettings.toString();
    const newCode = originalCode.replace(
        /localStorage\.setItem\(\s*([\w]+)\s*,\s*THEME\s*\)\s*;/,
        "localStorage.setItem($1, THEME); if (THEME > 3) { localStorage.setItem($1, 0 ); }"
    );
    if (originalCode === newCode) {
        aleiLog(logLevel.WARN, "SaveBrowserSettings direct code replacement failed (themes)");
    }
    else {
        unsafeWindow.SaveBrowserSettings = eval(`(${newCode})`);
    }
}

export function initTheme() {
    // vanilla ale code will call the original ThemeSet before it can be replaced. if dark theme is used and it does that, 
    // it will add a stylesheet to document.adoptedStyleSheets that messes up everything
    document.adoptedStyleSheets = [];

    const aleiTheme = takeAleiThemeFromStorage();
    if (aleiTheme !== null) {
        THEME = aleiTheme;
    }
    
    ThemeSet(THEME);
}

function storeAleiTheme(theme) {
    writeStorage("ALEI_Theme", theme);
}

function takeAleiThemeFromStorage() {
    return readStorage("ALEI_Theme", null, parseInt);
}