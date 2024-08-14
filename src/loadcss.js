// the order of these imports is significant. sorry.
// a style that overrides some default value should be imported after the thing with the default value
import "./static/themes.css";
import "./static/paramsidebuttons.css";
import "./static/overridestyles.css";
import "./static/aleistyles.css";
import "./static/comments.css";

/*
for some reason the vanilla ThemeSet function does this:
"
for (var i = 1; i < document.styleSheets.length - 1; i++)
    document.styleSheets[i].disabled = true;
"
I have no idea why that exists but it breaks webpack's stylesheets because they get disabled.
fixWebpackStyleSheets fixes that.
*/

const webpackStylesheetName = "style-from-webpack";

const themes = {
    0: "blue-theme",
    1: "dark-theme",
    2: "purple-theme",
    3: "green-theme",
    4: "alei-dark-theme",
}

export function patchThemeSet() {
    const origThemeSet = unsafeWindow.ThemeSet;

    unsafeWindow.ThemeSet = function(value) {
        const oldTheme = themes[THEME];
        const newTheme = themes[value];
        document.body.classList.remove(oldTheme);
        document.body.classList.add(newTheme);
        //console.log("changed theme: " + oldTheme + " -> " + newTheme);

        origThemeSet(value);
    }
}

export function fixWebpackStyleSheets() {
    for (let i = 0; i < document.styleSheets.length; i++) {
        if (document.styleSheets[i].title == webpackStylesheetName) {
            document.styleSheets[i].disabled = false;
        }
    }
    fixBullshitInThemeSet();
}

function fixBullshitInThemeSet() {
    let oldCodeSnippet = "document.styleSheets[ i ].disabled = \ntrue;";
    let newCodeSnippet = `if (document.styleSheets[i].title != "${webpackStylesheetName}") { ` + 
                            "document.styleSheets[i].disabled = true; " + 
                         "}";
    let code = unsafeWindow.ThemeSet.toString().replace(oldCodeSnippet, newCodeSnippet);
    code = "(" + code + ")";
    unsafeWindow.ThemeSet = eval(code);
}