const themes = {
    0: "blue-theme",
    1: "dark-theme",
    2: "purple-theme",
    3: "green-theme",
    4: "alei-dark-theme",
}

const themeNames = {
    0: "Blue",
    1: "Dark",
    2: "Purple",
    3: "Green",
    4: "Black",
};

const aleiThemesCount = 1;

export function replaceThemeSet() {
    function AleiThemeSet(value) {
        const oldTheme = themes[THEME];
        const newTheme = themes[value];
        document.body.classList.remove(oldTheme);
        document.body.classList.add(newTheme);
        //console.log("changed theme: " + oldTheme + " -> " + newTheme);
        
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
        console.warn("SaveBrowserSettings direct code replacement failed");
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

export function addAleiThemeButtons() {
    const greenThemeButton = document.querySelector('a[onmousedown="ThemeSet(THEME_GREEN);');
    const toolsBox = greenThemeButton.parentElement;
    const elementAtEnd = greenThemeButton.nextElementSibling;

    let buttonsAdded = 0;

    for (let themeNum = 4; themeNum < 4 + aleiThemesCount; themeNum++) {
        if (buttonsAdded % 2 == 0) {
            const sep = document.createElement("br");
            toolsBox.insertBefore(sep, elementAtEnd);
        }

        const newButton = document.createElement("a");
        if (themeNum != THEME) {
            newButton.className = "tool_btn tool_wid";
        }
        else {
            newButton.className = "tool_btn2 tool_wid";
        }
        newButton.setAttribute("onmousedown", `ThemeSet(${themeNum});`);
        newButton.style.width = "32px";
        newButton.textContent = themeNames[themeNum];
        toolsBox.insertBefore(newButton, elementAtEnd);

        buttonsAdded++;
    }
}

function storeAleiTheme(theme) {
    try {
        localStorage.setItem("ALEI_Theme", theme);
    } catch (e) {}
}

function takeAleiThemeFromStorage() {
    try {
        const aleiTheme = parseInt(localStorage.getItem("ALEI_Theme"));
        return Number.isNaN(aleiTheme) ? null : aleiTheme;
    } catch (e) {
        return null;
    }
}