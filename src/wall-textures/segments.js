const GET = "get";
const UPDATE = "update";
const TOP = "top";
const BOTTOM = "bottom";
const OPEN = "open";
const CLOSE = "close";
const SURFACE = "surface";
const BELOW_LEFT_CORNER = "below_left_corner";
const ABOVE_LEFT_CORNER = "above_left_corner";
const BELOW_RIGHT_CORNER = "below_right_corner";
const ABOVE_RIGHT_CORNER = "above_right_corner";

export function runWallSegmentsAlgorithm(walls) {
    function ceilTo10(num) {
        return Math.ceil(num / 10) * 10;
    }

    const events = walls
        .filter(wall => wall.pm.w > 0)
        .flatMap(wall => {
            const { x, y, w, h } = wall.pm;
            return [
                // events for getting textured surfaces
                { y,        start: x, end: x + ceilTo10(w), phase: OPEN,  operation: GET, wall },
                { y: y + h, start: x, end: x + ceilTo10(w), phase: CLOSE, operation: GET, wall },

                // events for updating segment tree data
                // walls
                { y,        start: x, end: x + w, phase: OPEN,  operation: UPDATE, affect: SURFACE, },
                { y: y + h, start: x, end: x + w, phase: CLOSE, operation: UPDATE, affect: SURFACE, },
                // corner checks
                { y: y - 5,     start: x + 5, end: x + w + 5, phase: OPEN,  operation: UPDATE, affect: BELOW_LEFT_CORNER, },
                { y: y + h - 5, start: x + 5, end: x + w + 5, phase: CLOSE, operation: UPDATE, affect: BELOW_LEFT_CORNER, },
                { y: y + 5,     start: x + 5, end: x + w + 5, phase: OPEN,  operation: UPDATE, affect: ABOVE_LEFT_CORNER, },
                { y: y + h + 5, start: x + 5, end: x + w + 5, phase: CLOSE, operation: UPDATE, affect: ABOVE_LEFT_CORNER, },
                { y: y - 5,     start: x - 5, end: x + w - 5, phase: OPEN,  operation: UPDATE, affect: BELOW_RIGHT_CORNER, },
                { y: y + h - 5, start: x - 5, end: x + w - 5, phase: CLOSE, operation: UPDATE, affect: BELOW_RIGHT_CORNER, },
                { y: y + 5,     start: x - 5, end: x + w - 5, phase: OPEN,  operation: UPDATE, affect: ABOVE_RIGHT_CORNER, },
                { y: y + h + 5, start: x - 5, end: x + w - 5, phase: CLOSE, operation: UPDATE, affect: ABOVE_RIGHT_CORNER, },
            ];
        })
        // sort by y while putting TOP first
        .sort((a, b) => 
            a.y - b.y || // prioritize sorting by y
            eventSortKey(a) - eventSortKey(b)
        );
    
    function eventSortKey(e) {
        if (e.operation === UPDATE && (
            e.affect === ABOVE_LEFT_CORNER ||
            e.affect === ABOVE_RIGHT_CORNER ||
            e.affect === BELOW_LEFT_CORNER ||
            e.affect === BELOW_RIGHT_CORNER
        )) {
            // put open corner checks first, close last
            return e.phase === OPEN ? 0 : 6;
        }

        // get top - update bottom - get bottom - update top
        if (e.operation === GET && e.phase === OPEN) return 1;
        if (e.operation === UPDATE && e.phase === CLOSE) return 2;
        if (e.operation === GET && e.phase === CLOSE) return 3;
        if (e.operation === UPDATE && e.phase === OPEN) return 4;
        return 5;
    }

    let wallTextureSegments = new Map();

    let xIntervalsTree;
    try {
        xIntervalsTree = new WallSegmentTree(events.flatMap(({ start, end }) => [start, end]));
    }
    catch {
        return wallTextureSegments; // early exit if there are fewer than 2 unique x-values (rendering won't work and there's nothing to render)
    }

    for (const event of events) {
        const { start, end, phase, operation } = event;
        
        if (operation === GET) {
            const side = phase === OPEN ? TOP : BOTTOM
            const segments = xIntervalsTree.getSegments(start, end, side);
            if (segments.length > 0) {
                let sides = wallTextureSegments.get(event.wall);
                if (sides === undefined) {
                    sides = { top: [], bottom: [] };
                    wallTextureSegments.set(event.wall, sides);
                }
                sides[side] = segments;
            }
        }
        else {
            xIntervalsTree.update(start, end, phase === OPEN ? 1 : -1, event.affect);
        }
    }

    return wallTextureSegments;
}

class WallSegmentTree {    
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
        this.nodeWallCount = new Int8Array(4 * this.leaves);
        this.nodeWallsAboveLeftCorner = new Int8Array(4 * this.leaves);
        this.nodeWallsBelowLeftCorner = new Int8Array(4 * this.leaves);
        this.nodeWallsAboveRightCorner = new Int8Array(4 * this.leaves);
        this.nodeWallsBelowRightCorner = new Int8Array(4 * this.leaves);

        this.getSegmentsState = {
            segments: [],
            previous10thWasBlocked: false,
            side: TOP,
        };
    }

    /** returns the left child node index of the node with index i */
    leftChild(i) {
        return 2*i;
    }

    /** returns the right child node index of the node with index i */
    rightChild(i) {
        return 2*i + 1;
    }

    update(start, end, delta, affect) {
        if (!(start in this.coordIndexes) || !(end in this.coordIndexes)) {
            throw new Error("Start or end value is not in original coordinate set.");
        }
        if (start >= end) {
            throw new Error("Start must be less than end");
        }
        const queryLeft = this.coordIndexes[start];
        const queryRight = this.coordIndexes[end];
        this._update(1, 0, this.leaves, queryLeft, queryRight, delta, affect);
    }

    _update(node, left, right, ql, qr, delta, affect) {
        if (right <= ql || qr <= left) return; // don't run for nodes whose intervals don't contain the query interval

        if (ql <= left && right <= qr) { // current node's range is completely within the query range
            if (affect === SURFACE) this.nodeWallCount[node] += delta;
            else if (affect === BELOW_LEFT_CORNER) this.nodeWallsBelowLeftCorner[node] += delta;
            else if (affect === ABOVE_LEFT_CORNER) this.nodeWallsAboveLeftCorner[node] += delta;
            else if (affect === BELOW_RIGHT_CORNER) this.nodeWallsBelowRightCorner[node] += delta;
            else if (affect === ABOVE_RIGHT_CORNER) this.nodeWallsAboveRightCorner[node] += delta;
        }

        if (right - left > 1) { // current node is not a leaf node
            const split = Math.floor((left + right) / 2); // split index
            this._update(this.leftChild(node), left, split, ql, qr, delta, affect);
            this._update(this.rightChild(node), split, right, ql, qr, delta, affect);
        }
    }
    
    getSegments(start, end, side) {
        this.getSegmentsState.segments = [];
        this.getSegmentsState.previous10thWasBlocked = false;
        this.getSegmentsState.side = side;
        const queryLeft = this.coordIndexes[start];
        const queryRight = this.coordIndexes[end];
        this._getSegments(1, 0, this.leaves, queryLeft, queryRight);
        return this.getSegmentsState.segments;
    }

    _getSegments(node, left, right, ql, qr) {
        if (right <= ql || qr <= left) return; // don't run for nodes whose intervals don't contain the query interval
        
        if (right - left > 1) { // current node is not a leaf node
            const split = Math.floor((left + right) / 2); // split index
            this._getSegments(this.leftChild(node), left, split, ql, qr);
            this._getSegments(this.rightChild(node), split, right, ql, qr);
        }
        else if (ql <= left && right <= qr) {
            let newSegment = null;

            const state = this.getSegmentsState;
            const wallStart = this.coords[ql];
            const nodeStart = this.coords[left];
            const nodeEnd = this.coords[right];
            const firstOverlapped10th = Math.ceil((nodeStart - wallStart) / 10) * 10 + wallStart;
            const continueLastSegmentFromStart = !state.previous10thWasBlocked && firstOverlapped10th > nodeStart;
            if (firstOverlapped10th >= nodeEnd) {
                if (continueLastSegmentFromStart) {
                    newSegment = { start: nodeStart, end: nodeEnd };
                }
            }
            else if (this.nodeWallCount[node] <= 0) { // not blocked
                const newSegmentStart = continueLastSegmentFromStart ? nodeStart : firstOverlapped10th;
                newSegment = { start: newSegmentStart, end: nodeEnd };
                state.previous10thWasBlocked = false;
            }
            else { // blocked
                if (continueLastSegmentFromStart) {
                    newSegment = { start: nodeStart, end: firstOverlapped10th };
                }
                state.previous10thWasBlocked = true;
            }

            if (newSegment !== null) {
                // check corner conditions
                if (state.side === TOP) {
                    newSegment.hasLeftCorner = this.nodeWallsBelowLeftCorner[node] <= 0 || this.nodeWallsAboveLeftCorner[node] > 0;
                    newSegment.hasRightCorner = this.nodeWallsBelowRightCorner[node] <= 0 || this.nodeWallsAboveRightCorner[node] > 0;
                }
                else {
                    newSegment.hasLeftCorner = this.nodeWallsAboveLeftCorner[node] <= 0 || this.nodeWallsBelowLeftCorner[node] > 0;
                    newSegment.hasRightCorner = this.nodeWallsAboveRightCorner[node] <= 0 || this.nodeWallsBelowRightCorner[node] > 0;
                }

                const prev = state.segments[state.segments.length - 1];
                if (prev !== undefined && newSegment.start === prev.end) {
                    // merge
                    prev.end = newSegment.end;
                    prev.hasRightCorner = newSegment.hasRightCorner;
                }
                else {
                    // add new
                    state.segments.push(newSegment);
                }
            }
        }
    }
}