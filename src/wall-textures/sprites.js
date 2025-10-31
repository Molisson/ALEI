import { wallMaterials, getWallTextureImage } from "./wall-assets.js";

const makeSprite = (image, x, y) => ({ tiling: false, image, x, y });
const makeTilingSprite = (image, x, y, width) => ({ tiling: true, image, x, y, width });

export function getWallSegmentSprites(segment, material, side) {
    const parts = wallMaterials[material]?.sprites[side];
    if (parts === undefined) return [];

    const segWidth = segment.end - segment.start;

    const sprites = [];
    
    if (parts.mid !== undefined) {
        const part = parts.mid;
        const image = getWallTextureImage(part.sprite);
        if (image !== undefined && image.loaded) {
            const x = part.offsetX ?? 0;
            const y = (part.offsetY ?? 0) + (side === "bottom" ? -image.height : 0);
            const width = segWidth + (part.widthAdjustment ?? 0);
            sprites.push(makeTilingSprite(image, x, y, width));
        }
    }

    if (parts.left !== undefined) {
        const part = parts.left;
        if ((segment.hasLeftCorner && segWidth >= 20) || !(part.requiresCorner ?? true)) {
            const image = getWallTextureImage(part.sprite);
            if (image !== undefined && image.loaded) {
                const x = part.offsetX ?? 0;
                const y = (part.offsetY ?? 0) + (side === "bottom" ? -image.height : 0);
                sprites.push(makeSprite(image, x, y));
            }
        }
    }

    if (parts.right !== undefined) {
        const part = parts.right;
        if ((segment.hasRightCorner && segWidth >= 20) || !(part.requiresCorner ?? true)) {
            const image = getWallTextureImage(part.sprite);
            if (image !== undefined && image.loaded) {
                const x = (part.offsetX ?? 0) + segWidth - image.width;
                const y = (part.offsetY ?? 0) + (side === "bottom" ? -image.height : 0);
                sprites.push(makeSprite(image, x, y));
            }
        }
    }
    
    return sprites;
}