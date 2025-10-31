import { outgoingConnectionsMap, incomingConnectionsMap } from "../../ocm/ocm.js";
import { aleiSettings } from "../../storage/settings.js";
import { aleiLog, logLevel } from "../../log.js";
import { asRadians, mod, easeOutExpo } from "../../math.js"
import { fixedVisualBBoxes } from "./fixedbboxes.js";
import { canvasThemes, setHighLightedObjEdgeColors } from "./canvasthemes.js";
import * as spawnAreas from "../../spawn-areas.js";
import * as wallTextures from "../../wall-textures/wall-tx-renderer.js";
import { getCustomCharImage } from "../../skin-preview.js";

let window = unsafeWindow;

window.canvasThemes = canvasThemes; // add canvasThemes to window so it can be changed via console

// Variables that Renderer actively uses.
let decorRequestsOnProgress = [];
let backgroundRequestsOnProgress = [];
let boxModelImages = {};
let haveForcedRecalculation = false;
// Statistic purposes.
let displayFPS = 0;
let fpsAccumulator = 0;
let totalRenderedObjects = 0;
let lastTime = 0;

// Drawing functions.
let draw_rect;
let draw_rect_edges;
let draw_gridlines;
let draw_image;

// Context, grid, canvas
let ctx;
let canvasHeight;
let canvasWidth;
let gridOpacity;

// Mouse.
let mClickX;
let mClickY;
let mCurrentX;
let mCurrentY;

// World and Screen conversion functions
let w2s_x;
let w2s_y;
let s2w_x;
let s2w_y;
let w2s_h;
let w2s_w;
let s2w_h;
let s2w_w;

// For Preview mode.
let previewBackground = "1";

let currentTheme;

let regionImages = {} // Will be filled later.

function RenderGrid() {
    // Grid lines.
    if(gridOpacity <= 0) return;
    ctx.fillStyle = currentTheme.gridColor;

    //           Step - Alpha
    draw_gridlines(10 , 0.08 * gridOpacity);
    draw_gridlines(100, 0.32 * gridOpacity);
    draw_gridlines(300, 0.64 * gridOpacity);

    ctx.globalAlpha = 0.7 * gridOpacity;
    draw_rect(0, w2s_y(0), canvasWidth, 1); // Center Grid - Horizontal
    draw_rect(w2s_x(0), 0, 1, canvasHeight); // Center Grid - Vertical
}

function _DrawRectangle(color, opacity, x, y, w, h, edge) {
    ctx.globalAlpha = opacity;
    if(edge) {
        if(aleiSettings.cartoonishEdges) ctx.strokeColor = color;
        else ctx.strokeStyle = color;
        draw_rect_edges(x, y, w, h)
    }else {
        ctx.fillStyle = color;
        draw_rect(x, y, w, h);
    }
}
// Checks if given object is in selection area.
function ObjIsHighlighted(element, cns) {
    if(!window.m_drag_selection) return; // If we are not dragging.
    if(window.m_mistake_drag) return; // If the selection just started
    if(!window.MatchLayer(element)) return; // If layers dont match.

    let rx = w2s_x(Math.min(mClickX, mCurrentX));
    let ry = w2s_y(Math.min(mClickY, mCurrentY));
    let rw = w2s_w(Math.abs(mCurrentX - mClickX));
    let rh = w2s_h(Math.abs(mCurrentY - mClickY));

    let x = cns.x;
    let y = cns.y;
    let w = cns.w;
    let h = cns.h;

    if( ((x+w) < rx) || ((rx+rw) < x) ) return false;
    if( ((y+h) < ry) || (ry+rh) < y ) return false;

    return true;
}

// Function responsible for rendering resizable objects. (Region, door, box, pusher, water)
function RenderSingleResizableObject(element, cns) {
    let elemClass = element._class;
    let objectColor = currentTheme.objectColors[elemClass];
    if(objectColor === undefined) return;

    let layerAlpha = window.MatchLayer(element) ? 1: 0.3;

    let pm = element.pm;
    let x = w2s_x(pm.x);
    let y = w2s_y(pm.y);
    let w = w2s_w(pm.w);
    let h = w2s_h(pm.h);

    let color = objectColor.col;
    let edgeColor = objectColor.edgeCol;
    let opacityFactor = objectColor.opacityFactor ? objectColor.opacityFactor : 0.2;
    let edgeOpacityFactor = objectColor.edgeOpacityFactor ? objectColor.edgeOpacityFactor : 1;

    if((elemClass == "bg") && (window.CACHED_BGS[pm.m] == undefined) && (backgroundRequestsOnProgress.indexOf(pm.m) == -1)) {
        window.ServerRequest(`a=get_images&for_class=bg_model&update_const=${pm.m}`, 'request_consts');
        backgroundRequestsOnProgress.push(pm.m);
    }

    if(
        (elemClass == "door") && (
            (pm.vis === 0) ||
            (pm.vis === false) ||
            (pm.vis === "false")
        ) ) { // Setting opacity factor when door is invisible.
        opacityFactor = objectColor.invisibleOpacityFactor;
    }
    else if ((elemClass == "water") && (element.pm.damage > 0)) { // Swapping out properties when it is acid.
        color = objectColor.acidCol;
        edgeColor = objectColor.acidEdgeCol;
        opacityFactor = objectColor.acidOpacityFactor;
    }
    else if ((elemClass == "region") && ([1, 9, 10].indexOf(parseInt(pm.use_on)) !== -1)) {
        ctx.globalAlpha = layerAlpha * objectColor.buttonOpacityFactor;
        let image = regionImages[pm.use_on];
        draw_image(
            image,
            w2s_x(pm.x + Math.round((pm.w - 41)/2)),
            w2s_y(pm.y + Math.round((pm.h - 51)/2)),
            w2s_w(41),
            w2s_h(31)
        )
    }
    else if ((elemClass == "bg") && (pm.c.length == 7)) {
        color = pm.c;
        opacityFactor = objectColor.coloredOpacityFactor;
    }

    if(window.SHOW_TEXTURES) {
        if(elemClass == "box") {
            color = "#000";
            opacityFactor = 1;
            edgeColor = "#333";
        }
        else if ((elemClass == "bg") && (window.CACHED_BGS[pm.m] !== undefined) && (window.CACHED_BGS[pm.m].loaded)) {
            if(backgroundRequestsOnProgress.indexOf(pm.m) !== -1) {
                backgroundRequestsOnProgress.splice(backgroundRequestsOnProgress.indexOf(pm.m), 1);
            }
            ctx.globalAlpha = 1;
            let img = window.CACHED_BGS[pm.m];
            if(img.pattern == undefined) img.pattern = ctx.createPattern(img, "repeat"); // Create repeat pattern if not already done.

            ctx.save();
            // Getting a working rectangle for us in order to work.
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.closePath();
            ctx.clip();

            // Ensuring that background is offsetted properly and takes all the rectangle.
            ctx.translate(w2s_x(0), w2s_y(0));
            ctx.scale(w2s_x(1) - w2s_x(0), w2s_y(1) - w2s_y(0));
            ctx.translate(pm.u, pm.v);

            // Actual background rendering.
            ctx.beginPath();
            ctx.fillStyle = img.pattern;
            ctx.rect(s2w_x(0), s2w_y(0), s2w_w(canvasWidth), s2w_h(canvasHeight));
            ctx.fill();

            ctx.restore();

            // Color multiplying.
            if(pm.c.length == 7) {
                let comp = ctx.globalCompositeOperation;

                ctx.globalCompositeOperation = "multiply"; // We multiply the rectangle.
                _DrawRectangle(pm.c, 1, x, y, w, h, false);
                ctx.globalCompositeOperation = "lighter";
                ctx.drawImage(ctx.canvas, x, y, w, h, x, y, w, h); // We then overlay the rectangle on background itself.

                ctx.globalCompositeOperation = comp;
            }
        }
    }

    if(ObjIsHighlighted(element, cns)) {
        edgeColor = currentTheme.highLightedObjEdgeColor;
        edgeOpacityFactor = currentTheme.highLightedObjEdgeOpacity / layerAlpha;
    }

    if(element.selected && !aleiSettings.originalSelectOverlay) {
        edgeColor = currentTheme.selectOutlineColor;
        edgeOpacityFactor = currentTheme.selectEdgeOpacityFactor;
    }

    if(!( (window.SHOW_TEXTURES) && (elemClass == "bg") )) _DrawRectangle(color, layerAlpha * opacityFactor, x, y, w, h, false); // Object itself.
    if(!window.SHOW_TEXTURES) _DrawRectangle(edgeColor, layerAlpha * edgeOpacityFactor, x, y, w, h, true); // Edge.

    if (window.SHOW_TEXTURES && elemClass === "box" && aleiSettings.boxRendering) {
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = layerAlpha;
        wallTextures.drawWallTextures(ctx, element);
        ctx.globalAlpha = prevAlpha;
    }
}

// Function responsible for drawing edges of non-resizable objects. To be used below.
function RenderNRObjectBox(element, color, opacity) {
    let pm = element.pm;
    let objX = pm.x;
    let objY = pm.y;

    let oClass = window.ThinkOfBBoxClass(element._class, element);

    let classX = window.bbox_x[oClass];
    let classY = window.bbox_y[oClass];
    let classW = window.bbox_w[oClass];
    let classH = window.bbox_h[oClass];

    let x;
    let y = w2s_y(objY + classY);
    let w;
    let h = w2s_h(classH);

    if(pm.side != -1) {
        x = w2s_x(objX + classX);
        w = w2s_w(classW);
    } else {
        x = w2s_x(objX - classX);
        w = w2s_w(-classW);
        x += w;
        w = -w;
    }
    _DrawRectangle(color, opacity, x, y, w, h, true);

}

// Function responsible for rendering non-resizable objects (Everything else aside from ones mentioned above.)
function RenderSingleNonResizableObject(element, cns) {
    let elemClass = element._class;
    let layerAlpha = window.MatchLayer(element) ? 1: 0.3;
    let pm = element.pm;
    let x = pm.x;
    let y = pm.y;

    let color = "#000";
    let opacityFactor = 0.1;

    if(ObjIsHighlighted(element, cns)) {
        color = currentTheme.highLightedObjEdgeColor;
        opacityFactor = currentTheme.highLightedObjEdgeOpacity / layerAlpha;
    }

    if(element.selected && !aleiSettings.originalSelectOverlay) {
        color = currentTheme.selectOutlineColor;
        opacityFactor = currentTheme.selectEdgeOpacityFactor;
    }

    ctx.globalAlpha = layerAlpha;
    let transformedDecor = false;

    if(elemClass == "decor") { // Rotation & scaling, also fetching decor if needed..
        let model = pm.model;
        if( (window.special_values_table.decor_model[model] == undefined) && (decorRequestsOnProgress.indexOf(model) == -1)) {
            window.ServerRequest(`a=get_images&for_class=decor_model&update_const=${model}`, 'request_consts');
            decorRequestsOnProgress.push(model);
        }
        if((pm.r != 0) || (pm.sx != 1) || (pm.sy != 1)) {
            ctx.save();
            ctx.translate(w2s_x(x), w2s_y(y));
            ctx.rotate(asRadians(pm.r));
            ctx.scale(pm.sx, pm.sy);
            ctx.translate(-w2s_x(x), -w2s_y(y));
            transformedDecor = true;
        }
    }

    let offsetClass = window.ThinkOfOffsetClass(elemClass, element);
    let factor = (pm.side != -1) ? 1: -1;

    let objX = w2s_x(x + factor * window.offset_x[offsetClass]);
    let objY = w2s_y(y + window.offset_y[offsetClass]);
    let objW = w2s_w(factor * window.offset_w[offsetClass]);
    let objH = w2s_h(window.offset_h[offsetClass]);

    if(factor == -1) {
        ctx.save();
        ctx.translate(2 * objX + objW, 0);
        ctx.scale(-1, 1);
    }

    if(["player", "enemy"].includes(elemClass)) {
        let charImg = window.img_char_custom;
        if (typeof pm.char === "string" && pm.char.charAt(0) === "c") {
            if (window.CACHED_CHARS[pm.char] !== undefined) {
                if (window.CACHED_CHARS[pm.char].loaded) {
                    charImg = window.CACHED_CHARS[pm.char];
                }
            }
            else {
                getCustomCharImage(pm.char);
            }
        }
        else if (pm.char in window.img_chars_full) {
            charImg = window.img_chars_full[pm.char];
        }
        draw_image(charImg, w2s_x(pm.x - 36), w2s_y(pm.y - 104), w2s_w(110), w2s_h(130));
    } else if ((elemClass == "decor") && (window.CACHED_DECORS[pm.model] !== undefined) && (!window.CACHED_DECORS[pm.model].native)) {
        if(decorRequestsOnProgress.indexOf(pm.model) !== -1) {
            decorRequestsOnProgress.splice(decorRequestsOnProgress.indexOf(pm.model), 1);
        }
        let image = window.CACHED_DECORS[pm.model];
        draw_image(
            image,
            w2s_x(pm.x + pm.u),
            w2s_y(pm.y + pm.v),
            w2s_w(image.width),
            w2s_h(image.height)
        );
    } else {
        // Native
        if ( aleiSettings.showTextPlaceholderDecors && ( pm.model === "text" || pm.model === "text2" || pm.model === "text3" ) ) {
            // Font
            let size = 16 / zoom; // Hack.
            switch( pm.model ) {
                case "text":
                    ctx.font = `${size}px EuropeExt Regular`;
                    break;

                case "text2":
                    ctx.font = `${size}px DejaVu Sans Mono`;
                    break;
                
                default:
                    ctx.font = `bold ${size}px Tahoma`;
                    break;
            }

            ctx.fillStyle = "white";
            ctx.textAlign = "center";

            ctx.fillText(
                pm.text ?? "Hello World!",
                w2s_x( pm.x + 2 ),
                w2s_y( pm.y + 4 )
            );

            ctx.textAlign = "start";
        } else draw_image(window.img_decide(element), objX, objY, objW, objH);
    }

    if(transformedDecor) ctx.restore();
    if(factor == -1) ctx.restore();

    RenderNRObjectBox(element, color, layerAlpha * opacityFactor);
}

function GetObjectCoordAndSize(element) {
    let pm = element.pm;

    let x, y, w, h;
    if(element._isresizable) {
        x = w2s_x(pm.x);
        y = w2s_y(pm.y);
        w = w2s_w(pm.w);
        h = w2s_h(pm.h);
    } else {
        let boxClass = window.ThinkOfBBoxClass(element._class, element);
        y = w2s_y(pm.y + window.bbox_y[boxClass]);
        h = w2s_h(window.bbox_h[boxClass]);
        if(pm.side != -1) {
            x = w2s_x(pm.x + window.bbox_x[boxClass]);
            w = w2s_w(window.bbox_w[boxClass]);
        } else {
            x = w2s_x(pm.x - window.bbox_x[boxClass]);
            w = w2s_w(-window.bbox_w[boxClass]);
            x += w;
            w = -w;
        }
    }

    return {x: x, y: y, w: w, h: h}
}

function RenderObjectMarkAndName(element, cns) {
    // render the object even if layers dont match the object due to quick pick mode.
    let shouldRenderRegardless = window.quick_pick && window.quick_pick_classes.indexOf(element._class) !== -1

    if(!window.ENABLE_TEXT)                                     return;
    if(element.pm.uid == undefined)                             return;
    if(!shouldRenderRegardless && !window.MatchLayer(element))  return;

    if(window.last_title_density == undefined) window.last_title_density = 0;

    let capx = cns.x + cns.w / 2;
    let capy = cns.y + cns.h / 2;

    let gothit = (element.selected && element.hit(false));
    ctx.font = "normal 10px Arial";
    let fillText = element.pm.uid;
    let dim = ctx.measureText(fillText);
    dim.height = 10;
    if (gothit)
        dim.height = 12;
    if (window.mouse_x > capx - 30)
        if (window.mouse_x < capx + 30)
            if (window.mouse_y > capy - 30)
                if (window.mouse_y < capy + 30) {
                    title_density++;
                }

    ctx.globalAlpha = 1;
    if (window.last_title_density > 1 && !gothit) {
        let di = Math.sqrt(Math.pow(window.mouse_x - capx, 2) + Math.pow(window.mouse_y - capy, 2));
        if (di < 60) {
            if (!element.selected) {
                capx = capx - (window.mouse_x - capx) * Math.pow((60 - di) / 60, 2) * (4 + Math.min(6, window.last_title_density * 0.1));
                capy = capy - (window.mouse_y - capy) * Math.pow((60 - di) / 60, 2) * (4 + Math.min(6, window.last_title_density * 0.1));
                if (window.last_title_density > 1) {
                    ctx.globalAlpha = Math.max(0.4, 1 - window.last_title_density * 0.1);
                }
            } else {
                ctx.globalAlpha = Math.max(0.3, 1 / window.last_title_density);
            }
        }
    }
    let x3 = Math.round(capx - dim.width / 2);
    let y3 = Math.round(capy - dim.height / 2);
    if (window.ENABLE_SHADOWS) {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(x3 - 2, y3 - 2, dim.width + 4, dim.height + 4);
        ctx.fillRect(x3 - 4, y3 - 4, dim.width + 8, dim.height + 8);
    }
    ctx.fillStyle = "#FFF";
    if (gothit) ctx.fillStyle = '#fffb91';
    if (element.selected) ctx.fillStyle = currentTheme.selectTextColor;
    ctx.fillText(fillText, x3, y3 + 8 + (dim.height - 10) / 2);
    window.last_title_density = window.title_density;
}

function RenderSelectOverlay(element, cns) {
    if(!element.selected) return;
    if(!aleiSettings.originalSelectOverlay) return;

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = window.selgrd2;
    draw_rect(cns.x, cns.y, cns.w, cns.h);

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#FFF";
    window.MyDrawSelection(cns.x-2, cns.y-2, cns.w+4, cns.h+4)
}

function ChangeCursorIfHitsBorder(element, cns) {
    if(!element.selected) return;
    if(!element._isresizable) return;
    if(!window.MatchLayer(element)) return;

    let cx = cns.x;
    let cy = cns.y;
    let cw = cns.w;
    let ch = cns.h;

    let x = element.pm.x;
    let y = element.pm.y;
    let w = element.pm.w;
    let h = element.pm.h;

    let mx = mCurrentX;
    let my = mCurrentY;

    let borderWidth = window.borderwidth;

    // Do elimination if checking is not necessary.
    if(mx < (x - borderWidth)) return;
    if((x + w + borderWidth) < mx) return;
    if(my < (y - borderWidth)) return;
    if((y+h+borderWidth) < my) return;

    let isTop, isBottom, isLeft, isRight = false;
    // X
    if( ((x - borderWidth) <= mx) && (mx <= (x+borderWidth)) ) isLeft = true;
    if( ((x+w-borderWidth) <= mx) && (mx <= (x+w+borderWidth)) ) isRight = true;
    // Y
    if( ((y-borderWidth) <= my) && (my <= (y+borderWidth))) isTop = true;
    if( ((y+h-borderWidth) <= my) && (my <= (y+h+borderWidth))) isBottom = true;

    let cursor = "default";
    if( (isTop && isLeft) || (isBottom && isRight) ) cursor = "nwse-resize";
    else if( (isTop && isRight) || (isBottom && isLeft) ) cursor = "nesw-resize";
    else if (isTop || isBottom) cursor = "ns-resize";
    else if (isLeft || isRight) cursor = "ew-resize";

    if(window.canv.style.cursor != cursor) window.canv.style.cursor = cursor;
}

function RenderQuickPick(element, cns) {
    if(!(window.quick_pick && window.quick_pick_classes.indexOf(element._class) != -1)) return;

    let x = cns.x;
    let y = cns.y;
    let w = cns.w;
    let h = cns.h;

    let midX = x + w/2;
    let midY = y + h/2;

    let sinus = Math.sin((new Date()).getTime() / 100);

    ctx.globalAlpha = 0.75 - sinus / 4;
    let size = 27 + sinus * 5;

    let isOver = false;

    if(window.es[window.quick_pick_fake_over] == element) {
        isOver = true
    } else {
        let dist = window.Dist2D(midX, midY, window.mouse_x, window.mouse_y);
        if(dist < (20 * window.quick_pick_hit_scale)) {
            isOver = true;
        }
    }

    draw_image(
        isOver ? window.img_quickpick2 : window.img_quickpick,
        midX - size,
        midY - size,
        size * 2,
        size * 2
    );
}

function RenderConnectionLines(element, cns) {
    if(!window.SHOW_CONNECTIONS) return;
    if(!element.exists) return;
    if(!element.selected) return;
    if(!aleiSettings.ocmEnabled) return;
    if(!outgoingConnectionsMap.has(element) && !incomingConnectionsMap.has(element)) return;

    let fromX, toX;
    let fromY, toY;
    
    let layerAlpha = window.MatchLayer(element) ? 1: 0.3;
    ctx.globalAlpha = layerAlpha * currentTheme.objectConnectionOpacityFactor;
    ctx.lineWidth = 1;
    ctx.setLineDash(currentTheme.objectConnectionDash);

    ctx.strokeStyle = currentTheme.objectConnectionOutgoingColor;
    fromX = cns.x + cns.w/2;
    fromY = cns.y + cns.h/2;
    
    // TODO: How can we batch line draws?
    // All of them will have same color. (By all, I mean every line that a loop handles.)
    // So it's best if we just batch them, but how do we do that?

    for(let to of outgoingConnectionsMap.get(element) || []) {
        // Do not draw lines if the object doesn't exist.
        if (!to.exists) continue;

        let ocns = GetObjectCoordAndSize(to);
        toX = ocns.x + ocns.w/2;
        toY = ocns.y + ocns.h/2;

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
    }

    ctx.strokeStyle = currentTheme.objectConnectionIncomingColor;
    toX = fromX;
    toY = fromY;

    for(let by of incomingConnectionsMap.get(element) || []) {
        // Do not draw lines if the object doesn't exist.
        if (!by.exists) continue;

        let ocns = GetObjectCoordAndSize(by);
        fromX = ocns.x + ocns.w/2;
        fromY = ocns.y + ocns.h/2;

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
    }

    ctx.setLineDash([]);
}

function RenderSingleObject(element, cns) {
    if(element._isresizable) RenderSingleResizableObject(element, cns);
    else RenderSingleNonResizableObject(element, cns);
    RenderSelectOverlay(element, cns);
    RenderQuickPick(element, cns);
    RenderObjectMarkAndName(element, cns);
    RenderConnectionLines(element, cns);
    ChangeCursorIfHitsBorder(element, cns);
}

function RenderAllObjects() {
    totalRenderedObjects = 0;

    let lp = window.left_panel.getBoundingClientRect();
    let rp = window.right_panel.getBoundingClientRect();
    let tp = window.top_panel.getBoundingClientRect();

    let cx = Math.round(s2w_x(lp.width + lp.x));
    let cy = Math.round(s2w_y(tp.height + tp.y));
    let cw = Math.round(s2w_w(rp.x - (lp.width + lp.x)));
    let ch = Math.round(s2w_h(canvasHeight - (tp.height + tp.y)));
    let cx2 = cx + cw; // right x
    let cy2 = cy + ch; // bottom y

    for(let element of window.es) {
        if(!element.exists) continue;
        if(!element._isphysical) continue;

        let cns;
        if(element.selected) {
            cns = GetObjectCoordAndSize(element);
            RenderConnectionLines(element, cns);
        }
        // Actual culling
        if (CullObject(element, cx, cx2, cy, cy2)) continue;

        if(cns == undefined) cns = GetObjectCoordAndSize(element);
        RenderSingleObject(element, cns);
        totalRenderedObjects++;
    }
}

/**
 * determines if object should be culled
 * @param {E} element 
 * @param {number} leftEdge - left x of the visible area in world coordinates
 * @param {number} rightEdge - right x of the visible area in world coordinates
 * @param {number} topEdge - top y of the visible area in world coordinates
 * @param {number} bottomEdge - bottom y of the visible area in world coordinates
 * @returns {boolean}
 */
function CullObject(element, leftEdge, rightEdge, topEdge, bottomEdge) {
    const pm = element.pm;

    if (element._isresizable) {
        return pm.x + pm.w < leftEdge || pm.x > rightEdge ||
               pm.y + pm.h < topEdge  || pm.y > bottomEdge;
    }

    // get object bounding box (the thing that can be selected)
    const bboxClass = ThinkOfBBoxClass(element._class, element);
    const bboxWidth = bbox_w[bboxClass];
    const bboxHeight = bbox_h[bboxClass];
    const bboxX = pm.side != -1
        ? pm.x + bbox_x[bboxClass]
        : pm.x - bbox_x[bboxClass] - bboxWidth;
    const bboxY = pm.y + bbox_y[bboxClass];

    // don't cull object if the bounding box is visible
    if (!(bboxX + bboxWidth < leftEdge || bboxX > rightEdge ||
          bboxY + bboxHeight < topEdge || bboxY > bottomEdge)) {
        return false;
    }

    // if object bounding box is not visible, check if decor image is visible
    if (element._class === "decor" && window.CACHED_DECORS[pm.model]?.loaded) {
        return CullDecorImage(element, leftEdge, rightEdge, topEdge, bottomEdge);
    }
    else {
        return true; // object bounding box was not visible and there is no decor image
    }
}

/**
 * determines if decor image should be culled. helper function for CullObject
 * @returns {boolean}
 */
function CullDecorImage(element, leftEdge, rightEdge, topEdge, bottomEdge) {
    const pm = element.pm;
    const image = window.CACHED_DECORS[pm.model];
    const degreesRotation = pm.r;
    const scaleX = pm.sx;
    const scaleY = pm.sy;

    let offsetX, offsetY, imgWidth, imgHeight;
    if (image.native) {
        if (!(pm.model in fixedVisualBBoxes)) {
            const offsetClass = ThinkOfOffsetClass("decor", element);
            offsetX = offset_x[offsetClass] * scaleX;
            offsetY = offset_y[offsetClass] * scaleY;
            imgWidth = offset_w[offsetClass] * scaleX;
            imgHeight = offset_h[offsetClass] * scaleY;
        }
        else {
            // use better values for fanart update decors
            const visualBBox = fixedVisualBBoxes[pm.model];
            offsetX = visualBBox.x * scaleX;
            offsetY = visualBBox.y * scaleY;
            imgWidth = visualBBox.w * scaleX;
            imgHeight = visualBBox.h * scaleY;
        }
    }
    else {
        offsetX = pm.u * scaleX;
        offsetY = pm.v * scaleY;
        imgWidth = image.width * scaleX;
        imgHeight = image.height * scaleY;
    }
    
    if (degreesRotation % 90 == 0) {
        return CullAxisAlignedDecorImage(pm, offsetX, offsetY, imgWidth, imgHeight, degreesRotation, leftEdge, rightEdge, topEdge, bottomEdge);
    }
    else {
        return CullNonAxisAlignedDecorImage(pm, offsetX, offsetY, imgWidth, imgHeight, degreesRotation, leftEdge, rightEdge, topEdge, bottomEdge);
    }
}

/**
 * determines if decor image should be culled when rotation is a multiple of 90. helper function for CullDecorImage
 * @returns {boolean}
 */
function CullAxisAlignedDecorImage(pm, offsetX, offsetY, imgWidth, imgHeight, degreesRotation, leftEdge, rightEdge, topEdge, bottomEdge) {
    const quadrant = mod(Math.floor(degreesRotation / 90), 4);
    let left, top, rotatedWidth, rotatedHeight;
    switch (quadrant) {
        case 0:
            left = pm.x + offsetX;
            top = pm.y + offsetY;
            rotatedWidth = imgWidth;
            rotatedHeight = imgHeight;
            break;
        case 1:
            left = pm.x - offsetY - imgHeight;
            top = pm.y + offsetX;
            rotatedWidth = imgHeight;
            rotatedHeight = imgWidth;
            break;
        case 2:
            left = pm.x - offsetX - imgWidth;
            top = pm.y - offsetY - imgHeight;
            rotatedWidth = imgWidth;
            rotatedHeight = imgHeight;
            break;
        case 3:
            left = pm.x + offsetY;
            top = pm.y - offsetX - imgWidth;
            rotatedWidth = imgHeight;
            rotatedHeight = imgWidth;
            break;
        default:
            return true;
    }
    /*_DrawRectangle(
        "#FF7700", 1, 
        w2s_x(left), 
        w2s_y(top), 
        w2s_w(rotatedWidth), 
        w2s_h(rotatedHeight), 
        true
    );*/
    return left + rotatedWidth < leftEdge || left > rightEdge ||
           top + rotatedHeight < topEdge  || top > bottomEdge;
}

/**
 * determines if decor image should be culled when rotation is not a multiple of 90. helper function for CullDecorImage
 * @returns {boolean}
 */
function CullNonAxisAlignedDecorImage(pm, offsetX, offsetY, imgWidth, imgHeight, degreesRotation, leftEdge, rightEdge, topEdge, bottomEdge) {
    const radiansRotation = asRadians(degreesRotation);
    const cosine = Math.cos(radiansRotation);
    const sine = Math.sin(radiansRotation);

    // calculate transformedCenterX, transformedCenterY (image center pos after transformations are applied)
    // apply translation
    const translatedCenterX = offsetX + imgWidth*0.5;
    const translatedCenterY = offsetY + imgHeight*0.5;
    // apply rotation
    const rotatedCenterX = translatedCenterX*cosine - translatedCenterY*sine;
    const rotatedCenterY = translatedCenterX*sine   + translatedCenterY*cosine;
    // make it relative to global origin
    const transformedCenterX = pm.x + rotatedCenterX;
    const transformedCenterY = pm.y + rotatedCenterY;

    // check minimum bounding box
    const minimumWidth  = Math.abs(imgWidth  * cosine) + Math.abs(imgHeight * sine);
    const minimumHeight = Math.abs(imgHeight * cosine) + Math.abs(imgWidth  * sine);
    const halfWidth  = minimumWidth*0.5;
    const halfHeight = minimumHeight*0.5;
    /*_DrawRectangle(
        "#FFFF00", 1, 
        w2s_x(transformedCenterX - halfWidth), 
        w2s_y(transformedCenterY - halfHeight), 
        w2s_w(minimumWidth), 
        w2s_h(minimumHeight), 
        true
    );*/
    return transformedCenterX + halfWidth < leftEdge || transformedCenterX - halfWidth > rightEdge ||
           transformedCenterY + halfHeight < topEdge || transformedCenterY - halfHeight > bottomEdge;
}

function RenderSelectionBox() {
    if(!window.m_drag_selection) return; // If we are not dragging.
    if(window.m_mistake_drag) return; // If the selection just started


    let x = w2s_x(mClickX); // Start X for rectangle
    let y = w2s_y(mClickY); // Start Y for rectangle
    let w = w2s_w(mCurrentX - mClickX); // Width for rectangle.
    let h = w2s_h(mCurrentY - mClickY); // Height for rectangle.

    let color = currentTheme.selectionColor;
    if(window.ctrl) color = currentTheme.selectionCtrlColor;
    else if(window.alt) color = currentTheme.selectionAltColor;

    _DrawRectangle(color, currentTheme.selectionOpacity, x, y, w, h);
    _DrawRectangle(color, currentTheme.selectionEdgeOpacity, x, y, w, h, true);
}

function RenderBackground() {
    if(!window.SHOW_TEXTURES) {
        ctx.fillStyle = currentTheme.backgroundColor;
        draw_rect(0, 0, canvasWidth, canvasHeight);
    } else {
        draw_image(window.CACHED_SKY[previewBackground], 0, 0, canvasWidth, canvasHeight);
    }
}

function SnapToGrid(value) {
    return Math.round(value / window.GRID_SNAPPING) * window.GRID_SNAPPING;
}

function RenderCrossCursor() {
    if(window.active_tool == "edit") return;
    ctx.globalAlpha = 1;
    draw_image(
        window.img_put,
        w2s_x(SnapToGrid(mCurrentX)) - 15,
        w2s_y(SnapToGrid(mCurrentY)) - 15,
        31,
        31
    );
}

function RenderSpawnAttemptRegion() {
    const { minX, minY, maxX, maxY } = spawnAreas.guessRegion.bounds;
    const x = w2s_x(minX);
    const y = w2s_y(minY);
    const w = w2s_w(maxX - minX);
    const h = w2s_h(maxY - minY);
    _DrawRectangle(currentTheme.spawnAreaBorderColor, currentTheme.spawnAreaBorderOpacity, x, y, w, h, true);
}

export function RenderValidSpawnRegion() {
    for (const rect of spawnAreas.validRegion.rects) {
        const x = w2s_x(rect.minX);
        const y = w2s_y(rect.minY);
        const w = w2s_w(rect.maxX - rect.minX);
        const h = w2s_h(rect.maxY - rect.minY);
        _DrawRectangle(currentTheme.spawnAreaValidColor, currentTheme.spawnAreaValidOpacity, x, y, w, h, false);
    }
}

function RenderFrame() {
    if(!window.need_redraw) return;
    canvasWidth = window.screenX;
    canvasHeight = window.screenY;
    currentTheme = canvasThemes[window.THEME] ?? canvasThemes[window.THEME_BLUE];
    gridOpacity = window.GRID_ALPHA;

    mClickX = window.m_drag_wx;
    mClickY = window.m_drag_wy;
    mCurrentX = window.mouse_wx;
    mCurrentY = window.mouse_wy;

    window.canv.style.cursor = "default";
    ctx.globalAlpha = 1;

    UpdateStars();

    RenderBackground();
    RenderGrid();
    RenderAllObjects();
    RenderSelectionBox();
    RenderCrossCursor();
    if (aleiSettings.renderSpawnAreas) {
        RenderSpawnAttemptRegion();
        RenderValidSpawnRegion();
    }
}

function DisplayStatistics() {
    let element = document.getElementById("gui-render-info");
    let fpsText;
    let renderedObjectsCountText;
    let approxRandomSpawnChanceText;
    if (element !== null) {
        fpsText = element.children[0];
        renderedObjectsCountText = element.children[1];
        approxRandomSpawnChanceText = element.children[2];
    }
    else {
        element = document.createElement("div");
        element.id = "gui-render-info";

        fpsText = document.createElement("p");
        fpsText.className = "gui-render-info__text";

        renderedObjectsCountText = document.createElement("p");
        renderedObjectsCountText.className = "gui-render-info__text";

        approxRandomSpawnChanceText = document.createElement("p");
        approxRandomSpawnChanceText.className = "gui-render-info__text";
        approxRandomSpawnChanceText.title = "The approximated probability of getting a fully random (failed) spawn in DM or TDM modes";
        approxRandomSpawnChanceText.innerHTML = `Random spawn chance: <span color="rgb(0, 255, 0)">0%</span>`;

        element.appendChild(fpsText);
        element.appendChild(renderedObjectsCountText);
        element.appendChild(approxRandomSpawnChanceText);

        window.right_panel.childNodes[0].insertBefore(element, document.getElementById("gui_params"));
    }
    fpsText.textContent = `Renderer FPS: ${displayFPS}`;
    renderedObjectsCountText.textContent = `Rendered Object: ${totalRenderedObjects} / ${window.es.length}`;
    if (!aleiSettings.renderSpawnAreas) {
        approxRandomSpawnChanceText.style.display = "none";
    }
    else {
        approxRandomSpawnChanceText.style.display = "initial";
        approxRandomSpawnChanceText.firstElementChild.textContent = Math.round(spawnAreas.approxRandomSpawnChance * 100) + "%";
        const r = easeOutExpo(spawnAreas.approxRandomSpawnChance, 5) * 255;
        const g = 255 - r;
        approxRandomSpawnChanceText.firstElementChild.style.color = `rgb(${r}, ${g}, 0)`;
    }
    /*let text = " ";
    text += `Renderer FPS: ${displayFPS} <br>`;
    text += `Rendered Object: ${totalRenderedObjects} / ${window.es.length}`;
    element.innerHTML = text.slice(1).replaceAll("\n", "<br>");*/
}

function getTimeMs() {return (new Date()).getTime()}

function RequestRedrawIfGridMoved() {
    let speedFactor = window.k_shift ? 5 : 1;

    function triggerMove() {
        window.zoom_validate();
        window.need_redraw = true;
        window.m_mistake_drag = false;
        window.mouse_wx = s2w_x(window.mouse_x);
        window.mouse_wy = s2w_x(window.mouse_y);
        //window.m_move();
    }

    let didMove = false;
    // X.
    if(window.speed_x !== 0) {
        let toAdd = window.zoom * 10 * speedFactor * window.speed_x;
        window.dis_from_x += toAdd;
        window.dis_to_x += toAdd;
        didMove = true;
    }
    // Y.
    if(window.speed_y !== 0) {
        let toAdd = window.zoom * 10 * speedFactor * window.speed_y;
        window.dis_from_y += toAdd;
        window.dis_to_y += toAdd;
        didMove = true;
    }

    if(didMove) triggerMove();
}

function HandleSingleFrame() {
    window.requestAnimationFrame(HandleSingleFrame);

    RequestRedrawIfGridMoved();
    RenderFrame();
    if(window.need_GUIParams_update) {
        window.need_GUIParams_update = false;
        window.UpdateGUIParams();
        window.UpdateGUIObjectsList();
    }

    fpsAccumulator++;
    if((getTimeMs() - lastTime) >= 1000) {
        lastTime = getTimeMs();
        displayFPS = fpsAccumulator;
        fpsAccumulator = 0;
    }

    DisplayStatistics();

    if(!haveForcedRecalculation) {
        let elem = document.getElementById("rparams");
        if(elem == undefined) return;
        window.ShowHideObjectBox();
        window.ShowHideObjectBox();
        haveForcedRecalculation = true;
    }
}

function PreviewModeUpdateVariables(val) {
    if(!val) return;
    for(let element of window.es) {
        if(!(element._class == "inf")) continue;
        let pm = element.pm;
        if(pm.mark == "sky") {
            previewBackground = pm.forteam;
            return;
        }
    }
}

export function Renderer_initialize() {
    ctx = window.ctx;

    // Draw functions.
    draw_rect_edges = (x, y, w, h) => ctx.strokeRect(x, y, w, h);
    draw_rect = window.MyFillRect; // lmfr
    draw_gridlines = window.Grid;
    draw_image = (img, x, y, w, h) => window.MyDrawImage(img, x, y, w, h);

    // Objects.
    regionImages = {
        1: window.img_region,
        9: window.img_region_red,
        10: window.img_region_blue
    }

    // set highLightedObjEdgeColor of each theme to window.selgrd3 once it's loaded
    setHighLightedObjEdgeColors();

    // Storing functions into our scope. (To avoid tampermonkey warning)
    w2s_x = window.w2s_x;
    w2s_y = window.w2s_y;
    s2w_x = window.s2w_x;
    s2w_y = window.s2w_y;
    w2s_h = window.w2s_h;
    w2s_w = window.w2s_w;
    s2w_h = window.s2w_h;
    s2w_w = window.s2w_w;
    // Patching.
    let osts = window.ShowTexturesSet;
    window.ShowTexturesSet = (val) => {PreviewModeUpdateVariables(val); osts(val)}
    window.Render = () => {}; // Make Render function do nothing.
    window.ani = () => {}; // Make ani function do nothing.
    window.requestAnimationFrame(HandleSingleFrame);

    // Setting default values.
    lastTime = getTimeMs();

    // Logging.
    aleiLog(logLevel.INFO, "[ALEI Renderer]: Active.");
}