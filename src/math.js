/** converts degrees to radians */
export const asRadians = (function() {
    // not sure if it's necessary to precompute this value. javascript engine may do constant folding. can't hurt tho
    const multiplier = Math.PI / 180;
    return function(degrees) {
        return degrees * multiplier;
    }
})();

/**
 * modulo operator. differs from the remainder operator (%) when using negative operands
 */
export function mod(n, d) {
    return ((n % d) + d) % d;
}

/**
 * ease out exponential interpolation function (steepest at x=0)
 * @param {number} x value in the interval [0, 1] to interpolate
 * @param {number} k steepness. lower values bring the value at x=1 further from 1. about 5 or higher is good
 */
export function easeOutExpo(x, k=5) {
    return x >= 1 ? 1 : 1 - Math.E**(-k*x);
}

export function floatEq(x, y, threshold) {
    return Math.abs(x - y) < threshold;
}

/**
 * slab method implementation
 * @param {number[]} low low rect coordinates
 * @param {number[]} high high rect coordinates
 * @param {number[]} o line point
 * @param {number[]} r line direction
 * @param {number} equalThreshold float equality threshold
 * @returns {[] | [number[]] | [near: number[], far: number[]]}
 */
export function getRectLineIntersections(low, high, o, r, equalThreshold=0.0001) {
    const indexes = Array.from({ length: low.length }, (_, i) => i);
    const t_low = indexes.map(i => (low[i] - o[i]) / r[i]);
    const t_high = indexes.map(i => (high[i] - o[i]) / r[i]);
    const t_near = indexes.map(i => Math.min(t_low[i], t_high[i]));
    const t_far = indexes.map(i => Math.max(t_low[i], t_high[i]));
    const t_entered = Math.max(...t_near); // max of t_near because at that point the ray has entered at all axes
    const t_exited = Math.min(...t_far); // min of t_far because at that point the ray has exited at at least one axis
    if (Number.isNaN(t_entered) || Number.isNaN(t_exited)) return []; // ray parallel to a side and overlaps it -> intersections invalid
    if (t_exited < t_entered) return []; // exited an interval before entering another -> no intersections
    const p_near = indexes.map(i => o[i] + t_entered * r[i]);
    if (floatEq(t_exited, t_entered, equalThreshold)) return [p_near]; // exited an interval and entered another at the same point -> one intersection
    const p_far = indexes.map(i => o[i] + t_exited * r[i]);
    return [p_near, p_far];
}

/**
 * bresenham's line algorithm implementation  
 * inputs are assumed to be integers  
 * this implementation puts branching for some octant cases (flipY, steep) inside the loop for brevity  
 * returns array of coordinates (alternating x, y)
 * @param {number} x0 
 * @param {number} y0 
 * @param {number} x1 
 * @param {number} y1 
 * @returns {number[]}
 */
export function bresenham(x0, y0, x1, y1) {
    // concise explanation cuz some of this cryptic af:
    // algo operates on lines with slope 0 <= m <= 1, other lines converted into this case
    // write line as y=mx+b, sub m=dy/dx, simplify -> dy*x-dx*y+dx*b=0, sub A=dy=y1-y0 B=-dx=-(x1-x0) C=dx*b=(x1-x0)b -> f(x,y)=Ax+By+C=0
    // f(x,y) = 0 for any point on line. f(x,y) < 0 for any point above line due to - sign in B and vice versa for points below line.
    // at x_i next output point is (x_i+1,y_i) or (x_i+1,y_i+1). sign of f at midpoint (x_i+1,y_i+1/2) chooses (minimizes error)
    // to optimize by eliminating floats define difference D_i=f(x_i+1,y_i+1/2)-f(x0,y0). no geometric meaning but has same property as f
    // solve initial D -> D_0=dy-(1/2)*dx. every step if D >= 0: go up and D+=(f(x0+2,y0+3/2)-f(x0+1,y0+1/2)=A+B=dy-dx) else: D+=(f(x0+2,y0+1/2)-f(x0+1,y0+1/2)=A=dy)
    // multiply all D by 2 to eliminate fraction, fine cuz doesn't affect sign
    const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
    if (steep)
        [x0, x1, y0, y1] = [y0, y1, x0, x1]; // flip x and y
    if (x1 < x0)
        [x0, y0, x1, y1] = [x1, y1, x0, y0]; // flip points
    const flipY = y1 < y0;
    let dx = x1 - x0;
    let dy = Math.abs(y1 - y0);

    const output = new Array(2 * (x1 - x0 + 1));
    let D = 2 * dy - dx
    for (let i = 0; x0 <= x1; x0++) {
        output[i++] = steep ? y0 : x0;
        output[i++] = steep ? x0 : y0;
        if (D >= 0) {
            if (flipY) y0--; else y0++;
            D += 2 * (dy - dx);
        }
        else {
            D += 2 * dy;
        }
    }
    return output;
}