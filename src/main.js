import { getALEIMapDataFromALEIMapDataObject, loadALEIMapDataIntoUse, initializeALEIMapData } from "./aleimapdata/aleimapdata.js";
import * as aleimapdatapatches from "./aleimapdata/aleimapdatapatches.js";

import { onEntitiesCreated, patchEntityClass, SelectedObjects, clearSelectedObjects } from "./entity/entity.js";
import { patchUpdatePhysicalParam, updateParameters, assignObjectIDs, assignObjectPriority } from "./entity/parameter.js";
import { loadParameterMap, parameterMapHandleParametersRemoval, clearParameterMap } from "./entity/parametermap.js";
import { replaceParamValueUID } from "./entity/parameterutils.js";
import { loadUIDMap, clearUIDMap } from "./entity/uidmap.js";

import "./gui/colorpicker/colorwindow.js";
import { registerOpenInColorEditorButton } from "./gui/colorpicker/opencoloreditorbutton.js";
import { fixWebpackStyleSheets } from "./gui/css/loadcss.js";
import { replaceThemeSet, patchSaveBrowserSettings, initTheme } from "./gui/css/themes.js";
import { patchFindErrorsButton, addErrorCheckingToSave } from "./gui/finderrors/finderrors.js";
import { registerCommentAdderButton, registerCommentRemoverButton } from "./gui/paramsgui/comments/commentbuttons.js";
import { patchParamsGUI } from "./gui/paramsgui/paramsgui.js";
import { Renderer_initialize } from "./gui/renderer/renderer.js";
import { patchTriggerActionList, patchMaskTriggerActions } from "./gui/actionlist.js";
import "./gui/draggablewindow.js";
import { createALEISettingsMenu, showSettings } from "./gui/settingsmenu.js";
import { patchUpdateTools } from "./gui/toolbar.js";
import { patchTopPanel, addTopButton } from "./gui/topgui.js";

import { loadOCM, clearOCM, ocmHandleEntityParametersChange } from "./ocm/ocm.js";

import { aleiSettings } from "./storage/settings.js";
import { readStorage, writeStorage } from "./storage/storageutils.js";

import { patchForInteractableTriggerActions } from "./triggeractions/interactability.js";

import * as wallTextures from "./wall-textures/wall-textures.js";

import { parse as alescriptParse } from "./alescript.js";
import { activateHTML5Mode, html5ModeActive, aleiExtendedTriggerActionLimit } from "./html5mode.js";
import { aleiLog, logLevel, ANSI_RESET, ANSI_YELLOW } from "./log.js";
import { checkForUpdates } from "./updates.js";

import { getCustomCharImage } from "./skin-preview.js";
import * as spawnAreas from "./spawn-areas.js";

import { parseAllExtendedTriggers } from "./extended-triggers/parse-ext.js";
import { compileAllExtendedTriggers } from "./extended-triggers/compile-ext.js";

"use strict";

document.fonts.load( "16px EuropeExt Regular" );
document.fonts.load( "16px DejaVu Sans Mono" );
document.fonts.load( "16px JetBrains Mono Italic" );

let window = unsafeWindow;
let isNative;
try {
    GM_info
    isNative = true;
    window["nativeALEIRunning"] = true;
} catch (e) {
    isNative = false
};

if(!isNative && (window["nativeALEIRunning"] == true)) {
    Hello_IgnoreThisError_ItIsIntentional // hope this is not defined
}

// Shorthand things
function $id(id) {
    return document.getElementById(id);
}
function $query(selector) {
    return document.querySelector(selector);
}

let ROOT_ELEMENT = document.documentElement;
let stylesheets = document.styleSheets;
let VAL_TABLE = {}; // Will be filled later.
window.ExtendedTriggersLoaded = false;

const TEXT_OVERHEAD         = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAAYCAYAAAAxkDmIAAAAAXNSR0IArs4c6QAABHNJREFUaEPtmVvoZWMYxn+PMznEBSGlxAVuJKUcQyTHUCahEZNG43wYx8HIMIjJjPk3MimD0EyMQ0oRrpxKkblwKBdDcoFBktNrPbt3a82atfde/zV/snfru137W+v93ud5n/d5vy26NdEZ0ESfrjscHcATToIO4A7gCc/AhB+vtoIj4gLgEeA9SScMy0FEHAc8AWyQdNB08xURnwC7ABcCezf97qjvRMROwFvAvsA8SU9X90TEAcCLwP7Ao5Lm1r23+J33ngNMSbpy1LfbPC/nQdIbo95RydvSfg6reycWYCcoIh4ArgBWSzqvBuCbgNuAbYHPgNOL331a/l1EHA48A2wHXCTp1VHJb/O8A7hF1iLiZOBx4CfglBrw3i7AP7h49j5wFHCXpHsqAJsEC4rnr0s6tUUYjbaMDcARcQZwJ2C53qpyuj+BLzKRT2aVDZToiDgQuA84Btix8q5I4F4C5koyiJusiHgZOB5YWAYvIk4DHgM+LyT6KWAx8G61JRUtyCQ4BJgPvNk0HuDMbDd/pUJYAfpraB4ssxFxTXG+a4E9i3xWlXZDcZ4tgB+ztbWW6I+KD6wYQcFdAbP8O+BiwP1qB+AWSSsr1eDndwO/AbPzIMMAdn88EVhl0kha339fSuf9gCV0haR5AwC+LMH7sPje0aX9U5ZcYEnG5H69V1mGI8KyvqyI9cskmYnQKB6TJQHeOlVkvkmY3sDgXQ18ayJIWlfpqbvn3l+A6yW5RfRWkt45NEG/2VyAbVSarnXAswV4NwMvSJo1IOEO1uxeJGnhIJOVpHkO+KNOXvOw/SpcL+nQAd/bxGyVzJWrapakdyLiXuAqg9E3W2muzi4MzEPAGqBxPEkcG9WPJR1RjS2V5VjgRknLKnk4C5gDLJV0Xc1em8NXCuJuv7kAT8tFZxIsZduMYIUreLGkBUMAXjTKnTd18AmeK2aNzVZE3FDEd0cSsWe+SmbqV5stYLc0V35sslqVhk4L5XgKU2bCDJxEImI2YEVZK2ltJQ+OyZNML0cDiFtWvtYS3RbgVYWcXtKk9P8jgPtO+HerAfBgSq5lc3lJ/tyve1UFuPLtsK1GJsXIcXA6ANdUZRmw/y3ATST69uwfKyVN/dsSXQLP3sCtwYCeD3xtkMvmLCL6/dr9eOd02L0ZOiIOaynRI4skFaQM8LnpDx5uKNG+q7DCLK9OCjM6BwPuFx5LvOpM1knuKyl/cyQ9P+yiIyJssjzqrE6zUTZZdtg2QB5vBpqsEsB9w2RXa0e+RJIr9Z9VuhzxxceWwAcVY9Y4npLJagPwfunWf25ostyL7Sdeq04TMwqwb7LS3l8O7JNJ2iiHwPd5I3RrDXM3uslKx2iDc2QytPquHwCPSa6y2jGpAqBHHhPiK5uTuhujvBzxbZXNXXW0MqkaxVMak6YNcE4X9giXFrnaY8bHpCa9s/vNeGSg+zdpPHBqHWUHcOvUjcfGDuDxwKl1lB3ArVM3Hhs7gMcDp9ZRdgC3Tt14bOwAHg+cWkf5N7oPsDdbjPHbAAAAAElFTkSuQmCC";
const TEXT_SCORE            = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHwAAAAYCAYAAAA4e5nyAAAAAXNSR0IArs4c6QAAA0hJREFUaEPtmbuvTUEUxn/TiAbREUElEXqJQiIoNKIRhYQGlUY0HoVCpxGNaFC4EYmKRhQehUShFaKg9AeIimac2Zk5WXfOmsfeZ3Ozc+d29+6ZWbO+bz2+NdfQftYVAmZdeducpRG+zoKgEd4IB2vtWeAe8MwYc0FiYq19DRwALhljVkp4ibM2ibUPlXMfAOfFml+1Nkp30L5ba28BV4H3xphj8RrxfSW+6xB7YY/H76g44wdwzhjztnSutfYI8Bj4aYzZH/ESOPuo+RPWqhk+JuHRpQLIWRD7BlUJqAThWYCstS4A3ZrbxpibQ2yU9lhrPwNbGuE9q0gJ2AThyWxx6xvhHjUt+5Sy/UfLjNoyWZPhPjv2CTK/xGWuFAgyw4AzvqW8cSUx4afLyKxN6SNwUKzvzo0qXjbDFVw/ALvXtKRrvdCDdSgmfSzCPVE7Q48Xvc3hWdUPfRY7PbLX7QFuzPq5661d4MTlttam8NFpkOeh/1trn860z0upe3IlXevXIsgXglsEx1I9XAotGZydoAKc4FgQESlxMQbhqTNqz44yzPXp096Xa8BGYDNwBXC/48lXtYdmU/ztW6niFAhf0BC5s8ciPKvSPXg5Nd9lT1CgtaTkSrrvrR1JUbZUqVRFRF4GHgEngHfASeAJcAr46sv7PDBKNmt99BUmWdI9BjF+OZUevnV3TrWzpVT6DJg9frTZkDCwauSoBaNAuDoWiqqSdVgZZe4AL4DjwHWf2d+Bw2EsTd1Hs1nrYwXhC8FQGMsC4a9yY+SyhLt7qxmeUMZLj2UjZ3ioCp+AbbMWddH38q2zrN8F3HcjWR+bIxI+1xeiQmYni5JI7VpUYUYtlfTQw6uyKjffp3pr/Lgzcg8PAO4QYi2Ub3elu57wIT28+GCjle2AgzYW9tEH/6SkOzJSL1beme1SuORKktJb3SuYClqtYq6JeKF8u9c/4c9vqRNqbfbM8OTjzlqp9Kqn1cTzqToXC0BC31+YT8XIFJ4gF+b6MeZwYWc+QuZGvBqbfQgXfTzM9quek//bHF6TGW3NNBFo/y2bJm+Db90IHwzdNDc2wqfJ2+BbN8IHQzfNjY3wafI2+NaN8MHQTXNjI3yavA2+9V/XCzNGz/W2wgAAAABJRU5ErkJggg==";
const TEXT_CHAT             = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAG4AAAAYCAYAAAAbIMgnAAAAAXNSR0IArs4c6QAAAwZJREFUaEPtma+OFEEQxn9tQKFwoDHwBKAIkPACCAwYcCgUYBAYcgpBCIYz8BKQcARCwhuAxIHDgALTXE26J7W11bM9dzObm0uvup0/W9Xf1/XVV32B9lkkAmGRWbekacQtdBNslbgY4xPgAXAC+BZCuBBjfA9cTfjthhDuLhTLPu0Y41fgPPAP2AkhPPbWpJ77A9wLIbypXbtLXIzxCvAaOGuDm3ujAs5NnAJC1t9vghjjK+BOAuUHcDuE8OEwaxkC+KDEAZKbi7uNd9yI0wTthRCuyYJNVfebLcZ4C3gBnEqgdYTW7vrSc424kQh6FZ2Iy9IlX3v5Ms/3RI8Mu/b4QYkTqax9d9KKMzs4L6jrZQnA6h5X+K1e5go9Q0t892yS+1xV+bWOJCOhWlp1JeZ3VmIbgF8CN1KsXeCi1+OMlOslaBWo6o+TEad2ryS0A3xUep1BvFxjTkwldIAquRvsq7bhA+dSzL/A7wRuNkZrINXGHiDBJc4zIhuuDRqbGuKGlKMD0TRVXWG658iCflYSlwEt9aM+hk3OVlG6L8ZENs9n4Gb6+xHwNBGpDUtV7CFJs/dSDtlN697rxVq75hFQQ9wK854TU7tabL5OTEvjHvBlE3HAJ88wmLhFybR9Ky1axg0dX6rvGXA/GZNcga5Z8WIDz0uW3yHukjfy1FbhtogrVeiUxBXl0oD8fb+qTqrekzeFXHsHXE8zZZbjGuKyyjycibg81w62hFkrzpGxjebksBVnXKQsXkjq+q4MwmqX/9qvmtPGZdYQl/v1XBW3VeL04FgrY8WTk4KEaFCLPc6Z2+SS7pX6pEbuldziYH8d2ePOqAMA7V6r+tlsUpnmj9Lwmy362xHmRFfmKFfpjB1yqWSYVu457xZjjyTOc9hyKpXHFM/kSTrFI8BJpDKfsZn+YjdKtatMAG6cpUrN1JkBtWGyv7sGTs0MOYa4JNE2rpCVx5NpiBvy/+3e0UBgq/8dOBpLPh5ZNOIWymMjrhG3UAQWmnaruEbcQhFYaNqt4hZK3H+hgmxGYcqn0gAAAABJRU5ErkJggg==";

aleiLog(logLevel.INFO, "Starting up...");

// Original functions, globally saved here if needed
// JS_ prefix for JavaScript ones, ALE_ for ALE ones
let JS_setTimeout = window.setTimeout;
let JS_eval = window.eval;
let ALE_Render;

let aleiSessionID = null; // ID of this session
let aleiSessionList = []; // Set of known session IDs

function updateSounds() {
    // Adds sounds that exist in game but not in ALE
    let SVTS = VAL_TABLE["sound"];
    SVTS['am_base'] = 'Indoor Ambience';
    SVTS['am_wind'] = 'Outdoor Ambience';
    SVTS['android2_die'] = 'DT-148 - Death';
    SVTS['android2_hurt'] = 'DT-148 - Hurt';
    SVTS['android2_welcome2'] = 'DT-148 - Alerted';
    SVTS['arrin_death1'] = 'Arrin - Death';
    SVTS['arrin_dying'] = 'Arrin - Dying';
    SVTS['arrin_hurt1'] = 'Arrin - Hurt 1';
    SVTS['arrin_hurt2'] = 'Arrin - Hurt 2';
    SVTS['arrin_welcome1'] = 'Arrin - Alerted 1';
    SVTS['arrin_welcome2'] = 'Arrin - Alerted 2';
    SVTS['arrin_welcome3'] = 'Arrin - Alerted 3';
    SVTS['bounce_bullet'] = 'Falkonian PSI Cutter - Shot Bounce';
    SVTS['dart4'] = 'Medic Pistol';
    SVTS['exp_event_stop'] = 'EXP - Stop';
    SVTS['exp_level'] = 'EXP - Level Up';
    SVTS['exp_tick'] = 'EXP - Gain';
    SVTS['gameplay_song'] = 'Katharsys - Erges';
    SVTS['gravitator2'] = 'Floor gravitator noice';
    SVTS['helm_proxy_alert_over_hereB'] = 'Proxy - Over here!';
    SVTS['helm_proxy_alert_take_coverB'] = 'Proxy - Take cover!';
    SVTS['helm_proxy_alert_up_thereA'] = 'Proxy - Up there!';
    SVTS['helm_proxy_death3'] = 'Proxy - Death 1';
    SVTS['helm_proxy_death4'] = 'Proxy - Death 2';
    SVTS['helm_proxy_death5'] = 'Proxy - Death 3';
    SVTS['helm_proxy_death6'] = 'Proxy - Death 4';
    SVTS['helm_proxy_dyingC'] = 'Proxy - Help! 1';
    SVTS['helm_proxy_dyingF'] = 'Proxy - Help! 2';
    SVTS['helm_proxy_enemy_down_fantasticA'] = 'Proxy - Fantastic.';
    SVTS['helm_proxy_enemy_down_got_oneD'] = 'Proxy - Got one.';
    SVTS['helm_proxy_enemy_down_niceA'] = 'Proxy - Nice. 1';
    SVTS['helm_proxy_enemy_down_niceC'] = 'Proxy - Nice. 2';
    SVTS['helm_proxy_hurt11'] = 'Proxy - Hurt 1';
    SVTS['helm_proxy_hurt12'] = 'Proxy - Hurt 2';
    SVTS['helm_proxy_hurt13'] = 'Proxy - Hurt 3';
    SVTS['helm_proxy_hurt14'] = 'Proxy - Hurt 4';
    SVTS['helm_proxy_hurt15'] = 'Proxy - Hurt 5';
    SVTS['helm_proxy_hurt17'] = 'Proxy - Hurt 6';
    SVTS['helm_proxy_hurt4'] = 'Proxy - Hurt 7';
    SVTS['helm_proxy_hurt5'] = 'Proxy - Hurt 8';
    SVTS['helm_proxy_hurt8'] = 'Proxy - Hurt 9';
    SVTS['helm_proxy_hurt9'] = 'Proxy - Hurt 10';
    SVTS['hexagon_death1'] = 'Hexagon - Death 1';
    SVTS['hexagon_death2'] = 'Hexagon - Death 2';
    SVTS['hexagon_pain1'] = 'Hexagon - Hurt 1';
    SVTS['hexagon_pain2'] = 'Hexagon - Hurt 2';
    SVTS['hexagon_pain3'] = 'Hexagon - Hurt 3';
    SVTS['hexagon_pain4'] = 'Hexagon - Hurt 4';
    SVTS['hexagon_welcome1'] = 'Hexagon - Alerted 1';
    SVTS['hexagon_welcome2'] = 'Hexagon - Alerted 2';
    SVTS['hexagon_welcome3'] = 'Hexagon - Alerted 3';
    SVTS['main_song'] = 'NPhonix - Antigravity';
    SVTS['orakin_death1'] = 'Orakin - Death 1';
    SVTS['orakin_death2'] = 'Orakin - Death 2';
    SVTS['orakin_hurt'] = 'Orakin - Hurt';
    SVTS['orakin_welcome'] = 'Orakin - Alerted';
    SVTS['proxy_alert_over_hereB'] = 'No Helm Proxy - Over here!';
    SVTS['proxy_alert_take_coverB'] = 'No Helm Proxy - Take cover!';
    SVTS['proxy_alert_up_thereA'] = 'No Helm Proxy - Up there!';
    SVTS['proxy_death3'] = 'No Helm Proxy - Death 1';
    SVTS['proxy_death4'] = 'No Helm Proxy - Death 2';
    SVTS['proxy_death5'] = 'No Helm Proxy - Death 3';
    SVTS['proxy_death6'] = 'No Helm Proxy - Death 4';
    SVTS['proxy_dyingC'] = 'No Helm Proxy - Help! 1';
    SVTS['proxy_dyingF'] = 'No Helm Proxy - Help! 2 ';
    SVTS['proxy_enemy_down_fantasticA'] = 'No Helm Proxy - Fantastic.';
    SVTS['proxy_enemy_down_got_oneD'] = 'No Helm Proxy - Got one.';
    SVTS['proxy_enemy_down_niceA'] = 'No Helm Proxy - Nice. 1';
    SVTS['proxy_enemy_down_niceC'] = 'No Helm Proxy - Nice. 2';
    SVTS['proxy_hurt11'] = 'No Helm Proxy - Hurt 1';
    SVTS['proxy_hurt12'] = 'No Helm Proxy - Hurt 2';
    SVTS['proxy_hurt13'] = 'No Helm Proxy - Hurt 3';
    SVTS['proxy_hurt14'] = 'No Helm Proxy - Hurt 4';
    SVTS['proxy_hurt15'] = 'No Helm Proxy - Hurt 5';
    SVTS['proxy_hurt17'] = 'No Helm Proxy - Hurt 6';
    SVTS['proxy_hurt4'] = 'No Helm Proxy - Hurt 7';
    SVTS['proxy_hurt5'] = 'No Helm Proxy - Hurt 8';
    SVTS['proxy_hurt8'] = 'No Helm Proxy - Hurt 9';
    SVTS['proxy_hurt9'] = 'No Helm Proxy - Hurt 10';
    SVTS['silk_alert_contactA'] = 'Silk - Contact!';
    SVTS['silk_alert_i_see_oneA'] = 'Silk - I see one.';
    SVTS['silk_alert_there_is_oneA'] = 'Silk - There is one...!';
    SVTS['silk_death1B'] = 'Silk - Death 1';
    SVTS['silk_death2B'] = 'Silk - Death 2';
    SVTS['silk_dyingB'] = 'Silk - Not good...';
    SVTS['silk_enemy_down_brilliantC'] = 'Silk - Brilliant.';
    SVTS['silk_enemy_down_eliminatedB'] = 'Silk - Eliminated.';
    SVTS['silk_enemy_down_hell_yeahB'] = 'Silk - Hell yeah!';
    SVTS['silk_enemy_down_ive_got_oneB'] = 'Silk - I got one!';
    SVTS['silk_enemy_down_minus_oneB'] = 'Silk - -1.';
    SVTS['silk_enemy_down_no_kicking_for_youB'] = 'Silk - No kicking for you.';
    SVTS['silk_hurt1B'] = 'Silk - Hurt 1';
    SVTS['silk_hurt2B'] = 'Silk - Hurt 2';
    SVTS['silk_hurt5'] = 'Silk - Hurt 3';
    SVTS['silk_hurt6'] = 'Silk - Hurt 4';
    SVTS['silk_hurt9B'] = 'Silk - Hurt 5';
    SVTS['wea_crossfire2'] = 'Crossfire CR-145 Vortex';
    SVTS['wea_ditzy_cs_ik'] = 'Assault Rifle CS-IK';
    SVTS['wea_glhf'] = 'Grenade Launcher CS-GLHF';
    SVTS['wea_incompetence_archetype_27xx_fire'] = 'Archetype 27XX';
    SVTS['wea_lazyrain_gravy_rl'] = 'Falkonian Anti-Grav Rocket Launcher';
    SVTS['wea_m202'] = 'Rocket Launcher CS-Barrage';
    SVTS['wea_moonhawk_railgun'] = 'Crossfire CR-34 Marauder';
    SVTS['wea_ph01'] = 'Crossfire CR-54 Viper';
    SVTS['wea_plasma_smg'] = 'Plasma Pistol'; // rename from "Plasma shotgun" which is incorrect and taken
    SVTS['wea_plasma_shotgun'] = 'Plasma Shotgun';
    SVTS['wea_rail_alt2'] = 'Falkonian PSI Cutter';
    SVTS['wea_thetoppestkek_shotgun_nxs25'] = 'Shotgun NXS-25';
    SVTS['xin_celebrate'] = 'Xin - Celebrating';
    SVTS['xin_death'] = 'Xin - Death';
    SVTS['xin_enemy_spotted'] = 'Xin - Alerted';
    SVTS['xin_hit'] = 'Xin - Hurt';
    let voices = {
        Grosk: [
            "Grosk",
            ["death", "Death", 2],
            ["dying", "Dying", 2],
            ["edown", "Celebrating", 3],
            ["welcome", "Alerted", 5],
            ["hurt", "Hurt", 3]
        ],
        drohnentroop: [
            "Drohnen Trooper",
            ["welcome", "Alerted", 3],
            ["hurt", "Hurt", 3],
            ["edown", "Celebrating", 3],
            ["dying", "Dying", 1],
            ["death", "Death", 3]
        ],
        drohnenfem: [
            "Drohnen Female",
            ["welcome", "Alerted", 3],
            ["hurt", "Hurt", 3],
            ["edown", "Celebrating", 3],
            ["dying", "Dying", 1],
            ["death", "Death", 3]
        ],
        elurra: [
            "Elurra",
            ["welcome", "Alerted", 3],
            ["hurt", "Hurt", 2],
            ["edown", "Celebrating", 2],
            ["dying", "Dying", 1],
            ["death", "Death", 1]
        ],
        ferro: [
            "Lt. Ferro",
            ["welcome", "Alerted", 3],
            ["hurt", "Hurt", 2],
            ["edown", "Celebrating", 3],
            ["death", "Death", 2]
        ],
        serkova: [
            "Serkova",
            ["welcome", "Alerted", 3],
            ["hurt", "Hurt", 1],
            ["edown", "Celebrating", 2],
            ["death", "Death", 1]
        ],
        phantom: [
            "Phantom",
            ["edown", "Celebrating", 1],
            ["welcome", "Alerted", 2],
            ["death", "Death", 1]
        ]
    };
    for (let entry of Object.entries(voices)) {
        let character = entry[0];
        let charVoices = entry[1];
        let charName = charVoices[0];

        for (let i = 1; i < charVoices.length; i++) {
            let voice = charVoices[i];
            for (let j = 1; j <= voice[2]; j++) {
                SVTS[`${character}_${voice[0]}${j}`] = `${charName} - ${voice[1]} ${j}`
            }
        }
    }
}

function updateVoicePresets() {
    // Adds voice presets that exist in game but not in ALE
    let VP = VAL_TABLE['voice_preset'];
    VP['proxy_helmetless'] = 'Proxy (helmetless)';
    VP['silk'] = 'Silk';
    VP['orakin'] = 'Orakin';
    VP['arrin'] = 'Arrin';
    VP['civilian_male'] = 'Civilian Male';
    VP['vulture'] = 'Vulture';
    VP['crossfire_sentinel'] = 'Crossfire Sentinel';
    VP['xin'] = 'Xin';
    VP["grosk"] = "Grosk";

    VP["elurra"] = "Elurra";
    VP["drohnenfem"] = "Drohnen Female";
    VP["serkova"] = "Serkova";
    VP["ferro"] = "Lt. Ferro";
    VP["drohnentroop"] = "Drohnen Trooper";
    VP["phantom"] = "Phantom";
}

function updateStyles() {
    // Changes some stylesheets to open up to things like resizable right panel.
    for(let i1 = 0; i1 < stylesheets.length; i1++) {
        let styleSheet = stylesheets[i1];
        for (let i2 = 0; i2 < styleSheet.rules.length; i2++) {
            let rule = styleSheet.rules[i2];
            switch(rule.selectorText) {
                case ".p_i":
                    rule.style.setProperty("display", "flex");
                    break;
                case ".rightui":
                    rule.style.setProperty("width", aleiSettings.rightPanelSize);
                    break;
                case ".pa1":
                    rule.style.setProperty("flex-grow", 0);
                    rule.style.setProperty("flex-shrink", 0);
                    break;
                case ".pa2":
                    rule.style.setProperty("width", "100%");
                    break;
                case ".opcode_field":
                    rule.style.setProperty("font-size", aleiSettings.triggerEditTextSize);
                    break;
                case "#rparams":
                    rule.style.setProperty("height", "var(--ALEI_RPARAMS_HEIGHT)");
                    break;
                default:
                    break;
            }
        }
    }
    $id("stars").style.setProperty("background-image", `url(${aleiSettings.starsImage})`)
    let _th = THEME;
    ThemeSet(THEME_BLUE);
    ThemeSet(_th);
}

//  No longer needed after an update to vanilla ALE
/* function updateRegionActivations() {

    let region_activations = VAL_TABLE['region_activation'];

    region_activations[17] = "Actor";
    region_activations[18] = "Actor not ally to player";
};
*/

function updateEngineMarkNames() {
    let engine_mark = VAL_TABLE['engine_mark'];
    
    engine_mark['no_auto_revive'] = "Disable AI actors from reviving allies";
};

/** @type {{id: number, name: string, added?: boolean, renamed?: boolean}[]} */
const allChars = [
    { id: -1, name: "Death Match model" }, 
    { id: 1, name: "Campaign Hero model" }, 
    { id: 2, name: "Usurpation Soldier Minor" }, 
    { id: 3, name: "Proxy" }, 
    { id: 4, name: "Android T-01187" }, 
    { id: 5, name: "Drone Controller" }, 
    { id: 6, name: "Advanced Usurpation Soldier" }, 
    { id: 7, name: "Civil Security Heavy" }, 
    { id: 8, name: "Civil Security Lite" }, 
    { id: 9, name: "Android SLC-56" }, 
    { id: 10, name: "Skin #10", added: true }, // added by ALEI
    { id: 11, name: "Civil Security Boss" }, 
    { id: 12, name: "Civil Security Ghost" }, 
    { id: 13, name: "Noir Lime" }, 
    { id: 14, name: "Falkok" }, 
    { id: 15, name: "Phoenix Falkok" }, 
    { id: 16, name: "Grub" }, 
    { id: 17, name: "Civil Security Ghost (visible)" }, 
    { id: 18, name: "Star Defender (from 'eric gurt-star_defenders')", renamed: true }, // renamed by ALEI
    { id: 19, name: "Raven by A Coniferous Chair" }, 
    { id: 20, name: "Skin #20", added: true }, // added by ALEI
    { id: 21, name: "PB:FTTP Star Defender" }, 
    { id: 22, name: "PB:FTTP Marine" }, 
    { id: 23, name: "PB:FTTP Soldier Rank 1" }, 
    { id: 24, name: "PB:FTTP Soldier Rank 2" }, 
    { id: 25, name: "PB:FTTP Soldier Rank 3" }, 
    { id: 26, name: "PB:FTTP Soldier Rank 4" }, 
    { id: 27, name: "Armored Grub" }, 
    { id: 28, name: "Elite Grub" }, 
    { id: 29, name: "Falkok Boss by Mr. Darks" }, 
    { id: 30, name: "Skin #30", added: true }, // added by ALEI
    { id: 31, name: "Reakhohsha Operative by darkstar 1" }, 
    { id: 32, name: "Civil Protector by darkstar 1" }, 
    { id: 33, name: "Android ATM-105 by darkstar 1" }, 
    { id: 34, name: "Android DT-148 by Ditzy" }, 
    { id: 35, name: "Zephyr by Ditzy" }, 
    { id: 36, name: "Hermes by darkstar 1" }, 
    { id: 37, name: "Hexagon by darkstar 1" }, 
    { id: 38, name: "GoldenKnife Noir Lime", added: true }, // added by ALEI
    { id: 39, name: "RootZ Noir Lime", added: true }, // added by ALEI
    { id: 40, name: "Lite Hero" }, 
    { id: 41, name: "Lite Hero 2" }, 
    { id: 42, name: "Lite Hero 3" }, 
    { id: 43, name: "Lite Hero 4" }, 
    { id: 44, name: "Lite Hero 5" }, 
    { id: 45, name: "Lite Hero 6" }, 
    { id: 46, name: "Lite Hero 7" }, 
    { id: 47, name: "Lite Hero 8" }, 
    { id: 48, name: "Lite Hero 9" }, 
    { id: 49, name: "Heavy Hero" }, 
    { id: 50, name: "Skin #50", added: true }, // added by ALEI
    { id: 60, name: "Skin #60", added: true }, // added by ALEI
    { id: 61, name: "Proxy (No helmet)" }, 
    { id: 62, name: "Skin #62", added: true }, // added by ALEI
    { id: 69, name: "Usurpation Ranger" }, 
    { id: 70, name: "Usurpation Destroyer" }, 
    { id: 71, name: "Usurpation Soldier Major" }, 
    { id: 72, name: "Proxy (White)" }, 
    { id: 73, name: "Blue Player (Noir Lime)" }, 
    { id: 74, name: "Red Player (Noir Lime)" }, 
    { id: 75, name: "Blue Proxy" }, 
    { id: 76, name: "Red Proxy" }, 
    { id: 77, name: "Blue Civil Security Lite" }, 
    { id: 78, name: "Red Civil Security Lite" }, 
    { id: 79, name: "Blue Usurpation Soldier" }, 
    { id: 80, name: "Red Usurpation Soldier" }, 
    { id: 81, name: "Blue Android SLC-56" }, 
    { id: 82, name: "Red Android SLC-56" }, 
    { id: 83, name: "Blue Lite Hero" }, 
    { id: 84, name: "Red Lite Hero" }, 
    { id: 85, name: "Blue Falkok" }, 
    { id: 86, name: "Red Falkok" }, 
    { id: 87, name: "Blue Raven by A Coniferous Chair" }, 
    { id: 88, name: "Red Raven by A Coniferous Chair" }, 
    { id: 89, name: "Blue Civil Protector by darkstar 1" }, 
    { id: 90, name: "Red Civil Protector by darkstar 1" }, 
    { id: 130, name: "Mining Android by darkstar 1" }, 
    { id: 131, name: "Crossfire Sentinel by Ditzy" }, 
    { id: 132, name: "Crossfire Headhunter by Ditzy" }, 
    { id: 133, name: "Federation Soldier by CakeSpider" }, 
    { id: 134, name: "Vulture by darkstar 1" }, 
    { id: 135, name: "Silk (armorless) by darkstar 1" }, 
    { id: 136, name: "Silk by darkstar 1" }, 
    { id: 137, name: "Civil Security Riot by eru_" }, 
    { id: 138, name: "Avre by darkstar 1" }, 
    { id: 139, name: "Civilian (male 1) by mrnat444" }, 
    { id: 140, name: "Civilian (male 2) by mrnat444" }, 
    { id: 141, name: "Civilian (male 3) by mrnat444" }, 
    { id: 142, name: "Civilian (female 1) by mrnat444" }, 
    { id: 143, name: "Civilian (female 2) by mrnat444" }, 
    { id: 144, name: "Civilian (female 3) by mrnat444" }, 
    { id: 145, name: "Civilian (male 1 equipped) by mrnat444" }, 
    { id: 146, name: "Civilian (male 2 equipped) by mrnat444" }, 
    { id: 147, name: "Worker (male) by mrnat444" }, 
    { id: 148, name: "Worker (female) by mrnat444" }, 
    { id: 149, name: "S.W.A.T (dark) by mrnat444" }, 
    { id: 150, name: "S.W.A.T (brighter) by mrnat444" }, 
    { id: 151, name: "Purple Xin", added: true }, // added by ALEI
    { id: 152, name: "Golden Xin", added: true }, // added by ALEI
    { id: 153, name: "Blue Xin", added: true }, // added by ALEI
    { id: 154, name: "Red Xin", added: true }, // added by ALEI
    { id: 155, name: "Amber Xin", added: true }, // added by ALEI
    { id: 156, name: "Nirvana Noir Lime", added: true }, // added by ALEI
    { id: 157, name: "Purple Gallynew", added: true }, // added by ALEI
    { id: 158, name: "Golden Gallynew", added: true }, // added by ALEI
    { id: 159, name: "Blue Gallynew", added: true }, // added by ALEI
    { id: 160, name: "Red Gallynew", added: true }, // added by ALEI
    { id: 161, name: "Amber Gallynew", added: true }, // added by ALEI
    { id: 162, name: "Pinkine", added: true }, // added by ALEI
    { id: 164, name: "Blue Heavy Hero (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 165, name: "Red Heavy Hero (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 198, name: "Blue Civil Security Heavy (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 199, name: "Red Civil Security Heavy (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 166, name: "Orakin (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 167, name: "Husk (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 168, name: "Hex (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 169, name: "Arrin (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 170, name: "Heavy Usurpation Soldier (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 171, name: "Cyber Grub by S1lk (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 172, name: "Grosk (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 173, name: "Futuristic Knight (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 175, name: "Serkova Insertion Unit (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 176, name: "Xenos Scout (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 177, name: "Armored Trooper (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 163, name: "Raider (by Serpent) (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 183, name: "Lt. Ferro (by Serpent) (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 185, name: "Elurra (Masked) (by Lin) (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 184, name: "Xenos Titan (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 195, name: "Wraith (by Ark633) (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 178, name: "New Generation Marine (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 200, name: "Xenos Welder (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 201, name: "Xenos Special Unit (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 193, name: "Xenos Marine (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 203, name: "Serkova Gunner Unit (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 191, name: "Serkova Recon Unit (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 204, name: "Serkova Grenader Unit (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 202, name: "Serkova Assault Unit (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 205, name: "Serkova Team Leader (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 206, name: "Serkova Resource Unit (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 207, name: "Serkova Technician Unit (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 211, name: "XBT-117 Android (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 186, name: "Drohnen Heavy (by Ark633) (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 189, name: "Maroon (by Francis localhost) (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 196, name: "Serkova Armored Unit (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 192, name: "Drohnen Drifter (by Ark633) (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 208, name: "Serkova Grub (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 209, name: "Serkova Reinforced Grub (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 210, name: "Serkova Devastator Grub (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 181, name: "Huntsman (Night) (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 182, name: "Huntsman (Swamp) (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 190, name: "Drohnen Skirmisher (by Ark633) (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 187, name: "Cromastakan (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 212, name: "Teneguilae (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 179, name: "Elurra (by Lin) (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 188, name: "Sgt. Davais (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 213, name: "Walker (by Serpent) (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 214, name: "Space Grub (by Broforce1) (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 180, name: "Dark Proxy (by littlekk) (Flash-only)", renamed: true }, // renamed by ALEI
    { id: 194, name: "Dark Android SLC-56 (by littlekk) (Flash-only)", renamed: true }, // renamed by ALEI
    //{ id: -46333, name: "Skin #-46333 (Flash-only)" },
    { id: 174, name: "Uncivil Proxy (Flash-only)", added: true }, // added by ALEI
    { id: 197, name: "Phantom (from 'kiriakos gr96-phantom') (Flash-only)", added: true }, // added by ALEI
    { id: 215, name: "Blue Phantom (from 'kiriakos gr96-phantom') (Flash-only)", added: true }, // added by ALEI
    { id: 216, name: "Red Phantom (from 'kiriakos gr96-phantom') (Flash-only)", added: true }, // added by ALEI
    { id: 217, name: "Misfit (Flash-only)", added: true }, // added by ALEI
    { id: 218, name: "Kaibil (Flash-only)", added: true }, // added by ALEI
];

/**
 * adds chars that exist in game but not in ALE.  
 * renames some chars.
 */
function updateSkins() {
    function afterCharsLoaded() {
        for (const char of allChars) {
            const {id, name} = char;
            if (char.added) {
                const imageSrc = `chars_full/char${id.toString().padStart(4, "0")}.png`;

                //special_values_table["char"][id] = name;
                CACHED_CHARS[id] = new Image();
                CACHED_CHARS[id].src = imageSrc; // CACHED_CHARS image has no src in vanilla
                CACHED_CHARS[id].loaded = false;
                CACHED_CHARS[id].native = true;
                CACHED_CHARS[id].onload = function() {
                    CACHED_CHARS[id].loaded = true;
                };
                CUSTOM_IMAGES_APPROVED[id] = true;

                img_chars_full[id] = new Image();
                img_chars_full[id].src = imageSrc;

                special_values_table["char"][id] = `<span style='background:url(${img_chars_full[id].src}); width: 16px; height: 16px; display: inline-block; background-position: center; background-position-x: 30%; background-position-y: 26%; background-size: 67px;vertical-align: -4px;'></span> ${name}`;
            }
            else if (char.renamed) {
                special_values_table["char"][id] = `<span style='background:url(${img_chars_full[id].src}); width: 16px; height: 16px; display: inline-block; background-position: center; background-position-x: 30%; background-position-y: 26%; background-size: 67px;vertical-align: -4px;'></span> ${name}`;
            }
        }

        aleiLog(logLevel.DEBUG, "Updated skins");
    }

    // call afterCharsLoaded when ALE has loaded chars
    (function recheck() {
        if (Object.keys(img_chars_full).length > 0) {
            afterCharsLoaded();
        }
        else {
            setTimeout(recheck, 50);
        }
    })();
}

function optimize() {
    // VSync.
    window.setTimeout = (f, ms) => {
        if (f == ani) {window.requestAnimationFrame(ani)}
        else return JS_setTimeout(f, ms);
    }
    let _browseImages = window.BrowseImages;
    let ogImageLists = {};
    // Image caching.
    window.BrowseImages = function(for_class = 'bg_model', current_value = '', callback = null) {
        // If cache doesn't have the class we are looking for, we will just set default value.
        if (ogImageLists[for_class] == undefined) {
            ogImageLists[for_class] = "[ALEI] Loading...";
            aleiLog(logLevel.INFO, `Will cache response of ${for_class}`);
        }

        // Overwrite setTimeout temporarily, as BrowseImages calls setTimeout for ServerRequest which sets the innerHTML of image_list
        let ost = window.setTimeout;
        window.setTimeout = (f, ms) => {
            window.setTimeout = ost; // Assign original setTimeout
            window.ServerRequest = (req, op, callback = null) => {
                window.ServerRequest = ALEI_ServerRequest; // Assign original ServerRequest
                // We made ServerRequest an async function, so we can just register on it
                ServerRequest(req, op, callback).then(() => {

                    // this solution is stupid, but it gets the job done for text decors. - Molis
                    let image_selection = image_list.children[3];
                    let change_decor_counter = 0;

                   for ( const image_option of image_selection.children ) {
                        let image = image_option.children[0];

                        if ( image.style.backgroundImage === 'url("decors/text.png")' || image.style.backgroundImage === 'url("decors/text2.png")' || image.style.backgroundImage === 'url("decors/text3.png")' ) {
                            let old_decor_counter = change_decor_counter;

                            change_decor_counter++;
                            switch( old_decor_counter ) {
                                case 0:
                                    image.style.backgroundImage = `url("${TEXT_OVERHEAD}")`;
                                    break;

                                case 1:
                                    image.style.backgroundImage = `url("${TEXT_SCORE}")`;
                                    break;

                                case 2:
                                    image.style.backgroundImage = `url("${TEXT_CHAT}")`;
                                    break;
                            }
                        }

                        if ( change_decor_counter === 3 ) break;
                    }
                    ogImageLists[for_class] = image_list.innerHTML;
                });
            };
            f();
        }
        _browseImages(for_class, current_value, callback);
        image_list.innerHTML = ogImageLists[for_class]; // Show what is in cache. (If cache didn't have the class, it will just show the previously set default value)
    }
}

function updateVehicles() {
    // Adding vehicles that exist in game but not in ALE. Currently only veh_hh, which is grabbable ledge.
    let _SVTV = VAL_TABLE["vehicle_model"];
    let vehicles = [
        ["veh_hh", "Grabbable Ledge", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACLSURBVEhLYxhxgBFE2M3/r/vvH0MQWISGgImJYd2hRMbLIDbYYpu5/+t/MzEEf2diuALi0wJw/mPQYf3HsPZIMmMjiA+3+BMLg/olIYblID4tgN47hki+Pww3YRYzgUUHAIxaTDcwajHdwKjFdAOjFtMNjFpMNzBqMd3AqMV0AwPbrh6InsQAAQYGAA8CLDKAAcpOAAAAAElFTkSuQmCC"]
    ]
    for(let i = 0; i < vehicles.length; i++) {
        let vehicle = vehicles[i];
        let model = vehicle[0];
        let name = vehicle[1];
        let image = vehicle[2];
        _SVTV[model] = `<img src='${image}' border=0 height=12 style=vertical-align:middle title='${name}' > ${name}`
        img_vehicles[model] = new Image();
        img_vehicles[model].src = image;
    }
}

function updateGuns() {
    // Adds guns that exist in game but not in ALE. Currently only one isn't visible in ALE, and that is joke weapon: NARL
    let guns = [
        ["gun_rl0", "BETA Rocket Launcher", "data:image/png;base64,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"]
    ];
    for(let i = 0; i < guns.length; i++) {
        let gun = guns[i];
        let gun_model = gun[0];
        let gun_name = gun[1];
        let gun_image = gun[2];
        VAL_TABLE["gun_model"][gun_model] = `<img src='${gun_image}' border=0 width=80 height=20 style=vertical-align:baseline title='${gun_name}'>`
        img_guns[gun_model] = new Image();
        img_guns[gun_model].src = gun_image;
    }
}

/**
 * adds decors that exist in game but not in ALE. (currently only hakase)  
 * changes src of text images.
 */
function updateDecors() {
    /** @type {{model: string, name: string, src1: string, src2: string}[]} */
    const decorsToAdd = [
        {
            model: "hakase",
            name: "Hakase",
            src1: "decors/hakase.png", // used in CACHED_DECORS
            src2: "pic.php?m=hakase&c=5", // used in img_decors (idk why they use different source)
            //src: "data:image/png;base64,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",
        }
    ];
    window.ALEI_decors = decorsToAdd;

    /** @type {{model: string, src: string}[]} */
    const decorsToChange = [
        {
            // EuropeExt Regular
            model: "text",
            src: TEXT_OVERHEAD,
        },
        {
            // DejaVu Sans Mono
            model: "text2",
            src: TEXT_SCORE,
        },
        {
            // Tahoma Bold
            model: "text3",
            src: TEXT_CHAT,
        },
    ];

    function afterDecorsLoaded() {
        // add decors that exist in game but not in ALE
        for (const {model, name, src1, src2} of decorsToAdd) {
            special_values_table["decor_model"][model] = name;
            CACHED_DECORS[model] = new Image();
            CACHED_DECORS[model].src = src1;
            CACHED_DECORS[model].native = true;
            CACHED_DECORS[model].loaded = false;
            CACHED_DECORS[model].onload = function() {
                CACHED_DECORS[model].loaded = true;
            };
            CUSTOM_IMAGES_APPROVED[model] = true; // approved cuz it's vanilla

            img_decors[model] = new Image();
            img_decors[model].src = src2;
        }

        // change src of text images
        for (const {model, src} of decorsToChange) {
            CACHED_DECORS[model].src = src;
            CACHED_DECORS[model].loaded = true;
            img_decors[model].src = src;
        }

        aleiLog(logLevel.DEBUG, "Updated decors");
    }

    // call afterDecorsLoaded when ALE has loaded the decor images
    (function recheck() {
        if (Object.keys(img_decors).length > 0) {
            afterDecorsLoaded();
        }
        else {
            setTimeout(recheck, 50);
        }
    })();
}

function updateOffsets() {
    // Because hakase decor and grabbable ledge image is made with hand manually and doesn't come from website, and that there is no
    // inbuilt offset, we have to offset those to make sure they show up in ALE correctly.
    let toosc = window.ThinkOfOffsetClass;
    window.ThinkOfOffsetClass = function(tc, esi) {
        if (tc == "vehicle" && offsets[esi.pm.model] != undefined) {
            return "alei_" + esi.pm.model;
        } else if (tc == "decor" && offsets[esi.pm.model] != undefined) {
            return "alei_" + esi.pm.model;
        } else if (tc == "gun" && (esi.pm.model == "gun_rl0")) {
            return "alei_gun_rl0";
        } else return toosc(tc, esi);
    }
    let offsets = {
        veh_hh: {x: -15, y: -15, w: 30, h: 30},
        hakase: {x: -400, y: -400, w: 800, h: 800},//{x: -18, y: -57, w: 40, h: 60},
        text: {x: -56, y: -10, w: 120, h: 24},
        text2: {x: -60, y: -10, w: 124, h: 24},
        text3: {x: -50, y: -10, w: 110, h: 24},
        gun_rl0: {x: -24, y: -6, w: 61, h: 13}
    }
    for (let key in offsets) {
        let off = offsets[key];
        offset_x["alei_" + key] = off.x;
        offset_y["alei_" + key] = off.y;
        offset_w["alei_" + key] = off.w;
        offset_h["alei_" + key] = off.h;
    }
}

function updateTriggers() {
    // This is where we will rename some triggers.
    // For now it's only 378, but we got more triggers like renaming 328
    addTrigger(175, "Gun &#8250; Change gun 'A' projectile model to 'B'", "gun", "ALEI_projectileModels");
    addTrigger(378, "Gun &#8250; Add hex color 'B' to gun 'A'", "gun", "string");
    addTrigger(332, "Var &#8250; Set variable 'A' to value 1 if Gun 'B' is in owner's active slot, set to value 0 in else case", "string", "gun");
    addTrigger(305, "Gun &#8250; Set Gun 'A' holstered attachment to 'B' (0 = on leg, 1 = on back, 2 = on head)", 'gun', 'string');

    // fix bug where "Set value of variable 'A' to slot of current player" has a param B that does nothing
    mark_pairs["trigger_type_B137"] = "nochange";

    // fix the bug where "Water" category has undefined color
    tr_type_tags["Water"] = "#7dd1d1";
    addTrigger(392, "Water &#8250; Move Water 'A' to Region 'B'", 'water', 'region');
    addTrigger(395, "Water &#8250; Set water 'A' damage to string-value/variable 'B'", 'water', 'string');
    addTrigger(409, "Water &#8250; Change water 'A' color to string-value/variable 'B'", 'water', 'string');

    // register "Experimental" trigger action category color
    tr_type_tags["Experimental"] = "#b579e1";

    // add hidden trigger actions
    // some others may work. i haven't checked 415-419 yet
    addTrigger(422, "Experimental &#8250; Show message 'A' in chat said by Character 'B' (added by ALEI)", "string", "character");
    addTrigger(423, "Experimental &#8250; Draw custom image of decoration 'A' to current graphic at top-left of region 'B' (added by ALEI)", "decor", "region");
    addTrigger(424, "Experimental &#8250; Move region 'A' to lower body of Character slot-value variable 'B' (added by ALEI)", "region", "string");

    // adds no gun option for "Set Character 'A' active weapon to Gun 'B'"
    // patchSpecialValue adds the case for gun+none into special_value
    special_values_table["gun+none"] = new Array();
    special_values_table["gun+none"][-1] = "- No gun -";
    special_values_table["gun+none"]["[listof]"] = "gun";
    mark_pairs["trigger_type_B312"] = "gun+none";

    // adds no vehicle option for "Put Character 'A' into the Vehicle 'B'"
    // patchSpecialValue adds the case for vehicle+none into special_value
    special_values_table["vehicle+none"] = new Array();
    special_values_table["vehicle+none"][-1] = "- No vehicle -";
    special_values_table["vehicle+none"]["[listof]"] = "vehicle";
    mark_pairs["trigger_type_B13"] = "vehicle+none";
}

function updateObjects() {
    // Shorthand for object-related functions as to not clutter console.
    updateGuns();
    updateVehicles();
    updateDecors();
    updateTriggers();
}

function addClipboardSync() {
    let clipboard_channel = new BroadcastChannel("ale_clipboard");

    ///////////////
    // Receiving //
    ///////////////
    clipboard_channel.onmessage = (msg) => {
        let data = msg.data;
        let kind = data.kind;
        if (kind == "send") {
            let recipient = data.recipient;
            let clip_name  = data.clip_name;
            let clip_data  = data.clip_data;

            if (recipient == undefined || recipient == aleiSessionID) {
                aleiLog(logLevel.DEBUG, '/ale_clipboard/ got data for ' + clip_name);
                sessionStorage[clip_name] = clip_data;
            }
        }
        if (kind == "get") {
            if (aleiSessionID > Math.min(...aleiSessionList)) return;

            let session_id = data.session_id;
            aleiLog(logLevel.DEBUG, '/ale_clipboard/ syncing to ' + session_id);
            for (let i = 0; i <= 10; i++) {
                let clip_name = "clipboard" + (i == 0 ? "" : ("_slot" + (i-1)));
                let clip_data = sessionStorage[clip_name];
                if (clip_data == undefined) continue;
                clipboard_channel.postMessage({kind: "send", recipient: session_id, clip_name, clip_data});
            }
        }
    }

    // Initial Sync
    aleiLog(logLevel.DEBUG, '/ale_clipboard/ requesting');
    clipboard_channel.postMessage({kind: "get", session_id: aleiSessionID});

    /////////////
    // Sending //
    /////////////
    let ALE_CopyToClipBoard = window.CopyToClipBoard;
    window.CopyToClipBoard = (clip_name) => {
        ALE_CopyToClipBoard(clip_name);
        let clip_data = sessionStorage[clip_name];
        clipboard_channel.postMessage({kind: "send", clip_name, clip_data});
    }
}

async function addSessionSync() {
    // This function registers some events, as to talk with other tabs
    // For now, this is useful for clipboard sync, but we probably can have more.
    const PROBE_TIMEOUT_MS = 200;
    let session_channel = new BroadcastChannel("ale_session");

    // Receive data
    session_channel.onmessage = (msg) => {
        let data = msg.data;
        let kind = data.kind;
        // New ALEI instance started up.
        if (kind == "start") {
            if (aleiSessionID == null) return;
            session_channel.postMessage({kind: "greet", id: aleiSessionID});
            aleiLog(logLevel.DEBUG, "/ale_session/ recieved start");
        }
        // An ALEI instance responded to new ALEI instance, registering the ALEI instance
        if (kind == "greet") {
            let session_id = data.id;
            if (!aleiSessionList.includes(session_id))
                aleiSessionList.push(session_id);
            aleiLog(logLevel.DEBUG, "/ale_session/ received greet by " + session_id);
        }
        // An ALEI instance is closing
        if (kind == "close") {
            let session_id = data.id;
            aleiSessionList.splice(aleiSessionList.indexOf(session_id), 1);
            aleiLog(logLevel.DEBUG, "/ale_session/ received close by " + session_id);
        }
    }

    // Probe for other sessions
    session_channel.postMessage({kind: "start"});
    aleiLog(logLevel.DEBUG, "/ale_session/ probing");
    await new Promise(resolve => {
        JS_setTimeout(resolve, PROBE_TIMEOUT_MS);
    });

    // Assign own session ID
    if (aleiSessionList.length == 0)
        aleiSessionID = 0;
    else
        aleiSessionID = Math.max(...aleiSessionList) + 1;

    aleiLog(logLevel.DEBUG, "/ale_session/ session ID " + aleiSessionID);

    // Tell other sessions that this one is done
    window.addEventListener('beforeunload', (event) => {
        session_channel.postMessage({kind: "close", id: aleiSessionID});
    });

    addClipboardSync();
}

function addPropertyPanelResize() {
    // Gives right panel ability to be resized.

    let splitter_is_down = false;
    const splitter = document.createElement("div");
    const root = document.documentElement;

    splitter.style.position = "absolute";
    splitter.style.width = "5px";
    splitter.style.top = "50px";
    splitter.style.height = "100%";
    splitter.style.cursor = "w-resize";
    // splitter.style["background-color"] = "black";
    $id('floattag').appendChild(splitter);

    function splitter_resize(e) {
        let new_width = Math.min(root.clientWidth - 100, Math.max(100, root.clientWidth - e.clientX));
        right_panel.style.width = new_width + 'px';
        splitter.style.right = new_width + 'px';
        ROOT_ELEMENT.style.setProperty("--param_panel_size", splitter.style.right);
        updateBoxSplitterSize();
    }

    splitter.addEventListener('mousedown', (e) => {
        splitter_is_down = true;
    });

    root.addEventListener('mouseup', (e) => {
        splitter_is_down = false;
        writeStorage('ALEI_RightPanelWidth', right_panel.clientWidth + 'px');
    });

    root.addEventListener('mousemove', (e) => {
        if (splitter_is_down) splitter_resize(e);
    });

    splitter.style.right = aleiSettings.rightPanelSize;
    ROOT_ELEMENT.style.setProperty("--param_panel_size", splitter.style.right);
    window.splitter = splitter;
}

function addTriggerIDs() {
    if (!aleiSettings.showTriggerIDs) return;

    let SVTTP = VAL_TABLE['trigger_type'];
    for (let i in SVTTP) {
        SVTTP[i] = i + " " + SVTTP[i];
    }
}

function patchShowHideButton() {
    let og = window.ShowHideObjectBox;
    window.ShowHideObjectBox = function() {
        og();
        let rparams = $id("rparams");
        let heightOffset = {true: 270, false: 155}[ObjectBox_visible];
        if (rparams != null) {
            heightOffset = Math.round(rparams.getBoundingClientRect().top + 13);
        }
        // We then set variable and call original function.
        document.documentElement.style.setProperty("--ALEI_RPARAMS_HEIGHT", `calc(100vh - ${heightOffset}px)`);
        //og();
    }
    ShowHideObjectBox();
    ShowHideObjectBox(); // Hacky way to fix bug
}

function tryToNumber(x) {
    if (!isNaN(Number(x))) {
        return Number(x);
    } else {
        return x;
    }
}

function insertXMLUserInput() {
    let file = confirm("File (OK) or text (Cancel) ?");

    if (file) {
        let fileInput = document.createElement("input");

        fileInput.type = "file";

        fileInput.onchange = function() {
            if (fileInput.files[0]) {
                if (fileInput.files[0].name.split(".")[1] == "xml") {
                    let reader = new FileReader();

                    reader.onload = function() {
                        insertXML(reader.result);

                        fileInput.remove();
                    }

                    reader.readAsText(fileInput.files[0]);
                } else {
                    alert("Invalid file extension.");
                }
            }
        }

        fileInput.click();
    } else {
        let xml = prompt("Enter XML:", "");

        if (xml !== null) {
            insertXML(xml);
        }
    }
}

function insertXML(xml) {
    xml = "<map>" + xml.replaceAll("&", "[__Amp]") + "</map>";

    let parser = new DOMParser();
    let map = parser.parseFromString(xml, "application/xml");
    let objects = map.querySelectorAll("*");

    let originalEsLength = es.length;

    for (let i = 1; i < objects.length; i++) {
        let object = objects[i];
        if (object.tagName == "map") continue;

        let eo = new E(object.tagName);
        eo.pm = {};

        for (let j = 0; j < object.attributes.length; j++) {
            let name = object.attributes[j].name;
            let value = object.attributes[j].value;

            eo.pm[name] = tryToNumber(value.replaceAll("[__Amp]", "&"));
        }

        es.push(eo);
    }

    onEntitiesCreated(es.slice(originalEsLength));

    need_redraw = true;
    need_GUIParams_update = true;
}

function exportXML() {
    let newstr = "";
    let download = document.createElement("a");

    let exportSelection = es.some(entity => entity.selected);
    if (exportSelection) {
        if(!confirm("Only selection will be exported.")) return;
        for (let i = 0; i < es.length; i++) {
            if (es[i].selected) {
                newstr += compi_obj(i);
            }
        }

        if (mapid) {
            download.download = mapid + " (selection).xml";
        } else {
            download.download = "newmap (selection).xml";
        }
    } else {
        for (let i = 0; i < es.length; i++) {
            if (es[i].exists) {
                newstr += compi_obj(i);
            }
        }

        if (mapid) {
            download.download = mapid + ".xml";
        } else {
            download.download = "newmap.xml";
        }
    }

    download.href = "data:text," + escape(newstr);

    if (newstr != "") {
        download.href = "data:text," + escape(newstr);

        download.click();
    } else {
        alert("Map is empty.");
    }

    download.remove();
}
///////////////////////////////

/**
 * refactored ImageContext.  
 * differences:  
 * - context menu is not shown for any native decors (it doesn't work well)  
 * - quotes in the image name doesn't make it impossible to delete or rename it (happened because html/js got messed up)  
 * - ServerRequest calls aren't contained in 1ms timeout (not necessary because ServerRequest isn't synchronous anymore)
 * - no inline events. added data attributes
 * @param {number} id 
 * @param {number} is_skin - 0 for all decors/backgrounds (unused). 1-4 for chars (represents the permission level)
 * @param {MouseEvent} e 
 * @param {string} old_name 
 * @param {HTMLElement} element 
 * @param {boolean} moderator_menu 
 * @param {boolean} awaiting_approval 
 * @param {string} login 
 * @param {string} approver 
 * @param {boolean} is_fav_menu 
 */
function ImageContextMenu(id, is_skin, e, old_name, element, moderator_menu, awaiting_approval=false, login="?", approver="?", is_fav_menu=false) {
    window.last_element = element;
    window.last_login = login;
    e.preventDefault();

    if (element.parentElement.id === "list_native") return; // prevent context menu for all native images (normally it either errors or doesn't work well)

    const contextMenu = document.getElementById("image_context");

    contextMenu.style.left = e.clientX + "px";
    contextMenu.style.top = e.clientY + "px";
    contextMenu.style.display = "block";
    
    image_context_cancel_pad.style.display = "block";
    
    // prevent menu from going off screen
    setTimeout(() => {
        const menuHeight = contextMenu.getBoundingClientRect().height;
        const menuBottom = e.clientY + menuHeight;
        const menuBottomMax = window.innerHeight - 10;
        if (menuBottom > menuBottomMax) {
            contextMenu.style.top = (menuBottomMax - menuHeight) + "px";
        }
    }, 1);

    // #region set html
    const greyColor = "rgba(0,0,0,0.3)";
    contextMenu.innerHTML = "";
    if (moderator_menu) {
        contextMenu.insertAdjacentHTML("beforeend", `
            <div data-action="approve">Approve <img src="../images/ap.png" class="appimg"></div>
            <div data-action="reset approval">Reset approval status</div>
            <div data-action="search author">Search for other approved images from &quot;${login}&quot;</div>
            <div style="color:${greyColor}">Last status change by ${approver}</div>
            <div data-action="disapprove unreviewed"
                >Disapprove all unreviewed from &quot;${login}&quot; <
                img src="../images/noap.png" class="noappimg"><
                img src="../images/noap.png" class="noappimg"><
                img src="../images/noap.png" class="noappimg"
            ></div>
            <div data-action="disapprove">Disapprove <img src="../images/noap.png" class="noappimg"></div>
        `);
    }
    else {
        if (login === curlogin && approver !== "!") {
            contextMenu.insertAdjacentHTML("beforeend", `
                <div data-action="rename">Rename</div>
                ${
                    awaiting_approval
                    ? `<div data-action="request approval" style="color:${greyColor}">Request Approval (already done)</div>`
                    : old_name === "Untitled"
                      ? `<div data-action="request approval" style="color:${greyColor}">Request Approval (proper name required)</div>`
                      : `<div data-action="request approval">Request Approval <img src="../images/ap.png" class="appimg"></div>`
                }
                ${
                    awaiting_approval
                    ? `<div data-action="unrequest approval">Exclude from approval review queue</div>`
                    : `<div data-action="unrequest approval" style="color:${greyColor}">Exclude from approval review queue (not in queue)</div>`
                }
                <div data-action="delete">Delete <img src="../images/noap.png" class="noappimg"></div>
            `);
        }
        else
        {
            contextMenu.insertAdjacentHTML("beforeend", `
                <div data-action="search author">Search for other approved images from &quot;${login}&quot;</div>
            `);
        }
    }
    contextMenu.insertAdjacentHTML("beforeend", `
        <span style="display:block;">&nbsp;</span>
        ${
            is_fav_menu
            ? `<div data-action="remove fav">Remove from favorites</div>`
            : `<div data-action="add fav">Add to favorites</div>`
        }
    `);
    if (last_for_class == "char" && (moderator_menu || (login === curlogin && approver !== "!"))) {
        contextMenu.insertAdjacentHTML("beforeend", `
            <span style="display:block;">&nbsp;</span>
            <div data-action="set skin permission" data-value="1">${(is_skin == 1) ? "&#9679;" : "&#9676;"}&nbsp;&nbsp;Allowed in Custom Maps only</div>
            <div data-action="set skin permission" data-value="2">${(is_skin == 2) ? "&#9679;" : "&#9676;"}&nbsp;&nbsp;Allowed in Custom Maps and by players</div>
            <div data-action="set skin permission" data-value="3">${(is_skin == 3) ? "&#9679;" : "&#9676;"}&nbsp;&nbsp;Allowed in Custom Maps and by supporters</div>
            <div data-action="set skin permission" data-value="4">${(is_skin == 4) ? "&#9679;" : "&#9676;"}&nbsp;&nbsp;Allowed by supporters only</div>
        `);
    }
    // #endregion set html

    // #region set js
    contextMenu.querySelector(`[data-action="approve"]`)?.addEventListener("click", () => {
        CloseImageContext();
        ServerRequest(`a=get_images&for_class=${last_for_class}&approve_for=${id}`, "approve_image");
    });
    contextMenu.querySelector(`[data-action="reset approval"]`)?.addEventListener("click", () => {
        CloseImageContext();
        ServerRequest(`a=get_images&for_class=${last_for_class}&reset_status_for=${id}`, "reset_approval_image");
    });
    contextMenu.querySelector(`[data-action="search author"]`)?.addEventListener("click", () => {
        CloseImageContext();
        window[`open_approved_${last_for_class}`] = true;
        SaveFiltering();
        search_phrase = "*by_login*" + login;
        UpdateImageList();
    });
    contextMenu.querySelector(`[data-action="disapprove unreviewed"]`)?.addEventListener("click", () => {
        CloseImageContext();
        ServerRequest(`a=get_images&for_class=${last_for_class}&disapprove_for_all=${login}`, "disapprove_image");
    });
    contextMenu.querySelector(`[data-action="disapprove"]`)?.addEventListener("click", () => {
        CloseImageContext();
        ServerRequest(`a=get_images&for_class=${last_for_class}&disapprove_for=${id}`, "disapprove_image");
    });
    contextMenu.querySelector(`[data-action="rename"]`)?.addEventListener("click", () => {
        const v = prompt("New name:", old_name);
        CloseImageContext();
        if (v !== null) {
            ServerRequest(`a=get_images&for_class=${last_for_class}&set_title_for=${id}&value=${v}`, "rename_image");
        }
    });
    contextMenu.querySelector(`[data-action="request approval"]`)?.addEventListener("click", () => {
        if (!awaiting_approval) {
            if (old_name === "Untitled") {
                alert("Proper name required for custom image - you will not be available to change name once image is approved.");
            }
            else {
                CloseImageContext();
                ServerRequest(`a=get_images&for_class=${last_for_class}&await_approval_for=${id}`, "await_approval_status");
            }
        }
    });
    contextMenu.querySelector(`[data-action="unrequest approval"]`)?.addEventListener("click", () => {
        if (awaiting_approval) {
            CloseImageContext();
            ServerRequest(`a=get_images&for_class=${last_for_class}&deawait_approval_for=${id}`, "await_approval_status");
        }
    });
    contextMenu.querySelector(`[data-action="delete"]`)?.addEventListener("click", () => {
        const v = confirm(`Are you sure you want to delete "${old_name}"?`);
        CloseImageContext();
        if (v) {
            element.style.opacity = "0.5";
            const deletedClass = last_for_class;
            ServerRequest(`a=get_images&for_class=${last_for_class}&delete=${id}`, "delete_image", function() {
                const c_id = "c" + id;
                if (deletedClass === "char") {
                    URL.revokeObjectURL(CACHED_CHARS[c_id]?.src);
                    delete CACHED_CHARS[c_id];
                }
                delete CACHED_DECORS[c_id];
                delete CACHED_BGS[c_id];
            });
        }
    });
    contextMenu.querySelector(`[data-action="remove fav"]`)?.addEventListener("click", () => {
        CloseImageContext();
        ServerRequest(`a=get_images&for_class=${last_for_class}&favorite_del=${id}`, "favorite_status");
    });
    contextMenu.querySelector(`[data-action="add fav"]`)?.addEventListener("click", () => {
        CloseImageContext();
        ServerRequest(`a=get_images&for_class=${last_for_class}&favorite_add=${id}`, "favorite_status");
    });
    for (const element of contextMenu.querySelectorAll(`[data-action="set skin permission"]`)) {
        element.addEventListener("click", () => {
            CloseImageContext();
            ServerRequest(`a=get_images&for_class=${last_for_class}&is_skin_set_for=${id}&is_skin_set_to=${element.dataset.value}`, "is_skin_set");
        });
    }
    // #endregion set js
    
    return false;
}

function findObjects(name) {
    let exact = confirm("Exact name?");
    let notFound = true;

    function pred(d) {
        if (exact) {return d == name;}
        else {return d.includes(name)}
    }

    for (let i = 0; i < es.length; i++) {
        es[i].selected = false;

        if (es[i].pm.uid) {
            if (pred(es[i].pm.uid) && MatchLayer(es[i])) {
                es[i].selected = true;
                notFound = false;
            }
        }
    }

    need_GUIParams_update = true;
    need_redraw = true;

    return notFound;
}

function rotateObjects() {
    let selected = SelectedObjects;
    let distX = [];
    let distY = [];
    let minX;
    let minY;

    for (let i = 0; i < selected.length; i++) {
        if (selected[i].pm.w && selected[i].pm.h) {
            let save = selected[i].pm.w;

            selected[i].pm.w = selected[i].pm.h;
            selected[i].pm.h = save;
        }

        distX.push(selected[i].pm.x);
        distY.push(selected[i].pm.y);
    }

    minX = Math.min(...distX);
    minY = Math.min(...distY);

    for (let i = 0; i < selected.length; i++) {
        distX[i] -= minX;
        distY[i] -= minY;

        selected[i].pm.x = minX + distY[i];
        selected[i].pm.y = minY + distX[i];
    }
}

function patchRandomizeName() {
    const originalRandomizeName = window.RandomizeName;
    window.RandomizeName = function(oldName) {
        if (!aleiSettings.orderedNaming) {
            return originalRandomizeName(oldName);
        }
        else {
            let takenUids = new Set(es.filter(e => e.exists).map(o => o.pm.uid));
            let actualName = oldName;

            // Early quit if name is already unique
            if(!takenUids.has(actualName)) return actualName;
            
            // Getting name before *
            if(oldName.includes("*")) actualName = oldName.slice(0, oldName.lastIndexOf("*"));

            // Testing every number through bruteforce.
            let current = 1;
            while(takenUids.has(`${actualName}*${current}`)) current++;

            return `${actualName}*${current}`;
        }
    }
}

function patchAllowedCharacters() {
    allowed_string_chars += "<>";
}

function getObjectBox(obj) {
    let x = 0;
    let y = 0;
    let w = obj.pm.w;
    let h = obj.pm.h;

    if (!obj._isresizable) {
        x = bbox_x[obj._class];
        y = bbox_y[obj._class];
        w = bbox_w[obj._class];
        h = bbox_h[obj._class];
    }

    if (["player", "enemy"].includes(obj._class)) {
        x = -15;
        y = -81;
        w = 30;
        h = 80;
    }

    if (obj._class == "vehicle") {
        x = bbox_x["vehicle_" + obj.pm.model];
        y = bbox_y["vehicle_" + obj.pm.model];
        w = bbox_w["vehicle_" + obj.pm.model];
        h = bbox_h["vehicle_" + obj.pm.model];

        if (obj.pm.model == "veh_hh") {
            x = offset_x["alei_veh_hh"];
            y = offset_y["alei_veh_hh"];
            w = offset_w["alei_veh_hh"];
            h = offset_h["alei_veh_hh"];
        }
    }

    return {
        x: x,
        y: y,
        w: w,
        h: h
    }
}

function getSelectionImage() {
    let selection = SelectedObjects;
    let minX = +Infinity;
    let minY = +Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < selection.length; i++) {
        let box = getObjectBox(selection[i]);
        let x = selection[i].pm.x + box.x;
        let y = selection[i].pm.y + box.y;
        let w = box.w;
        let h = box.h;

        if (x < minX) {
            minX = x;
        }

        if (x + w > maxX) {
            maxX = x + w;
        }

        if (y < minY) {
            minY = y;
        }

        if (y + h > maxY) {
            maxY = y + h;
        }
    }

    window.es = [];
    for (let e of selection) {
        es.push(e);
    }



    THEME = 4;
    GRID_ALPHA = 0;
    SHOW_CONNECTIONS = false;
    zoom = 1;
    zoom_validate();

    let sw = dis_to_x - dis_from_x;
    let sh = dis_to_y - dis_from_y;

    dis_from_x = minX - 10;
    dis_from_y = minY - 10;
    dis_to_x = minX + sw - 10;
    dis_to_y = minY + sh - 10;

    ConsoleTraceMessages = [];

    Render();

    let w = maxX - minX + 20;
    let h = maxY - minY + 20;

    aleiLog(logLevel.VERBOSE, "Before GID");
    let data = ctx.getImageData(0, 0, w, h);
    aleiLog(logLevel.VERBOSE, "After GID");

    let canvas = document.createElement("canvas");
    let ctx2 = canvas.getContext("2d");

    let canvas2 = document.createElement("canvas");
    let ctx3 = canvas2.getContext("2d");

    canvas.width = w;
    canvas.height = h;

    ctx2.beginPath();
    ctx2.putImageData(data, 0, 0);
    ctx2.closePath();

    let prevW = w;
    let prevH = h;

    if (w > 100 || h > 100) {
        let divide = w / h;

        if (divide >= 1) {
            w = 100;
            h = w / divide;
        } else {
            h = 100;
            w = h * divide;
        }
    }

    canvas2.width = w;
    canvas2.height = h;

    ctx3.beginPath();
    ctx3.scale(w / prevW, h / prevH);
    ctx3.drawImage(canvas, 0, 0);
    ctx3.closePath();

    let result = canvas2.toDataURL();

    canvas.remove();
    canvas = undefined;

    return result;
}

function createClipboardDiv() {
    let clipboardDiv = document.createElement("div");
    let mrdimlights = document.getElementById("mrdimlights");

    clipboardDiv.id = "clipboardDiv";
    clipboardDiv.className = "mrpopup";
    clipboardDiv.style = "width: calc(100% - 280px); height: 100%; margin: 0px; padding: 0px; top: 50%; transform: translate(0px, -50%); display: none;";

    clipboardDiv.addEventListener("contextmenu", e => {
        e.preventDefault();
    });

    mrdimlights.addEventListener("click", e => {
        clipboardDiv.style.display = "none";
    });

    document.body.append(clipboardDiv);
}

function clipboardItemAction(i) {
    let items = JSON.parse(localStorage.clipboardItems);
    let action = confirm("Rename (OK) or delete (Cancel) ?");

    if (action) {
        let name = prompt("Enter name:", items[i].name);

        if (name) {
            items[i].name = name;

            localStorage.clipboardItems = JSON.stringify(items);

            updateClipboardDiv();
        }
    } else {
        if (confirm("Are you sure you want to delete?")) {
            items.splice(i, 1);

            localStorage.clipboardItems = JSON.stringify(items);

            updateClipboardDiv();
        }
    }
}

function registerClipboardItemAction() {
    window.clipboardItemAction = clipboardItemAction;
    aleiLog(logLevel.DEBUG, "Registered Clipboard Item Action");
}

function updateClipboardDiv() {
    if (!localStorage.clipboardItems) {
        localStorage.clipboardItems = "[]";
    }

    let items = JSON.parse(localStorage.clipboardItems);
    let clipboardDiv = document.getElementById("clipboardDiv");
    let mrdimlights = document.getElementById("mrdimlights");

    clipboardDiv.style.display = "block";
    mrdimlights.style.display = "block";

    let html = `
        <div id="mrtitle">
            <span>Object clipboard</span>
            <closebox onclick="document.getElementById('clipboardDiv').style.display = 'none'; document.getElementById('mrdimlights').style.display = 'none';">x</closebox>
        </div>

        <div id="mrbox" class="objbox" style="height: calc(100% - 32px); box-sizing: border-box;">
    `;

    let originalES = window.es;
    let cs = {} // CS: Current Settings, because we will change settings for rendering images
    cs.theme = THEME;
    cs.grid_opacity = GRID_ALPHA;
    cs.showConnections = SHOW_CONNECTIONS;
    //
    cs.dtx = dis_to_x;
    cs.dty = dis_to_y;
    //
    cs.dfx = dis_from_x;
    cs.dfy = dis_from_y;
    //
    cs.ctm = ConsoleTraceMessages;
    cs.zoom = zoom;

    window.es = [];
    for (let i = 0; i < items.length; i++) {
        __pasteObjectClipboard(items[i]);
        html += `
            <div class="img_option" style="width: auto;" oncontextmenu="clipboardItemAction(` + i + `)" onclick="pasteFromPermanentClipboard(` + i + `);">
                <img src="` + getSelectionImage() + `" style="max-width: 100px; max-height: 100px;">
                <div>` + items[i].name + `</div>
            </div>
        `;
    }

    clipboardDiv.innerHTML = html + "</div>";
    window.es = originalES;
    THEME = cs.theme;
    GRID_ALPHA = cs.grid_opacity;
    SHOW_CONNECTIONS = cs.showConnections;
    dis_to_x = cs.dtx;
    dis_to_y = cs.dty;
    dis_from_x = cs.dfx;
    dis_from_y = cs.dfy;
    ConsoleTraceMessages = cs.ctm;
    zoom = cs.zoom;
    need_redraw = true;
    zoom_validate();
}

function __pasteObjectClipboard(item) {
    sessionStorage.permanent_clipboard = item.data;
    PasteFromClipBoard("permanent_clipboard");
}

function pasteFromPermanentClipboard(i) {
    let items = JSON.parse(localStorage.clipboardItems);

    sessionStorage.permanent_clipboard = items[i].data;

    PasteFromClipBoard("permanent_clipboard");

    let clipboardDiv = document.getElementById("clipboardDiv");
    let mrdimlights = document.getElementById("mrdimlights");

    clipboardDiv.style.display = "none";
    mrdimlights.style.display = "none";

    NewNote("Objects pasted from permanent clipboard.", note_passive);
}

function copyToPermanentClipboard() {
    try {
        let selection = SelectedObjects;

        if (selection.length != 0) {
            CopyToClipBoard("permanent_clipboard");

            let items = JSON.parse(localStorage.clipboardItems);

            items.push({
                name: "Selection",
                data: sessionStorage.permanent_clipboard
            });

            localStorage.clipboardItems = JSON.stringify(items);

            NewNote("Objects copied to permanent clipboard.", note_passive);
        } else {
            updateClipboardDiv();
        }
    } catch (err) {
        console.error(err);
        NewNote("Can't copy objects to permanent clipboard.<br>LocalStorage error?", note_bad);
    }
}

function addPasteFromPermanentClipboard() {
    window.pasteFromPermanentClipboard = pasteFromPermanentClipboard;
}

function changeTopRightText() {
    let containerElem = document.getElementById("version_rights");
    let elem = containerElem.childNodes[0];

    containerElem.style.width = "170px";
    elem.style.width = "160px";

    let version = "";
    if(isNative) version = " v" + GM_info.script.version;

    elem.innerHTML = elem.innerHTML.replaceAll("<br>", " ") + "<br>ALE Improvements" + version;
}

/**
 * This function is invoked whenever users pressed the "Extend trigger action list." or the "Shrink trigger action list" buttons.
 * This function is responsible for creating and maintaining extended triggers.
 *
 * @param {Number} value    The amount of trigger actions to add or subtract from the currently selected trigger,
 * @param {boolean} scrollToBottom - whether to scroll to the bottom after trigger actions are added
 */
function addTriggerActionCount(value, scrollToBottom=true){

    const selection = SelectedObjects;

    if (selection.length != 1 || value === 0) {
        return;
    }

    const selectedTrigger = selection[0];

    // Subtracting trigger actions from normal triggers is a no-op.
    if(!selectedTrigger.pm["extended"] && value < 0){
        return;
    }

    // It is a normal trigger, let's convert it to an extended trigger.
    if(!selectedTrigger.pm["extended"]){
        selectedTrigger.pm["additionalActions"] = new Array();
        selectedTrigger.pm["additionalParamA"] = new Array();
        selectedTrigger.pm["additionalParamB"] = new Array();
        selectedTrigger.pm["totalNumOfActions"] = aleiExtendedTriggerActionLimit;
        selectedTrigger.pm["extended"] = true;
        selectedTrigger["extendedAndParsed"] = true;

        NewNote("Converted this to an extended trigger.", note_passive);
        NewNote(`Behind the scenes, this creates 1 trigger for every additional ${aleiExtendedTriggerActionLimit - 1} trigger actions. Be mindful about your number of triggers.`, note_neutral);
    }

    selectedTrigger.pm["totalNumOfActions"] += value;

    // handle removal of parameters for parameter map
    if (value < 0) {
        let removedParamNames = [];
        let removedParamValues = [];
        const upperBound = selectedTrigger.pm.additionalActions.length
        const startIndex = Math.max(0, upperBound + value);
        for (let i = startIndex; i < upperBound; i++) {
            const actionNum = i + ( aleiExtendedTriggerActionLimit + 1 );
            removedParamNames.push(`actions_${actionNum}_type`);
            removedParamValues.push(selectedTrigger.pm.additionalActions[i]);

            removedParamNames.push(`actions_${actionNum}_targetA`);
            removedParamValues.push(selectedTrigger.pm.additionalParamA[i]);

            removedParamNames.push(`actions_${actionNum}_targetB`);
            removedParamValues.push(selectedTrigger.pm.additionalParamB[i]);
        }
        parameterMapHandleParametersRemoval(selectedTrigger, removedParamNames, removedParamValues);
    }

    // It has less than 10 or 100 trigger actions, let's convert this extended trigger back to a normal trigger.
    if(selectedTrigger.pm["totalNumOfActions"] <= aleiExtendedTriggerActionLimit || isNaN(selectedTrigger.pm["totalNumOfActions"])){
        delete selectedTrigger.pm["additionalActions"];
        delete selectedTrigger.pm["additionalParamA"];
        delete selectedTrigger.pm["additionalParamB"];
        delete selectedTrigger.pm["totalNumOfActions"];
        delete selectedTrigger.pm["extended"];
    }
    // Resize arrays according to the new change in totalNumOfTriggers.
    else{
        if(value > 0){
            selectedTrigger.pm["additionalActions"].push(...Array(value).fill(-1));
            selectedTrigger.pm["additionalParamA"].push(...Array(value).fill(0));
            selectedTrigger.pm["additionalParamB"].push(...Array(value).fill(0));
        }
        else{
            selectedTrigger.pm["additionalActions"].length += value;
            selectedTrigger.pm["additionalParamA"].length += value;
            selectedTrigger.pm["additionalParamB"].length += value;
        }
    }

    // handle removal of parameters for ocm
    if (value < 0) ocmHandleEntityParametersChange(selectedTrigger);

    UpdateGUIParams();

    if (scrollToBottom) {
        // Scroll to the bottom of the trigger list.
        let divElement = document.getElementById('rparams');
        divElement.scrollTop = divElement.scrollHeight;
    }
}

function getImageSize() {
    let selection = SelectedObjects;
    let id;

    if (selection[0]._class == "bg") {
        id = selection[0].pm.m;
    }

    if (selection[0]._class == "decor") {
        id = selection[0].pm.model;
    }

    if (typeof id == "string") {
        let img = document.createElement("img");

        img.onload = function() {
            let w = img.width;
            let h = img.height;

            img.remove();

            alert("W: " + w + "\nH: " + h);
        }

        img.onerror = function() {
            img.remove();

            alert("Image not found.");
        }

        img.src = "https://www.plazmaburst2.com/mimage_cache.php?image_id=" + id.slice(1);
    } else {
        alert("Image not found.");
    }
}

function getImageData() {
    return new Promise((res, err) => {
        let selection = SelectedObjects;
        let id;

        if (selection[0]._class == "bg") {
            id = selection[0].pm.m;
        }

        if (selection[0]._class == "decor") {
            id = selection[0].pm.model;
        }

        if (typeof id == "string") {
            let img = document.createElement("img");

            img.onload = function() {
                let w = img.width;
                let h = img.height;

                let canvas = document.createElement("canvas");
                let ctx = canvas.getContext("2d");

                canvas.width = img.width;
                canvas.height = img.height;

                ctx.beginPath();
                ctx.drawImage(img, 0, 0);
                ctx.closePath();

                res([ctx.getImageData(0, 0, w, h).data, w]);
            }

            img.onerror = function() {
                img.remove();

                alert("Image not found.");

                res(1);
            }

            img.src = "https://www.plazmaburst2.com/mimage_cache.php?image_id=" + id.slice(1);
        } else {
            alert("Image not found.");

            res(1);
        }
    });
}

function getImagePosition(data, w) {
    let arrX = [];
    let arrY = [];

    let minX;
    let minY;
    let maxX;
    let maxY;

    let centerX = 0;
    let centerY = 0;

    if (data != 1) {
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] >= 3) {
                let x = (i / 4) % w;
                let y = Math.floor(i / 4 / w);

                arrX.push(x);
                arrY.push(y);
            }
        }

        minX = Math.min(...arrX);
        minY = Math.min(...arrY);
        maxX = Math.max(...arrX);
        maxY = Math.max(...arrY);

        centerX = (minX + maxX) / 2;
        centerY = (minY + maxY) / 2;
    }

    return {
        x: centerX,
        y: centerY
    }
}

function setDecorOffset(x, y) {
    let selection = SelectedObjects;

    selection[0].pm.u = x;
    selection[0].pm.v = y;
}

function centerImageX() {
    let selection = SelectedObjects;

    if (selection.length == 1) {
        if (selection[0]._class == "decor") {
            getImageData().then(res => {
                if (res != 1) {
                    let center = getImagePosition(res[0], res[1]);
                    let x = center.x;

                    setDecorOffset(-x, selection[0].pm.v);
                }
            });
        }
    }

    need_redraw = true;
    need_GUIParams_update = true;
}

function centerImageY() {
    let selection = SelectedObjects;

    if (selection.length == 1) {
        if (selection[0]._class == "decor") {
            getImageData().then(res => {
                if (res != 1) {
                    let center = getImagePosition(res[0], res[1]);
                    let y = center.y;

                    setDecorOffset(selection[0].pm.u, -y);
                }
            });
        }
    }

    need_redraw = true;
    need_GUIParams_update = true;
}

function addFunctionToWindow() {
    window.getImageSize = getImageSize;
    window.centerImageX = centerImageX;
    window.centerImageY = centerImageY;
    window.addTriggerActionCount = addTriggerActionCount;
}

let targetElement;

document.addEventListener("mousedown", e => {
    targetElement = e.target;
});

document.addEventListener("keydown", e => {
    if (letediting || ignore_keys) return;

    if(e.ctrlKey && e.code == "KeyA" && !["TEXTAREA", "INPUT"].includes(e.target.nodeName)) {
        window.es.forEach(e => {
            if((e.exists) && (e._isphysical) && (MatchLayer(e))) {
                e.selected = true;
            }
        });
        window.need_redraw = true;
        window.need_GUIParams_update = true;
    }
    if (e.ctrlKey && e.code == "KeyS" && canvas_focus) {
        e.preventDefault();
        document.getElementsByClassName("field_btn")[0].click();
    }

    if (e.ctrlKey && e.code == "KeyF" && canvas_focus) {
        e.preventDefault();

        let name = prompt("Find objects:", "");

        if (name !== null && name !== "") {
            let notFound = findObjects(name);

            if (notFound) {
                alert("Nothing found.");
            }
        }
    }

    if (e.code == "KeyR" && targetElement != "[object HTMLInputElement]" && targetElement.id != "opcode_field") {
        rotateObjects();
    }

    if ((e.code == "Minus" || e.code == "NumpadSubtract") && e.ctrlKey && canvas_focus) {
        e.preventDefault();

        zoom *= 2;
        zoom_validate();
        need_redraw = true;
    }

    if ((e.code == "Equal" || e.code == "NumpadAdd") && e.ctrlKey && canvas_focus) {
        e.preventDefault();

        zoom *= 0.5;
        zoom_validate();
        need_redraw = true;
    }

    if (e.ctrlKey && e.altKey) {
        e.preventDefault();

        zoom = 1;
        zoom_validate();
        need_redraw = true;
    }

    if (e.code == "KeyH" && e.ctrlKey) {
        e.preventDefault();

        if (targetElement.id === "opcode_field") {
            let value = targetElement.value;

            let str1 = prompt("Enter string to replace from:", "");
            if (!str1) return;

            let str2 = prompt("Enter string to replace to:", str1);
            if (!str2) return;

            targetElement.value = value.replaceAll(str1, str2);
        }
    }

    if (e.code == "Enter" && targetElement != "[object HTMLInputElement]" && targetElement.id != "opcode_field" && canvas_focus) {
        let selected = SelectedObjects;

        if (selected.length != 0) {
            let param = prompt("Enter parameter name:", "");

            if (param) {
                let expression = prompt("Enter expression:", "");

                if (expression) {
                    param = param.toLowerCase().replace("width", "w").replace("height", "h");

                    for (let i = 0; i < selected.length; i++) {
                        let x = selected[i].pm.x;
                        let y = selected[i].pm.y;
                        let w = selected[i].pm.w;
                        let h = selected[i].pm.h;

                        if (x === undefined) {
                            x = 0;
                        }

                        if (y === undefined) {
                            y = 0;
                        }

                        if (w === undefined) {
                            w = 0;
                        }

                        if (h === undefined) {
                            h = 0;
                        }

                        if (selected[i].pm[param] !== undefined) {
                            let parsed = alescriptParse(expression, [x, y, w, h, i]);

                            if (typeof parsed == "number") {
                                for (let j = 0; j < selected.length; j++) {
                                    selected[j].selected = false;
                                }

                                selected[i].selected = true;

                                UpdatePhysicalParam(param, parsed);
                            }

                            for (let j = 0; j < selected.length; j++) {
                                selected[j].selected = true;
                            }
                        }
                    }

                    need_GUIParams_update = true;
                }
            }
        }
    }

    if (e.altKey) {
        e.preventDefault();
    }

    if (e.altKey && targetElement == "[object HTMLInputElement]") {
        let selected = SelectedObjects;

        if (selected.length == 1) {
            let x = selected[0].pm.x;
            let y = selected[0].pm.y;
            let w = selected[0].pm.w;
            let h = selected[0].pm.h;

            if (x === undefined) {
                x = 0;
            }

            if (y === undefined) {
                y = 0;
            }

            if (w === undefined) {
                w = 0;
            }

            if (h === undefined) {
                h = 0;
            }

            // i is undefined and i'm pretty sure it's not supposed to be like that. so this definitely doesn't work how it should.
            // i'll just leave it cuz idk how it's supposed to be and it doesn't throw an error because of some implicit globals from vanilla ale
            let parsed = alescriptParse(targetElement.value, [x, y, w, h, i]);

            if (typeof parsed == "number") {
                targetElement.value = parsed;
            }
        }
    }

    if (e.ctrlKey && e.code == "KeyP") {
        e.preventDefault();

        copyToPermanentClipboard();
    }
});

function doTooltip() {
    let tooltip = document.createElement("p");
    tooltip.id = "alei-tooltip";

    document.body.append(tooltip);

    document.addEventListener("mousemove", e => {
        if (e.target.title) {
            e.target.dataset.title = e.target.title;
            e.target.title = "";
        }

        if (e.target.parentElement.title) {
            e.target.parentElement.dataset.title = e.target.parentElement.title;
            e.target.parentElement.title = "";
        }
        let leftOffset = 150

        if (e.target.dataset.title) {
            let to = e.target.dataset.title.length
            tooltip.style.left = to + leftOffset + e.clientX + 20 + "px";
            tooltip.innerHTML = e.target.dataset.title;

            if (tooltip.getBoundingClientRect().height != 31) {
                tooltip.style.left = to + leftOffset + e.clientX - 20 - tooltip.getBoundingClientRect().width + "px";
            }
        } else if (e.target.parentElement.dataset.title) {
            let to = e.target.parentElement.dataset.title.length
            tooltip.style.left = to + leftOffset + e.clientX + 20 + "px";
            tooltip.style.top = e.clientY + "px";
            tooltip.innerHTML = e.target.parentElement.dataset.title;

            if (tooltip.getBoundingClientRect().height != 31) {
                tooltip.style.left = to + leftOffset + e.clientX - 20 - tooltip.getBoundingClientRect().width + "px";
            }
        } else {
            tooltip.style.left = -100 + leftOffset + "px";
            tooltip.style.top = "-100px";
        }
    });
    aleiLog(logLevel.DEBUG, "Added tooltip.")
}

function handleMultipleImages( files ) {
    for (let file of files) {
        let arg = {target: {files: [file]}};
        handleImage(arg); // Call original function
    }
};

function patchDecorUpload() {
    // Allows for multiple uploads.
    let imageLoader = $id("imageLoader");
    // First we make it allow multiple files and remove original event listener.
    imageLoader.setAttribute("multiple", true);
    imageLoader.removeEventListener("change", handleImage);
    // Then we register our own.
    imageLoader.addEventListener("change", function(e) {
        let files = e.target.files;
        NewNote(`ALEI: Will upload ${files.length} bg/decor(s).`, "#2595FF");
        handleMultipleImages( files );
    }, false)
}

function patchMrCustomImage() {
    let mrcustom_image = $id("mrcustom_image");

    mrcustom_image.ondragover = function( event ) {
        event.preventDefault(); //  Prevent from accidentally opening files

        //  I have no idea how will I style this for accessibility
        // mrcustom_image.className = "mrpopup drag-over";
    };
    mrcustom_image.ondragleave = function( event ) {
        mrcustom_image.className = "mrpopup";
    };

    mrcustom_image.ondrop = function( event ) {
        event.preventDefault(); //  Prevent from accidentally opening files
        
        handleMultipleImages( event.dataTransfer.files );
    };
};

///////////////////////////////

function updateBoxSplitterSize() {
    let obj = $id("gui_objbox");
    let rect = obj.getBoundingClientRect();
    let style = splitter2.style;
    style.setProperty("width", rect.width);
    style.setProperty("left", rect.x);
    style.setProperty("top", rect.bottom);
}

function addObjBoxResize() {
    let obj = $id("gui_objbox");
    let splitter = document.createElement("div");
    window.splitter2 = splitter;
    let style = splitter.style;
    $id("floattag").appendChild(splitter);

    style.setProperty("position", "absolute");
    style.setProperty("height", "5px");
    style.setProperty("cursor", "s-resize");

    updateBoxSplitterSize();

    let splitterClicking = false;
    splitter.onmousedown = ((e) => {splitterClicking = true});
    ROOT_ELEMENT.addEventListener("mouseup", (e) => {splitterClicking = false});
    ROOT_ELEMENT.addEventListener("mousemove", (e) => {
        if (!splitterClicking) return;

        let new_height = e.clientY - 90;
        obj.style.height = new_height;
        updateBoxSplitterSize();
        ShowHideObjectBox();
        ShowHideObjectBox();
    });
    aleiLog(logLevel.DEBUG, "Added splitter for object box.");
}

function patch_m_down() {
    // entity.selected fix for when object creation is undone (1/2)
    // adds the line "ACTION_add_undo('es['+newid+'].selected=false;');" into the block that starts from "if ('x' in newbie.pm)"
    let oldCode = m_down.toString();
    let newCode = oldCode.replace(
        /if\s*\(\s*(['"`])x\1\s*in\s+newbie.pm\s*\)\s*\{(?<indent>\s*)/,
        `if ('x' in newbie.pm) {$<indent>ACTION_add_undo('es['+newid+'].selected=false;');$<indent>`
    );
    if (oldCode === newCode) {
        aleiLog(logLevel.WARN, "m_down direct code replacement failed (selected fix)");
    }
    let og_mdown = eval("(" + newCode + ")");

    window.m_down = function(e) {
        let previousEsLength = es.length;
        og_mdown(e);

        if (es.length > previousEsLength) { // New element is made.
            onEntitiesCreated(es.slice(previousEsLength));

            // Now we just update.
            window.need_GUIParams_update = true;
            UpdateGUIObjectsList();
        }
    }
}

// directly copied from the code except for a few changes (checking x1 !== 0 || y1 !== 0, calling spawnAreas.scheduleUpdate)
function patch_m_move() {
    window.m_move = function(e) {
        if (e != undefined)
            m_update(e);

        if (m_mistake_drag) {
            if (Math.abs(mouse_x - m_drag_x) > GRID_SNAPPING * 0.5 || Math.abs(mouse_y - m_drag_y) > GRID_SNAPPING * 0.5) {
                m_mistake_drag = false;
            }
        }
        else {
            if (m_drag_screen) {
                var x1, y1;

                x1 = s2w_w(m_drag_x - mouse_x);
                y1 = s2w_h(m_drag_y - mouse_y);

                m_drag_x = mouse_x;
                m_drag_y = mouse_y;

                dis_from_x += x1;
                dis_to_x += x1;
                dis_from_y += y1;
                dis_to_y += y1;
            }
            if (m_drag_selected) {
                var x1, y1;
                x1 = Math.round((mouse_wx - m_drag_wx) / GRID_SNAPPING) * GRID_SNAPPING;
                y1 = Math.round((mouse_wy - m_drag_wy) / GRID_SNAPPING) * GRID_SNAPPING;
                if (x1 !== 0 || y1 !== 0) {
                    for (var i = 0; i < es.length; i++)
                        if (es[i].exists)
                            if (MatchLayer(es[i]) || paint_draw_mode)
                                if (es[i].selected)
                                    if (es[i]._isphysical) {
                                        es[i].pm.x += x1;
                                        es[i].pm.y += y1;
                                        if (aleiSettings.renderSpawnAreas && spawnAreas.classes.has(es[i]._class)) spawnAreas.scheduleUpdate();
                                        if (es[i]._class === "box") wallTextures.setDirty(); 
                                    }
                    m_drag_wx += x1;
                    m_drag_wy += y1;
                }
            }
            if (m_drag_resize) {
                var x1, y1;
                x1 = Math.round((mouse_wx - m_drag_wx) / GRID_SNAPPING) * GRID_SNAPPING;
                y1 = Math.round((mouse_wy - m_drag_wy) / GRID_SNAPPING) * GRID_SNAPPING;
                if (x1 !== 0 || y1 !== 0) {
                    for (var i = 0; i < es.length; i++)
                        if (es[i].exists)
                            if (MatchLayer(es[i]) || paint_draw_mode)
                                if (es[i].selected)
                                    if (es[i]._isphysical)
                                        if (es[i]._isresizable) {
                                            if (m_drag_moveresize == 'LT' || m_drag_moveresize == 'L' || m_drag_moveresize == 'LB') {
                                                es[i].pm.x += x1;
                                                es[i].pm.w -= x1;
                                            }
                                            if (m_drag_moveresize == 'RT' || m_drag_moveresize == 'R' || m_drag_moveresize == 'RB') {
                                                es[i].pm.w += x1;
                                            }
                                            if (m_drag_moveresize == 'LT' || m_drag_moveresize == 'T' || m_drag_moveresize == 'RT') {
                                                es[i].pm.y += y1;
                                                es[i].pm.h -= y1;
                                            }
                                            if (m_drag_moveresize == 'LB' || m_drag_moveresize == 'B' || m_drag_moveresize == 'RB') {
                                                es[i].pm.h += y1;
                                            }
                                            es[i].fixPos();

                                            if (aleiSettings.renderSpawnAreas && spawnAreas.classes.has(es[i]._class)) spawnAreas.scheduleUpdate();
                                            if (es[i]._class === "box") wallTextures.setDirty(); 
                                        }
                    m_drag_wx += x1;
                    m_drag_wy += y1;
                }
            }
        }
        need_redraw = true;

        UpdateOpacities();
    }
}

function PasteFromClipBoard(ClipName) {
    var clipboard = new Object();
    if (sessionStorage[ClipName] == undefined) {
        return false;
    }
    clipboard = unserialize(sessionStorage[ClipName]);
    ACTION_cancel();
    for (let i = 0; i < es.length; i++)
        if (es[i].exists) {
            if (es[i].selected) {
                ACTION_add_redo('es[' + i + '].selected=false;');
                ACTION_add_undo('es[' + i + '].selected=true;');
                es[i].selected = false;
            }
        }
    var min_x = 0;
    var max_x = 0;
    var min_y = 0;
    var max_y = 0;
    let i = 0;
    var from_obj = es.length;
    while (typeof(clipboard[i]) !== 'undefined') {
        var newparam = es.length;

        // entity.selected fix for when object creation is undone (2/2)
        ACTION_add_redo('es[' + newparam + '].selected=true;');
        ACTION_add_undo('es[' + newparam + '].selected=false;');

        ACTION_add_redo('es[' + newparam + '].exists=true;');
        ACTION_add_undo('es[' + newparam + '].exists=false;');
        es[newparam] = new E(clipboard[i]._class);
        for (let param in clipboard[i]) {
            es[newparam][param] = clipboard[i][param];
        }
        if (typeof(es[newparam].pm.x) !== 'undefined')
            if (typeof(es[newparam].pm.y) !== 'undefined') {
                if (i == 0) {
                    min_x = es[newparam].pm.x;
                    min_y = es[newparam].pm.y;
                    max_x = es[newparam].pm.x;
                    max_y = es[newparam].pm.y;
                    if (typeof(es[newparam].pm.w) !== 'undefined')
                        if (typeof(es[newparam].pm.h) !== 'undefined') {
                            min_x += es[newparam].pm.w / 2;
                            max_x += es[newparam].pm.w / 2;
                            min_y += es[newparam].pm.h / 2;
                            max_y += es[newparam].pm.h / 2;
                        }
                } else {
                    min_x = Math.min(min_x, es[newparam].pm.x);
                    min_y = Math.min(min_y, es[newparam].pm.y);
                    max_x = Math.max(max_x, es[newparam].pm.x);
                    max_y = Math.max(max_y, es[newparam].pm.y);
                    if (typeof(es[newparam].pm.w) !== 'undefined')
                        if (typeof(es[newparam].pm.h) !== 'undefined') {
                            max_x = Math.max(max_x, es[newparam].pm.x + es[newparam].pm.w);
                            max_y = Math.max(max_y, es[newparam].pm.y + es[newparam].pm.h);
                        }
                }
            }
        i++;
    }
    ACTION_add_redo('m_drag_selected=true;');
    ACTION_add_redo('paint_draw_mode=true;');
    ACTION_add_redo('quick_pick_ignore_one_click=true;');
    ACTION_add_undo('m_drag_selected=false;');
    ACTION_add_undo('paint_draw_mode=false;');
    ACTION_add_undo('quick_pick_ignore_one_click=false;');
    m_drag_selected = true;
    paint_draw_mode = true;
    quick_pick_ignore_one_click = true;
    m_drag_wx = mouse_wx;
    m_drag_wy = mouse_wy;
    // Original code by Prosu
    let m_pos_x = mouse_wx;
    let m_pos_y = mouse_wy;

    m_drag_x = mouse_x;
    m_drag_y = mouse_y;
    let m_down_x = m_pos_x;
    let m_down_y = m_pos_y;
    var x1 = Math.round((m_pos_x) / GRID_SNAPPING) * GRID_SNAPPING;
    var y1 = Math.round((m_pos_y) / GRID_SNAPPING) * GRID_SNAPPING;
    var offset_x = Math.round((x1 - (min_x + max_x) / 2) / GRID_SNAPPING) * GRID_SNAPPING;
    var offset_y = Math.round((y1 - (min_y + max_y) / 2) / GRID_SNAPPING) * GRID_SNAPPING;

    for (let i2 = from_obj; i2 < es.length; i2++) {
        if (typeof(es[i2].pm.uid) !== 'undefined') {
            var old_uid = es[i2].pm.uid;
            es[i2].exists = false;
            es[i2].pm.uid = RandomizeName(es[i2].pm.uid);
            es[i2].exists = true;


            for (let i3 = from_obj; i3 < es.length; i3++) {
                const newUID = es[i2].pm.uid;
                // update uid references to the new uid
                for (const param in es[i3].pm) {
                    if (param != "uid" && typeof es[i3].pm[param] != "object") {
                        es[i3].pm[param] = replaceParamValueUID(es[i3].pm[param], old_uid, newUID);
                    }
                }

                // replace uid references in additional trigger actions
                if (es[i3].pm.extended && window.ExtendedTriggersLoaded) {
                    for (let i4 = 0; i4 < es[i3].pm.additionalActions.length; i4++) {
                        es[i3].pm.additionalParamA[i4] = replaceParamValueUID(es[i3].pm.additionalParamA[i4], old_uid, newUID);
                        es[i3].pm.additionalParamB[i4] = replaceParamValueUID(es[i3].pm.additionalParamB[i4], old_uid, newUID);
                    }
                }
            }
        }
        if (typeof(es[i2].pm.x) !== 'undefined')
            if (typeof(es[i2].pm.y) !== 'undefined') {
                ACTION_add_undo('es[' + i2 + '].pm.x=' + es[i2].pm.x + ';');
                ACTION_add_undo('es[' + i2 + '].pm.y=' + es[i2].pm.y + ';');
                es[i2].pm.x += offset_x;
                es[i2].pm.y += offset_y;
                es[i2].fixPos();
                ACTION_add_redo('es[' + i2 + '].pm.x=' + es[i2].pm.x + ';');
                ACTION_add_redo('es[' + i2 + '].pm.y=' + es[i2].pm.y + ';');
            }
    }

    // update ocm and stuff after old uids have been replaced with new unique uids and uid references have been updated
    onEntitiesCreated(es.slice(from_obj));

    // Again by Prosu
    x1 = Math.round((m_pos_x - m_down_x) / GRID_SNAPPING) * GRID_SNAPPING;
    y1 = Math.round((m_pos_y - m_down_y) / GRID_SNAPPING) * GRID_SNAPPING;
    for (let i = 0; i < es.length; i++) {
        if (es[i]._isphysical && es[i].exists && es[i].selected && (MatchLayer(es[i]) || paint_draw_mode)) {
            es[i].pm.x += x1;
            es[i].pm.y += y1;
        }
    }
    m_down_x += x1;
    m_down_y += y1;
    ACTION_finalize(false);
    assignObjectIDs();
    assignObjectPriority();
    window.need_redraw = true;
    window.need_GUIParams_update = true;
    return true;
}

function decodeUnicode(string) {
    if(typeof string != 'string') return string;

    const regex = /\\u([a-zA-Z0-9]{4})/g;
    return string.replaceAll(regex, (match, group) => String.fromCharCode(parseInt(group, 16)));;
}

function ServerRequest_handleMapData(mapCode) {    
    // Branch of patchServerRequest
    // Made to deal with map source related things.
    aleiLog(logLevel.DEBUG, "Parsing map source now.");

    const objectKeyValueRegex = /(\w+)=((-?\d+(\.\d+)?)|("[ -~]*")|true|false)/;
    const objectCreationRegex = /q=es\[\d+\]=new E\("(\w+)"\)/;

    let expressions = mapCode.split(";\n");

    let currentElement = null;

    window.es = new Array(); // clear.
    let index = 2; // We skip var q; and es = new Array();
    for (;index < expressions.length; index++) {
        let expression = expressions[index];

        // Skip if it's just only tab or newlines
        if(expression.replaceAll("\n", "").replaceAll("\t", "").length == 0) {continue};

        // Map ID related stuff.
        if (expression.indexOf("mapid = '") != -1) {
            window.mapid = expression.split(" = ")[1].slice(1, -1);
            mapid_field.value = mapid;
            continue;
        }
        else if (expression == "\t\tmapid_field.value = mapid") {continue;}
        else if (expression.indexOf("maprights.innerHTML='") != -1) {
            let rights = expression.split(";")[0].split(".innerHTML=")[1].slice(1, -1);
            maprights.value = rights;
            NewNote(`Map '${mapid}' has been successfully loaded.`, note_good);
            continue
        }
        // Actual mapdata.
        if(expression.indexOf(";q=q.pm;") != -1) { // Creation which is q=es[...]=new E(...);q=q.pm;q.(...)=(...);
            let creation = objectCreationRegex.exec(expression);
            currentElement = new E(creation[1]);
            es[es.length] = currentElement;

            let splt = expression.split(";");
            if (splt.length > 3) {
                // There is supposed to be only 3 ;'s
                // initializing;setting;firstProperty
                // Assuming that server only gives first property and does not send more than 1 in creation line
                aleiLog(logLevel.WARN, `Expected 3 items, got ${splt.length} - ${splt}`);
                continue;
            }
            expression = splt[2];
        };
        // Key value
        // In format of q.(___)=(___);
        let matchKeyValue = objectKeyValueRegex.exec(expression);

        if (matchKeyValue === null) {
            aleiLog(logLevel.WARN, `Unable to figure out what kind of code is "${expression}", you MIGHT have issues.`);
            continue;
        }
        let key = matchKeyValue[1];
        let value = matchKeyValue[2].replaceAll("\\/", "/");
        if (value[0] != '"') { // Not a string.
            if (value == "true") value = true;
            else if(value == "false") value = false;
            else if(value.indexOf(".") != -1) value = parseFloat(value);
            else value = parseInt(value);
        } else {
            // Is a string. We just strip quotation marks and fix apostrophes.
            value = value.slice(1, -1).replaceAll("\\'", "'");
        }
        currentElement.pm[key] = decodeUnicode(value);
    }

    if (aleiSettings.extendedTriggers) parseAllExtendedTriggers();
}

// response may also be a patch due to the fact that eval is patched. the result of the eval has to be returned so that functions get patched properly
function handleServerRequestResponse(request, operation, response) {
    let evalResult = undefined;
    if (response.indexOf("var es = new Array();") != -1) {
        clearSelectedObjects();
        try{
            ServerRequest_handleMapData(response);
        }
        catch (e) {
            NewNote("ALEI: Failed to load map", note_bad);
            console.error(e);
        }
        sortEntitiesBetter();
        getALEIMapDataFromALEIMapDataObject(); //map data object >>> aleiMapData
        loadALEIMapDataIntoUse(); //aleiMapData >>> data in use
        loadUIDMap();
        loadParameterMap();
        if (aleiSettings.ocmEnabled) loadOCM();
        if (aleiSettings.renderSpawnAreas) spawnAreas.scheduleUpdate();
        wallTextures.setDirty();
    }else if (response.indexOf("knownmaps = [") !== -1) {
        window.knownmaps = [];
        for (let map of response.match(/"(.*?)"/g)) {
            knownmaps.push(map.slice(1, -1))
        }
        aleiLog(logLevel.DEBUG, `Updated knownmaps with ${knownmaps.length} maps`);
    }else if (response.startsWith('console.warn("Only custom images can be requested in this way')) {
        // remove debugger annoyance and fix potential vulnerability
        const idMatch = response.match(/\\"(.*?)\\" requested\."\);/s);
        console.warn(`Only custom images can be requested in this way, but "${idMatch?.[1]}" requested.`);
    }else {
        aleiLog(logLevel.VERBOSE, `Evaling for request ${ANSI_YELLOW}"${request}"${ANSI_RESET} with operation of ${ANSI_YELLOW}"${operation}"${ANSI_RESET}: ${response}`)
        try {evalResult = JS_eval(response);}
        catch(e) {
            NewNote("Eval error!", note_bad);
            console.error(e);
            aleiLog(logLevel.INFO, `Eval Error from ${request}, for op ${operation} whose response is ${response}`);
        }
    };
    return evalResult;
}

function makeRequest(method, url, data) {
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve({status: 200, response: xhr.response});
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        xhr.send(data);
    });
}

function updateDecorList() {
    try {
        let list_native = $id("list_native");
        for (const {model, name, src1} of ALEI_decors) {
            list_native.innerHTML += `
                    <div class="img_option" onClick="CustomImageSelected('${model}', '${name}' )">
                       <div class="imgdiv" style="background:url(${src1})"></div>
                       <div>
                         ${name}
                       </div>
                    </div>
                    `
        }
        aleiLog(logLevel.DEBUG, "Updated decor list.");
    }
    catch(e) {} // We assume we are not in decor list yet.
}

async function updateCharList() {
    const listNative = document.getElementById("list_native");
    if (listNative === null) return;

    // remake list of native chars to add and rename chars
    let html = "";
    for (const {id, name} of allChars) {
        const safeName = name.replaceAll("'", "\\'");
        html += `
            <div 
                class="img_option"
                onclick="CustomImageSelected('${id}', '${safeName}' )"
                oncontextmenu="ImageContext(${id},0,event,'${safeName}',this,false,true,'Eric Gurt','-')"
            >
                <div class="skindiv" style="background:url(chars_full/char${id.toString().padStart(4, "0")}.png)"></div>
                <div>${name}</div>
            </div>
        `;
    }
    listNative.innerHTML = html;

    // add custom skin preview
    const customCharListElements = [
        document.getElementById("list_favorites"),
        document.getElementById("list_approved"),
        document.getElementById("list_personal_approved"),
        document.getElementById("list_personal"),
    ];
    for (const listElement of customCharListElements) {
        for (const skinDiv of listElement.getElementsByClassName("custom_skin_div")) {
            const charID = skinDiv.firstElementChild.style.backgroundImage.slice(-7, -2);
            skinDiv.dataset.charId = charID;
            skinDiv.innerHTML = "";
            getCustomCharImage(charID).then((img) => {
                skinDiv.innerHTML = `<div style="background-image:url(${img.src}); background-position: 0% 50%; background-size: 130%;"></div>`;
            });
        }
    }
}

async function ALEI_ServerRequest(request, operation, callback = null) {
    let response = await makeRequest("POST", `e_server.php?a=${request_a}`, request);

    if (response.status != 200) {
        if (operation == 'save') NewNote('Oops! Error occoured during saving. Usually it may be happening due to connection problems. Map will be temporary saved to your computer\'s LocalStorage', note_bad);
        else if (operation == 'load') NewNote('Oops! Error occoured durning loading. Usually it may be happening due to connection problems.', note_bad)
        return;
    }

    try {
        handleServerRequestResponse(request, operation, response.response);
        if (operation === "update_images") {
            if (window.last_for_class === "decor_model") {
                updateDecorList();
            }
            else if (window.last_for_class === "char") {
                updateCharList();
            }
            window.ImageContext = ImageContextMenu;
        }
        if (operation == 'save' || operation == 'load') {
            changes_made = false;
            if (operation == 'load') {
                need_redraw = true;
                need_GUIParams_update = true;
                ClearUndos();
            }
        }
    } catch (e) {
        console.error(e);
        NewNote('Server responds with unclear message. Looks like one of recent actions wasn\'t successful.', note_bad);
        debugger;
    }

    if (callback != null) {
        callback();
    }
}

let _serverRequestPatched = false;
function patchServerRequest() {
    // This code just exists to prevent logging more than once
    if (_serverRequestPatched) return;
    _serverRequestPatched = true;
    // Patches ServerRequest function.
    // vanilla ServerRequest function literally eval()'s every single thing that server sends.
    // Which opens up to expected vulnerabilities.
    // Hopefully in future, ALEI will completely get rid of eval.
    window.ServerRequest = ALEI_ServerRequest;

    // wait for requests to finish and unpatch eval
    (function recheck() {
        if (Object.keys(window.same_request_blocking).length === 0) {
            window.eval = JS_eval;
            aleiLog(logLevel.DEBUG, "Unpatched eval");
        }
        else {
            setTimeout(recheck, 50);
        }
    })();

    aleiLog(logLevel.DEBUG, "Patched ServerRequest");
}

window.eval = function(code) { // Temporarily overriding eval so we can patch ServerRequest as early as possible
    if (window.ServerRequest !== undefined) {
        patchServerRequest();
    }
    return handleServerRequestResponse(null, null, code); // return in case "code" is a patch
};

function patchEvalSet() {
    window.EvalSet = function(key, value) {
        // No evaling. Death to eval! (except for when i want to use it...)
        window[key] = value;
        UpdateTools();
    }
    aleiLog(logLevel.DEBUG, "Patched EvalSet");
}

function patchTeamList() {
    for (let entry of Object.entries(VAL_TABLE["team"])) {
        let teamID = parseInt(entry[0]);
        let teamName = entry[1];

        if (teamID < 0) {
            teamName = teamName.replace("(no friendly fire)", "(No collision, Yes friendly fire)")
            VAL_TABLE["team"][teamID] = teamName;
        }

        if (teamID === -1) continue;
        VAL_TABLE["team+any"][teamID] = teamName;
    }
    aleiLog(logLevel.DEBUG, "Edited team list..");
}

function addProjectileModels() {
    let projectileModels = VAL_TABLE["ALEI_projectileModels"] = {
        1: "https://static.miraheze.org/plazmaburstwiki/6/6a/Lazer_1.png",
        2: "https://static.miraheze.org/plazmaburstwiki/a/ae/Lazer_2.png",
        3: "https://static.miraheze.org/plazmaburstwiki/0/06/Lazer_3.png",
        4: "https://static.miraheze.org/plazmaburstwiki/d/de/Lazer_4.png",
        5: "https://static.miraheze.org/plazmaburstwiki/8/8f/Lazer_5.png",
        6: "https://static.miraheze.org/plazmaburstwiki/a/a0/Lazer_6.png",
        7: "https://static.miraheze.org/plazmaburstwiki/7/71/Lazer_7.png",
        8: "https://static.miraheze.org/plazmaburstwiki/c/c6/Lazer_8.png",
        9: "https://static.miraheze.org/plazmaburstwiki/d/d2/Lazer_9.png",
        10: "https://static.miraheze.org/plazmaburstwiki/5/5b/Lazer_10.png",
        11: "https://static.miraheze.org/plazmaburstwiki/d/d2/Lazer_11.png",
        12: "https://static.miraheze.org/plazmaburstwiki/2/2d/Lazer_12.png",
        13: "https://static.miraheze.org/plazmaburstwiki/b/be/Lazer_13.png",
        14: "https://static.miraheze.org/plazmaburstwiki/1/14/Lazer_14.png",
        15: "", // Empty projectile.
        16: "https://static.miraheze.org/plazmaburstwiki/7/7f/Lazer_16.png",
        17: "https://static.miraheze.org/plazmaburstwiki/3/31/Lazer_17.png",
        18: "https://static.miraheze.org/plazmaburstwiki/8/89/Lazer_18.png",
        19: "https://static.miraheze.org/plazmaburstwiki/f/fe/Lazer_19.png",
        20: "https://static.miraheze.org/plazmaburstwiki/1/1a/Lazer_20.png",
        21: "https://static.miraheze.org/plazmaburstwiki/4/42/Lazer_21.png",
        22: "https://static.miraheze.org/plazmaburstwiki/c/c0/Lazer_22.png",
        23: "https://static.miraheze.org/plazmaburstwiki/d/d9/Lazer_23.png",
        24: "https://static.miraheze.org/plazmaburstwiki/f/f5/Lazer_24.png",
        25: "https://static.miraheze.org/plazmaburstwiki/7/7c/Lazer_25.png",
        26: "https://static.miraheze.org/plazmaburstwiki/a/a7/Lazer_26.png",
        27: "https://static.miraheze.org/plazmaburstwiki/3/30/Lazer_27.png",
        28: "https://static.miraheze.org/plazmaburstwiki/3/3a/Lazer_28.png",
        29: "https://static.miraheze.org/plazmaburstwiki/9/90/Lazer_29.png",
        30: "https://static.miraheze.org/plazmaburstwiki/2/23/Lazer_30.png",
        31: "https://static.miraheze.org/plazmaburstwiki/3/3a/Lazer_31.png",
        32: "https://static.miraheze.org/plazmaburstwiki/f/f0/Lazer_32.png",
        33: "https://static.miraheze.org/plazmaburstwiki/0/0d/Lazer_33.png",
        34: "https://static.miraheze.org/plazmaburstwiki/c/c8/Lazer_34.png",
        35: "https://static.miraheze.org/plazmaburstwiki/3/38/Lazer_35.png",
        36: "https://static.miraheze.org/plazmaburstwiki/6/6d/Lazer_36.png",
        37: "https://static.miraheze.org/plazmaburstwiki/a/a9/Lazer_37.png",
        38: "https://static.miraheze.org/plazmaburstwiki/e/e7/Lazer_38.png",
        39: "https://static.miraheze.org/plazmaburstwiki/6/6c/Lazer_39.png",
        40: "https://static.miraheze.org/plazmaburstwiki/d/d4/Lazer_40.png",
        41: "https://static.miraheze.org/plazmaburstwiki/5/5d/Lazer_41.png",
        42: "https://static.miraheze.org/plazmaburstwiki/9/9d/Lazer_42.png",
        43: "https://static.miraheze.org/plazmaburstwiki/7/79/Lazer_43.png",
        44: "https://static.miraheze.org/plazmaburstwiki/6/6d/Lazer_44.png",
        45: "https://static.miraheze.org/plazmaburstwiki/4/44/Lazer_45.png",
        46: "https://static.miraheze.org/plazmaburstwiki/3/3b/Lazer_46.png",
        47: "https://static.miraheze.org/plazmaburstwiki/8/84/Lazer_47.png",
        48: "https://static.miraheze.org/plazmaburstwiki/7/75/Lazer_48.png",
        49: "https://static.miraheze.org/plazmaburstwiki/0/08/Lazer_49.png",
        50: "https://static.miraheze.org/plazmaburstwiki/4/41/Lazer_50.png",
        51: "https://static.miraheze.org/plazmaburstwiki/9/92/Lazer_51.png",
        52: "https://static.miraheze.org/plazmaburstwiki/9/92/Lazer_52.png",
        53: "https://static.miraheze.org/plazmaburstwiki/7/70/Lazer_53.png",
        54: "https://static.miraheze.org/plazmaburstwiki/e/ee/Lazer_54.png",
        55: "https://static.miraheze.org/plazmaburstwiki/d/d1/Lazer_55.png"
    };
    for (let i = 1; i < 56; i++) {
        projectileModels[i] = `<img src='${projectileModels[i]}' style='width: 60px; height: 20px'/>`;
    }
    aleiLog(logLevel.DEBUG, "Loaded projectile models.");
}

function patchSpecialValue() {
    // add case for gun+none type
    {
        const oldCode = window.special_value.toString();
        const newCode = oldCode.replace("case 'door+none':", `case 'door+none': case 'gun+none':`);
        if (newCode === oldCode) {
            aleiLog(logLevel.WARN, "special_value direct code replacement failed (gun+none)");
        } else {
            window.special_value = eval(`(${newCode})`);
        }
    }

    // add case for vehicle+none type
    {
        const oldCode = window.special_value.toString();
        const newCode = oldCode.replace("case 'door+none':", `case 'door+none': case 'vehicle+none':`);
        if (newCode === oldCode) {
            aleiLog(logLevel.WARN, "special_value direct code replacement failed (vehicle+none");
        } else {
            window.special_value = eval(`(${newCode})`);
        }
    }

    let _OG = window.special_value;
    window.special_value = (base, value) => {
        if (["ALEI_projectileModels"].indexOf(base) !== -1) {
            let returning = VAL_TABLE[base][value];
            if (returning === undefined) return ERROR_VALUE;
            else return returning;
        } else if(base == "trigger+none") { // I actually do not have to do this, but i will do it to get rid of annoyance
            if(value == -1) return VAL_TABLE["trigger+none"][-1];
            return special_value("trigger", value);
        }else if(base == "timer+none") {
            if(value == -1) return VAL_TABLE["timer+none"][-1];
            return special_value("timer", value);
        }else return _OG(base, value);
    }
    aleiLog(logLevel.DEBUG, "Patched SpecialValue");
}

function ALEI_DoWorldScale() {
    var newscale = prompt('Multiply selection size by % (percents)', 100);
    if (!(newscale == null || newscale == 100)) {
        var factor = Math.floor(newscale) / 100;
        {
            let snappingScript = `/GRID_SNAPPING)*GRID_SNAPPING;`
            var roundwell = true;
            ACTION_cancel();
            for (let i = 0; i < es.length; i++)
                if (es[i].exists)
                    if (es[i].selected)
                        if (MatchLayer(es[i])) {
                            if (es[i].pm.w != undefined) {
                                ACTION_add_redo('es[' + i + '].pm.w=Math.round(es[' + i + '].pm.w*' + factor + snappingScript);
                                ACTION_add_undo('es[' + i + '].pm.w=' + es[i].pm.w + ';');
                                if (es[i].pm.w * factor != Math.round(es[i].pm.w * factor / GRID_SNAPPING) * GRID_SNAPPING)
                                    roundwell = false;
                            }
                            if (es[i].pm.h != undefined) {
                                ACTION_add_redo('es[' + i + '].pm.h=Math.round(es[' + i + '].pm.h*' + factor + snappingScript);
                                ACTION_add_undo('es[' + i + '].pm.h=' + es[i].pm.h + ';');
                                if (es[i].pm.h * factor != Math.round(es[i].pm.h * factor / GRID_SNAPPING) * GRID_SNAPPING)
                                    roundwell = false;
                            }
                            if (es[i].pm.x != undefined) {
                                ACTION_add_redo('es[' + i + '].pm.x=Math.round(es[' + i + '].pm.x*' + factor + snappingScript);
                                ACTION_add_undo('es[' + i + '].pm.x=' + es[i].pm.x + ';');
                                if (es[i].pm.x * factor != Math.round(es[i].pm.x * factor / GRID_SNAPPING) * GRID_SNAPPING)
                                    roundwell = false;
                            }
                            if (es[i].pm.y != undefined) {
                                ACTION_add_redo('es[' + i + '].pm.y=Math.round(es[' + i + '].pm.y*' + factor + snappingScript);
                                ACTION_add_undo('es[' + i + '].pm.y=' + es[i].pm.y + ';');
                                if (es[i].pm.y * factor != Math.round(es[i].pm.y * factor / GRID_SNAPPING) * GRID_SNAPPING)
                                    roundwell = false;
                            }
                        }
            ACTION_finalize(true);
            NewNote('Operation complete:<br><br>Selected objects scaled by ' + factor + ' (' + newscale + '% of original size)', note_passive);
            if (!roundwell)
                NewNote('Note: Position and/or dimensions of some objects were not scaled properly due to Level Editor rounding rules', note_neutral);
            need_GUIParams_update = true;
            need_redraw = true;
            UpdateTools();
        }
    }
}
function patchPercentageTool() {
    window.DoWorldScale = ALEI_DoWorldScale;
    aleiLog(logLevel.DEBUG, "Patched percentage tool");
}

/**
 * patches DO_UNDO and DO_REDO to add simple error reporting to undo and redo
 */
function addUndoRedoErrorReporting() {
    const old_DO_UNDO = DO_UNDO;
    const old_DO_REDO = DO_REDO;

    window.DO_UNDO = function() {
        try {
            old_DO_UNDO();
        } catch (err) {
            NewNote("Failed to undo action.", note_bad);
            console.error(err);
        }
    }

    window.DO_REDO = function() {
        try {
            old_DO_REDO();
        } catch (err) {
            NewNote("Failed to redo action.", note_bad);
            console.error(err);
        }
    }
}

function patchDrawGrid() {
    // Used to be lg but it broke after Eric deobfuscated the ALE source code.
    let old_lg = Grid;

    window.Grid = function(param1, param2) {
        if(aleiSettings.gridBasedOnSnapping) {
            old_lg(param1 * (GRID_SNAPPING / 10), Math.min(param2 * Math.max(GRID_SNAPPING / 10, 1), 1));
        } else {
            old_lg(param1, param2)
        }
    }
    aleiLog(logLevel.DEBUG, "Patched LG");
}

/**
 *  extendTriggerList() is responsible for patching many of the original functions to support the
 *  implementation of extended triggers.
 *
 *  Extended triggers are triggers that can hold more than 10 trigger actions, and is compatible with the vanilla ALE.
 *  They are implemented similar to a linked list, with the main extended trigger pointing to the next trigger via the
 *  10th trigger action.
 *
 *  View addTriggerActionCount to see what unique properties an extended trigger has (class invariant).
 *  View SaveThisMap to see the structe of the linked list.
 */
function extendTriggerList() {
    /**
     *  This function is invoked whenever someone clicks on an option in the dropdown menu of parameter values.
     *  For example, clicking on "Force Movable 'A' move to Region 'B'"
     *
     *  Prompts for further input if required and updates the GUI.
     *
     *  @param {string} val1    The real actual value.
     *  @param {string} val2    Name / Label of the value clicked.
     *  @param {string} defval  Previous real value.
     */
    const setletedit = (() => {
        const old_setletedit = unsafeWindow.setletedit;
        const skipTriggerActions = new Set([123, 361, 364, 365]);
        const regex = /^actions_(\d+)_(targetA|targetB|type)$/;
        return function setletedit(val1, val2, defval) {
            // Get the number and trigger type.
            const match = lettarget.id.replace('pm_', '').match(regex);

            // Disallow skip trigger actions every 9th trigger action for triggers.
            if (
                match && Number(match[1]) % aleiExtendedTriggerActionLimit - 1 === 0 && match[2] === 'type' && skipTriggerActions.has(Number(val1))
            ) {
                NewNote("Due to how extended triggers are implemented, skip trigger actions are disabled every 99th trigger action. Leave a 'Do Nothing' trigger action here instead.", note_bad);
                return;
            }

            old_setletedit.call(this, val1, val2, defval);
        }
    })();

    let oldSaveThisMap = window.SaveThisMap;
    /**
     *  This function extends the SaveThisMap functionality by first compiling all instances of extended triggers into a linked list of normal triggers, then parsing them again after saving.
     *
     *  [FROM]                       |    [TO]
     *  trigger*1                    |    trigger*1                             trigger*3                             trigger*3
     *  extended:           true     |    extended:           true              *deleted*                             *deleted*
     *  totalNumOfActions:  25       |    totalNumOfActions:  25                *deleted*                             *deleted*
     *  additionalActions:  [..]     |    *deleted*                             *deleted*                             *deleted*
     *  additionalParamA:   [..]     |    *deleted*                             *deleted*                             *deleted*
     *  additionalParamB:   [..]     |    *deleted*                             *deleted*                             *deleted*
     *  actions1-10         [..]     |    actions1-9          [..]              actions1-9   [..]                     actions1-7    [..]
     *                               |    actions10           trigger*2         actions10    trigger*3                actions8-10   Do nothing.
     *
     *
     *  @param {*} temp_to_real_compile_data     Parameters that the old SaveThisMap uses. (no idea what it is tbh)
     *  @param {*} callback                      Parameters that the old SaveThisMap uses. (no idea what it is tbh)
     */
    function SaveThisMap(temp_to_real_compile_data='', callback=null) {
        compileAllExtendedTriggers();
        oldSaveThisMap(temp_to_real_compile_data, callback);
        parseAllExtendedTriggers();
        UpdateGUIObjectsList();
    }

    /**
     *  This function is responsible for compiling the text portion of the trigger action when saved.
     *  It is further patched to support more than 10 or 100 trigger actions.
     */
    function CompileTrigger() {
        const skipTriggerActions = [123, 361, 364, 365];

        //  Naming is hard. - Molis
        const action_count_less = aleiExtendedTriggerActionLimit - 1;

        if(SelectedObjects.length != 1){
            return;
        }
        const selectedTrigger = SelectedObjects[0];

        var opcode_field = document.getElementById('opcode_field');
        var code = opcode_field.value;
        var code_lines = code.split('\n');
        var new_trigger_actions = [];
        var direct_update_params = [];
        var direct_update_values = [];

        function ScheduleParamSet(a, b) {
            direct_update_params.push(a);
            direct_update_values.push(b);
        }

        for (var i = 0; i < code_lines.length; i++) {
            var line = code_lines[i];

            let paramA_start = line.indexOf('( "');
            let separator = line.indexOf('", "');
            let end = line.indexOf('" );');
            let semicolon = line.indexOf(':');

            // Parsing list of trigger actions
            if (paramA_start != -1 && separator != -1 && end != -1) {
                var first_c = line.indexOf('(');
                var opcode = line.substring(0, first_c);
                var action_type = -1;
                if (opcode.substring(0, 2) == 'op' && !isNaN(opcode.slice(2)))
                    action_type = parseInt(opcode.slice(2));
                else {
                    action_type = trigger_opcode_aliases.indexOf(opcode);
                    if (action_type == -1) {
                        NewNote('Error: Changes were not applied because "' + opcode + '" seems to be an unknown operation code.', note_neutral);
                        return false;
                    }
                }
                var valueA = '';
                var valueB = '';
                if (action_type != -1) {
                    valueA = line.substring(paramA_start + 3, separator);
                    valueB = line.substring(separator + 4, end);
                }

                new_trigger_actions.push([action_type, valueA, valueB]);

            }
            // Parsing the header portion..
            else if (semicolon != -1) {
                var left_part = line.substring(0, semicolon);
                var right_part = line.slice(semicolon + 1);
                while (left_part.charAt(0) == ' ')
                    left_part = left_part.slice(1);
                while (left_part.charAt(left_part.length - 1) == ' ')
                    left_part = left_part.slice(0, -1);
                while (right_part.charAt(0) == ' ')
                    right_part = right_part.slice(1);
                while (right_part.charAt(right_part.length - 1) == ' ')
                    right_part = right_part.slice(0, -1);
                if (left_part == 'uid' || left_part == 'enabled' || left_part == 'maxcalls' || left_part == 'execute')
                    ScheduleParamSet(left_part, right_part);
                else {
                    NewNote('Error: Changes were not applied because "' + left_part + '" seems to be not a default property.', note_neutral);
                    return false;
                }
            } else if (line != '') {
                NewNote('Error: Changes were not applied because line "' + line + '" wasn\'t recognized or contains unsupported syntax.', note_neutral);
                return false;
            }
        }

        let hasEncounteredSkipTrigger = false;
        // Retrieve all the trigger action.
        for (let i = 0; i < new_trigger_actions.length; i++) {
            // A skip trigger action for every 9th or 99th trigger action. Add a do nothing trigger action.
            if((i + 1) % action_count_less === 0 && skipTriggerActions.includes(new_trigger_actions[i][0])){
                new_trigger_actions.splice(i, 0, [-1, 0, 0]);
                hasEncounteredSkipTrigger = true;
            }

            ScheduleParamSet('actions_' + (i + 1) + '_type', new_trigger_actions[i][0]);
            ScheduleParamSet('actions_' + (i + 1) + '_targetA', new_trigger_actions[i][1]);
            ScheduleParamSet('actions_' + (i + 1) + '_targetB', new_trigger_actions[i][2]);
        }

        if(hasEncounteredSkipTrigger){
            NewNote("Skip trigger actions encountered in every 9th trigger action. Inserted an 'Do Nothing' trigger action.", note_neutral);
        }

        const currentActionsCount = !selectedTrigger.pm.extended ? aleiExtendedTriggerActionLimit : selectedTrigger.pm.totalNumOfActions;
        if (new_trigger_actions.length > currentActionsCount) {
            // extend trigger to fit new number of actions
            const diff = new_trigger_actions.length - currentActionsCount;
            addTriggerActionCount(diff);
        }
        else {
            // Populate the rest with empty trigger actions if not all trigger actions are used
            for(let i = new_trigger_actions.length + 1; i <= currentActionsCount; i++){
                ScheduleParamSet('actions_' + i + '_type', -1);
                ScheduleParamSet('actions_' + i + '_targetA', 0);
                ScheduleParamSet('actions_' + i + '_targetB', 0);
            }
        }

        UpdatePhysicalParams(direct_update_params, direct_update_values, false, false);

        NewNote("Trigger updated successfully.", note_good);
        return true;
    }

    window.setletedit = setletedit;
    window.SaveThisMap = SaveThisMap;
    window.CompileTrigger = CompileTrigger;

    // the current serialisation and unserialisation used is an external library Eric used
    // it is currently used by the Copy and Paste clipboard functions
    // however, it does not work with arrays, turning them into objects instead.
    // therefore, Nyove has decided to overwrite these library
    window.serialize = JSON.stringify;
    window.unserialize = JSON.parse;
}

function patchRender() {
    // This is where Render will be patched.
    // Due to nature of this function, maybe it'll be better to call this function each time a patch is needed.
    // And to support that, this function will strictly work on ALE_Render than current Render
    if(aleiSettings.customRenderer) {
        Renderer_initialize();
        return;
    };
    if(THEME < 4) return;
    // We should only patch for alei themes, because setting render makes things lag for no apparent reason.

    // Noname & Xeden's black theme
    //let GridColor = "#222222";
    //let GridLineColor = "#FFFFFF50";

    let oldCode, newCode;

    oldCode = ALE_Render.toString();
    newCode = oldCode.replaceAll(
        /for\s*\(\s*property/g,
        "for (let property"
    );
    if (newCode === oldCode) aleiLog(logLevel.WARN, `Render direct code replacement failed (implicit global fix)`);

    oldCode = newCode;
    newCode = oldCode.replace(
        /if\s*\(\s*THEME\s*===\s*THEME_BLUE\s*\)/,
        "if (THEME > 3 && canvasThemes?.[THEME]) ctx.fillStyle = canvasThemes[THEME].backgroundColor; else if (THEME === THEME_BLUE)"
    );
    if (newCode === oldCode) aleiLog(logLevel.WARN, `Render direct code replacement failed (grid fill color)`);

    oldCode = newCode;
    newCode = oldCode.replace(
        /if\s*\(\s*THEME\s*!==\s*THEME_DARK\s*\)/,
        "if (THEME > 3 && canvasThemes?.[THEME]) ctx.fillStyle = canvasThemes[THEME].gridColor; else if (THEME !== THEME_DARK)"
    );
    if (newCode === oldCode) aleiLog(logLevel.WARN, `Render direct code replacement failed (grid line color)`);

    window.Render = eval.call(window, `(${newCode})`); // eval.call to avoid wrong lexical scope for globals screenX and screenY
}

function patchStartNewMap() {
    // necessary cuz of patching via direct code replacement
    window.initializeALEIMapData = initializeALEIMapData;
    window.clearOCM = clearOCM;
    window.clearUIDMap = clearUIDMap;
    window.clearParameterMap = clearParameterMap;
    window.clearSelectedObjects = clearSelectedObjects;

    const oldCode = window.StartNewMap.toString();

    let newCode = oldCode.replace("ClearUndos();", "ClearUndos(); initializeALEIMapData(); clearOCM(); clearUIDMap(); clearParameterMap(); clearSelectedObjects();");
    if (newCode === oldCode) {
        aleiLog(logLevel.WARN, "StartNewMap direct code replacement failed");
    }

    window.StartNewMap = eval("(" + newCode + ")");
}

function fix100thActionInCompiObj() {
    const oldCode = window.compi_obj.toString();
    const newCode = oldCode.replace(
        /action_id\s*\<\s*trigger_actions_limit/, 
        `action_id <= trigger_actions_limit`
    );
    if (oldCode === newCode) {
        aleiLog(logLevel.WARN, "compi_obj direct code replacement failed");
    }

    window.compi_obj = eval.call(window, `(${newCode})`);
}

/**
 * changes:
 * - skin_preview_layout has zIndex 400 instead of 10
 * - char json is not decoded here, this just displays it
 * - perf_info has no effect
 */
function patchSkinList() {
    // Grabbed from source code

    function _SkinOver(el, event, perf_info) {
        if (skin_preview_layout == null) {
            const sheet = CACHED_CHARS["c" + el.dataset.charId]?.spriteSheet;
            const json = CACHED_CHARS["c" + el.dataset.charId]?.charJSON ?? null;

            skin_preview_layout = document.createElement('DIV');
            skin_preview_layout.style.pointerEvents = 'none';
            document.body.append(skin_preview_layout);

            skin_preview_layout.style.top = '0px';
            skin_preview_layout.style.bottom = '0px';
            skin_preview_layout.style.width = '40%';

            if (event.pageX < window.innerWidth / 2)
                skin_preview_layout.style.right = '0px';
            else
                skin_preview_layout.style.left = '0px';

            skin_preview_layout.style.backgroundRepeat = 'no-repeat';
            skin_preview_layout.style.boxSizing = 'border-box';
            skin_preview_layout.style.padding = '20px';
            skin_preview_layout.style.position = 'fixed';
            skin_preview_layout.style.zIndex = '400'; // Reserved
            //skin_preview_layout.style.backgroundColor = 'rgba(0,0,0,0.4)';
            skin_preview_layout.style.backgroundImage = `url(${sheet?.src})`;
            skin_preview_layout.style.backgroundSize = '';
            skin_preview_layout.style.backgroundPositionX = '0%';
            skin_preview_layout.style.backgroundPositionY = '0%';

            skin_info = document.createElement('DIV');
            skin_preview_layout.append(skin_info);

            skin_info.style.textShadow = '0 2px 2px black';
            skin_info.style.fontSize = '14px';
            skin_info.style.fontFamily = 'monospace';
            skin_info.style.whiteSpace = 'pre';
            //skin_info.textContent = 'JSON decode result: Decoding...';

            if (json !== null) {
                skin_info.textContent = 'JSON decode result: ' + JSON.stringify(json, null, "\n\t") + '\n\nWidth: '+sheet?.width+' px\n\nHeight: '+sheet?.height+' px';
                if (json.blood_color.length == 7) {
                    skin_info.innerHTML = skin_info.innerHTML.split('"' + json.blood_color + '"').join('<span style="color:' + json.blood_color + ';display: inline-block;background: black;border-radius: 9px;box-shadow: 0 0 0 5px black;filter: brightness(2);">"' + json.blood_color.split('0').join('O') + '" &#9679; </span>');
                }
            }
            else {
                skin_info.textContent = 'JSON decode result: Error\n\nMost likely this skin does not contain Skin Properties Code which can be generated at\nhttps://www.plazmaburst2.com/skin-properties-code-generator\n\nIt needs to be in the top left corner of uploaded skin image';
                skin_info.style.color = '#ff9393';
            }

            text_opacity = 1;
            SkinUpdateBackgroundColor();

            //if ( !superuser )
            skin_bg_update_interval = setInterval(SkinUpdateBackgroundColor, 32);
        }
    }
    function _SkinUpdateBackgroundColor() {
        var t = Date.now();
        var r = 100 + Math.sin(t / 4000) * 50;
        var g = 100 + Math.sin(t / 4100) * 50;
        var b = 100 + Math.sin(t / 4200) * 50;

        var av = (r + g + b) / 3;

        r = r * 0.5 + av * 0.5;
        g = g * 0.5 + av * 0.5;
        b = b * 0.5 + av * 0.5;

        skin_preview_layout.style.backgroundColor = 'rgba(' + r + ',' + g + ',' + b + ',0.8)';

        text_opacity = Math.min(1, text_opacity + 0.05);
        skin_info.style.opacity = Math.max(0, text_opacity);
    }
    function _SkinMouseMove(event) {
        if (skin_preview_layout) {
            skin_preview_layout.style.backgroundPositionX = Math.max(0, Math.min(100, event.offsetX * 1.4 - 20)) + '%';
            skin_preview_layout.style.backgroundPositionY = Math.max(0, Math.min(100, event.offsetY * 1.4 - 20)) + '%';

            text_opacity = (1 + text_opacity) * 0.7 - 1;
        }
    }
    function _SkinOut(el) {
        //if ( superuser )
        //return;

        skin_info.remove();
        skin_info = null;

        skin_preview_layout.remove();
        skin_preview_layout = null;

        clearInterval(skin_bg_update_interval);
    }

    window.SkinOver = _SkinOver;
    window.SkinUpdateBackgroundColor = _SkinUpdateBackgroundColor;
    window.SkinMouseMove = _SkinMouseMove;
    window.SkinOut = _SkinOut;

    aleiLog(logLevel.DEBUG, "Patched SkinList");
};

function sortEntitiesBetter() {
    if (ActionArray.length > 0) {
        ActionArray = [];
    }
    
    function entitySortValue(entity) {
        // smaller number means earlier in the draw order
        switch(entity._class) {
            case "bg":
                return 0;
            case "box":
            case "door":
                return 1;
            case "decor":
                return 2;
            case "player":
            case "enemy":
            case "gun":
                return 3;
            default:
                return 4;
        }
    }
    
    es.sort((a, b) => entitySortValue(a) - entitySortValue(b));
}

let alreadyStarted = false;
let ALE_start = (async function() {
    if(alreadyStarted) return;
    alreadyStarted = true;
    'use strict';

    VAL_TABLE = special_values_table;
    ROOT_ELEMENT = document.documentElement;
    stylesheets = document.styleSheets;
    ALE_Render = Render;

    // Handling rest of things
    addPropertyPanelResize();
    addObjBoxResize();

    patchServerRequest();

    // style sheets and theme stuff
    fixWebpackStyleSheets();
    replaceThemeSet();
    patchSaveBrowserSettings();
    initTheme();

    updateStyles();
    // updateRegionActivations();
    updateEngineMarkNames();
    updateSkins();
    updateSounds();
    updateVoicePresets();
    updateParameters();
    updateOffsets();
    updateObjects();

    if (aleiSettings.html5Mode) {
        activateHTML5Mode();
        setTimeout(() => {
            NewNote("Note: HTML5 mode is enabled. Features and options that aren't available on the HTML5 port have been disabled.", "#FFFF00");
        }, 2000);
    }

    // needs to be after updateObjects and activateHTML5Mode
    patchTriggerActionList();
    patchMaskTriggerActions();

    patchTopPanel();
    addTopButton("Download XML", exportXML);
    addTopButton("Insert XML", insertXMLUserInput);
    addTopButton("ALEI Settings", showSettings);

    patchMrCustomImage();
    patch_m_down();
    patch_m_move();
    addSessionSync();
    addTriggerIDs();
    patchShowHideButton();
    optimize();
    patchUpdateTools();
    patchDecorUpload();
    patchEntityClass();
    patchEvalSet();
    // Allowing for spaces in parameters.
    patchUpdatePhysicalParam();
    window.PasteFromClipBoard = PasteFromClipBoard;
    // Tooltip.
    if(aleiSettings.enableTooltips) {
        doTooltip();
    }
    if (aleiSettings.extendedTriggers) {
        extendTriggerList();
        window.ExtendedTriggersLoaded = true;
    }
    patchParamsGUI();
    patchTeamList();
    patchRandomizeName();
    patchAllowedCharacters();
    addProjectileModels();
    patchSpecialValue();
    UpdateTools();
    patchPercentageTool();
    createClipboardDiv();
    addPasteFromPermanentClipboard();

    patchForInteractableTriggerActions();
    registerClipboardItemAction();

    addUndoRedoErrorReporting();
    patchDrawGrid();
    addFunctionToWindow();
    createALEISettingsMenu();

    aleimapdatapatches.patchSaveThisMap();
    
    patchStartNewMap();

    // register param side buttons
    registerCommentAdderButton();
    registerCommentRemoverButton();
    registerOpenInColorEditorButton();

    if(isNative && !GM_info.script.name.includes("Local")) {
        checkForUpdates();
    }
    changeTopRightText();

    aleiLog(logLevel.VERBOSE, "Settings: " + JSON.stringify(aleiSettings));

    // update stuff for render object names setting
    window.ENABLE_TEXT = aleiSettings.renderObjectNames;
    window.need_redraw = true;
    window.UpdateTools();


    let ALE_PreviewQualitySet = window.PreviewQualitySet;
    window.PreviewQualitySet = (val) => {
        ALE_PreviewQualitySet(val);
        writeStorage("ALEI_PreviewQualitySet", val);
    };

    window.PreviewQualitySet(
        readStorage(
            "ALEI_PreviewQualitySet",
            false,
            (val) => val === "true")
    );

    patchRender();
    patchFindErrorsButton();
    addErrorCheckingToSave();
    patchSkinList();
    fix100thActionInCompiObj();

    // load map again if map was already loaded but not successfully (in terms of alei)
    // map load is unsuccessful if it happens before alei is initialized
    // alei enters a bugged state if map load is unsuccessful
    if (es.length > 0) {
        aleiLog(logLevel.DEBUG, "Map was loaded unsuccessfully. Doing it again");
        
        // this is most of the stuff from StartNewMap (except setting mapid and calling ResetView)
        es = [];
        changes_made = false;
        need_redraw = true;
        need_GUIParams_update = true;
        ClearUndos();
        initializeALEIMapData();
        clearOCM();
        clearUIDMap();
        clearParameterMap();
        
        LoadThisMap();
    }

    NewNote("ALEI: Welcome!", "#7777FF");
    NewNote(`Don't forget to join discord server! discord.gg/vKgDbVTE2V`, "#7777FF");
    aleiLog(logLevel.INFO, `Welcome!`);
    if(isNative) {
        aleiLog(logLevel.INFO, `TamperMonkey Version: ${GM_info.version} ALEI Version: ${GM_info.script.version}`);
    } else {
        let message = "You are running ALEI not under tampermonkey, this is not native ALEI, please load ALEI by tampermonkey when possible.";
        NewNote(`ALEI: ${message}`, "#FFFF00");
        NewNote(`ALEI: Check https://github.com/Molisson/ALEI for more details.`, "#FFFF00");
        aleiLog(logLevel.INFO, message);
        NewNote(`ALEI: Reminder that ALEI under tampermonkey is bound to break less than without.`, "#FFFFFF");
    }
});

if(isNative) document.addEventListener("DOMContentLoaded", () => ALE_start());
else ALE_start();

console.log("ALEI!");
