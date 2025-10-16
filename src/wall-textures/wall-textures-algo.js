import { wallMaterials, getWallTextureImage } from "./wall-assets.js";

function makeSprite(image, x, y) {
    return { tiling: false, image, x, y };
}

function makeTilingSprite(image, x, y, width) {
    return { tiling: true, image, x, y, width };
}

const TOP = 0;
const BOTTOM = 1;

export function getWallTextureImages(walls) {
    const events = walls
        .filter(wall => wall.pm.w > 0 && wall.pm.h >= 0)
        .flatMap((wall, index) => {
            return [
                { y: wall.pm.y,             minX: wall.pm.x, maxX: wall.pm.x + wall.pm.w, side: TOP,    wallMaterial: wall.pm.m, wallPriority: index, depth: 0 },
                { y: wall.pm.y + wall.pm.h, minX: wall.pm.x, maxX: wall.pm.x + wall.pm.w, side: BOTTOM, wallMaterial: wall.pm.m, wallPriority: index, depth: 0 },
            ];
        })
        // sort by y while putting TOP first
        .sort((a, b) => {
            if (a.y !== b.y) return a.y - b.y; // prioritize sorting by y
            if (a.side !== b.side) return a.side === TOP ? -1 : 1; // put event for TOP side first if y values are the same
            return 0;
        });

    // set depth values
    {
        let depth = 0;
        let lastY = -Infinity;
        for (const event of events) {
            if (event.y > lastY) {
                depth++;
                lastY = event.y;
            }
            event.depth = depth;
        }
    }

    let xIntervalsTree;
    try {
        xIntervalsTree = new WallRenderingSegmentTree(events.flatMap(({ minX, maxX }) => [minX, maxX]));
    }
    catch {
        return []; // early exit if there are fewer than 2 unique x-values (rendering won't work and there's nothing to render)
    }

    let sprites = [];

    function addSpritesForSegment(segment, y) {
        const segmentSprites = getWallSegmentSprites(segment);
        for (const sprite of segmentSprites) {
            sprite.x += segment.start;
            sprite.y += y;
            sprites.push(sprite);
        }
    }

    let prevY = Infinity;
    for (const { y, minX, maxX, side, wallMaterial, wallPriority, depth } of events) {
        const dy = y - prevY;
        if (dy > 0) {
            const segments = xIntervalsTree.getSegments();
            for (const segment of segments) {
                addSpritesForSegment(segment, prevY);
            }
        }
        
        xIntervalsTree.update(minX, maxX, side, wallMaterial, wallPriority, depth);

        prevY = y;
    }

    // add textures to sides at the lowest y
    const segments = xIntervalsTree.getSegments();
    for (const segment of segments) {
        addSpritesForSegment(segment, prevY);
    }

    return sprites;
}

class WallRenderingSegmentTree {
    constructor(coords) {
        this.coords = [...new Set(coords)].sort((a, b) => a - b);
        if (this.coords.length < 2) {
            throw new Error("Cannot create interval tree for less than 2 unique coordinates");
        }
        this.coordIndexes = Object.fromEntries(this.coords.map((v, i) => [v, i])); // maps coords to their indexes / leaf node indexes
        this.leaves = this.coords.length - 1; // number of leaf nodes/intervals

        // data for nodes.
        // root is index 1. left and right child node index is given by 2*i and 2*i + 1 where i is the parent node index.
        // space is allocated for 4 times the number of leaf nodes to ensure that there's a slot for every node.
        this.nodeWallCount = new Uint8Array(4 * this.leaves);
        this.nodeBubblingWallCount = new Uint8Array(4 * this.leaves); // number of walls that intersect the node or its child nodes
        this.nodeSide = new Uint8Array(4 * this.leaves); // TOP or BOTTOM (0 or 1)
        this.nodeMaterial = new Uint8Array(4 * this.leaves);
        this.nodePriority = new Uint16Array(4 * this.leaves); // higher priority walls will be rendered higher
        this.nodeDepth = new Uint8Array(4 * this.leaves);
        this.currentDepth = 0;
    }

    /** returns the left child node index of the node with index i */
    leftChild(i) {
        return 2*i;
    }

    /** returns the right child node index of the node with index i */
    rightChild(i) {
        return 2*i + 1;
    }

    update(start, end, side, material, priority, depth) {
        if (!(start in this.coordIndexes) || !(end in this.coordIndexes)) {
            throw new Error("Start or end value is not in original coordinate set.");
        }
        if (start >= end) {
            throw new Error("Start must be less than end");
        }
        const queryLeft = this.coordIndexes[start];
        const queryRight = this.coordIndexes[end];
        this._update(1, 0, this.leaves, queryLeft, queryRight, side, material, priority, depth);
    }

    _update(node, left, right, ql, qr, side, material, priority, depth) {
        if (right <= ql || qr <= left) return; // don't run for nodes whose intervals don't contain the query interval

        if (ql <= left && right <= qr) { // current node's range is completely within the query range
            this.nodeWallCount[node] += side === TOP ? 1 : -1;
            if (
                depth > this.nodeDepth[node] ||
                (side === BOTTOM && this.nodeSide[node] === TOP) || 
                priority > this.nodePriority[node]
            ) {
                this.nodeSide[node] = side;
                this.nodeMaterial[node] = material;
                this.nodePriority[node] = priority;
                this.nodeDepth[node] = depth;
            }
            this.currentDepth = depth;
        }

        this.nodeBubblingWallCount[node] += side === TOP ? 1 : -1;

        if (right - left > 1) { // current node is not a leaf node
            const split = Math.floor((left + right) / 2); // split index
            this._update(this.leftChild(node), left, split, ql, qr, side, material, priority, depth);
            this._update(this.rightChild(node), split, right, ql, qr, side, material, priority, depth);
        }
    }

    getSegments() {
        const result = [];
        this._getSegments(1, 0, this.leaves, result);
        return result;
    }

    _getSegments(node, left, right, result) {
        const allowedWallCount = this.nodeSide[node] === TOP ? 1 : 0; // 1 wall allowed for top side because That's The Wall
        if (this.nodeWallCount[node] <= allowedWallCount) {
            if (this.nodeBubblingWallCount[node] <= allowedWallCount && this.nodeDepth[node] >= this.currentDepth) {
                const start = this.coords[left];
                const end = this.coords[right];
                const material = this.nodeMaterial[node];
                const side = this.nodeSide[node] === TOP ? "top" : "bottom";

                const prev = result[result.length - 1];
                const adjacent = prev !== undefined && prev.end === start;
                const sameMaterial = prev !== undefined && prev.material === material;
                const sameSide = prev !== undefined && prev.side === side;
                if (!adjacent || !sameSide) {
                    result.push({ start, end, material, side, hasLeftCorner: true, hasRightCorner: true, });
                }
                else if (sameMaterial) {
                    prev.end = end;
                }
                else {
                    prev.hasRightCorner = false;
                    result.push({ start, end, material, side, hasLeftCorner: false, hasRightCorner: true, });
                }
            }
            else if (right - left > 1) {
                const split = Math.floor((left + right) / 2); // split index
                this._getSegments(this.leftChild(node), left, split, result);
                this._getSegments(this.rightChild(node), split, right, result);
            }
        }
    }
}

function getWallSegmentSprites(segment) {
    const parts = wallMaterials[segment.material]?.sprites[segment.side];
    if (parts === undefined) return [];

    const segWidth = segment.end - segment.start;

    const sprites = [];
    
    if (parts.mid !== undefined) {
        const part = parts.mid;
        const image = getWallTextureImage(part.sprite);
        if (image !== undefined && image.loaded) {
            const x = part.offsetX ?? 0;
            const y = (part.offsetY ?? 0) + (segment.side === "bottom" ? -image.height : 0);
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
                const y = (part.offsetY ?? 0) + (segment.side === "bottom" ? -image.height : 0);
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
                const y = (part.offsetY ?? 0) + (segment.side === "bottom" ? -image.height : 0);
                sprites.push(makeSprite(image, x, y));
            }
        }
    }

    return sprites;
}