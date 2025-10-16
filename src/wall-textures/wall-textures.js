import { getWallTextureImages } from "./wall-textures-algo.js";

export const params = new Set(["x", "y", "w", "h", "m"]);

let dirty = true;

/** @type {({tiling: false, image: HTMLImageElement, x: number, y: number} | {tiling: true, image: HTMLImageElement, x: number, y: number, width: number})[]} */
let cachedSprites = [];

function clearCache() {
    cachedSprites = [];
}

export function setDirty() {
    dirty = true;
    unsafeWindow.need_redraw = true;
}
unsafeWindow.wallTexturesSetDirty = setDirty; // add to window so it can be used in undo/redo

export function drawWallTextures(ctx) {
    if (dirty) update();

    ctx.save();

    ctx.globalAlpha = 1;
    const scale = 1 / unsafeWindow.zoom;
    ctx.translate(unsafeWindow.w2s_x(0), unsafeWindow.w2s_y(0));
    ctx.scale(scale, scale);

    for (const sprite of cachedSprites) {
        (sprite.tiling ? drawTilingSprite : drawSprite)(ctx, sprite);
    }

    ctx.restore();
}

function drawSprite(ctx, sprite) {
    ctx.drawImage(sprite.image, sprite.x, sprite.y, sprite.image.width, sprite.image.height);
}

function drawTilingSprite(ctx, tilingSprite) {
    if (tilingSprite.image.pattern === undefined) {
        tilingSprite.image.pattern = ctx.createPattern(tilingSprite.image, "repeat");
    }
    const pattern = tilingSprite.image.pattern;

    ctx.save();
    ctx.translate(0, tilingSprite.y);
    ctx.fillStyle = pattern;
    ctx.fillRect(tilingSprite.x, 0, tilingSprite.width, tilingSprite.image.height);
    ctx.restore();
}

function update() {
    if (!dirty) return;

    clearCache();

    const walls = es.filter(e => e._class === "box" && e.exists);
    const workingWalls = walls.filter(w => w.pm.x % 10 === 0 && w.pm.y % 10 === 0 && w.pm.w % 10 === 0 && w.pm.h % 10 === 0);
    const sprites = getWallTextureImages(workingWalls);

    cachedSprites = sprites;

    dirty = false;
}