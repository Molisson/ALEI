import * as wallTxCache from "./cache.js";

export function drawWallTextures(ctx, wall) {
    wallTxCache.updateIfNecessary();

    const spritesPerSide = wallTxCache.get("sprites", wall);
    if (spritesPerSide === null) return;

    ctx.save();

    const scale = 1 / unsafeWindow.zoom;
    ctx.translate(unsafeWindow.w2s_x(0), unsafeWindow.w2s_y(0));
    ctx.scale(scale, scale);

    for (const sprite of spritesPerSide.bottom) {
        (sprite.tiling ? drawTilingSprite : drawSprite)(ctx, sprite);
    }
    for (const sprite of spritesPerSide.top) {
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