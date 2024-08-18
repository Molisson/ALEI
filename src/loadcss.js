// the order of these imports is significant. sorry.
// a style that overrides some default value should be imported after the thing with the default value
import "./static/themesvanilla.css";
import "./static/themesalei.css";
import "./static/themeoverrides.css";
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

export function fixWebpackStyleSheets() {
    for (let i = 0; i < document.styleSheets.length; i++) {
        if (document.styleSheets[i].title == webpackStylesheetName) {
            document.styleSheets[i].disabled = false;
        }
    }
}