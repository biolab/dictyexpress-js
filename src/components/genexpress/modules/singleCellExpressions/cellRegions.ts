/*
 * Regions of a cell selection: groups of selected cells that touch on the UMAP. The selection
 * is stored as plain cell ids, so regions are found from the cells' positions, not from the
 * outlines that selected them.
 */

// Cells link when they fall in neighbouring squares of this fraction of the UMAP's extent.
const GRID_FRACTION = 0.02;
// Smaller groups are strays: they join the nearest region instead of forming their own.
export const MIN_REGION_CELLS = 10;
// Shared markers are offered for this many regions at most; more is a scattered selection.
export const MAX_SHARED_REGIONS = 6;

type Point = { x: number; y: number };

/** Selected cells grouped into regions, largest first. */
export const findCellRegions = (cells: number[], points: Point[]): number[][] => {
    if (cells.length === 0 || points.length === 0) return [];

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const { x, y } of points) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }
    const step = Math.max(maxX - minX, maxY - minY) * GRID_FRACTION || 1;

    const squares = new Map<string, number[]>();
    const squareOf = (cell: number): [number, number] => [
        Math.floor(points[cell].x / step),
        Math.floor(points[cell].y / step),
    ];
    for (const cell of cells) {
        const key = squareOf(cell).join(',');
        const square = squares.get(key);
        if (square) square.push(cell);
        else squares.set(key, [cell]);
    }

    const seen = new Set<string>();
    const groups: number[][] = [];
    for (const start of Array.from(squares.keys())) {
        if (seen.has(start)) continue;
        seen.add(start);
        const stack = [start];
        const group: number[] = [];
        while (stack.length > 0) {
            const key = stack.pop() as string;
            group.push(...(squares.get(key) as number[]));
            const [sx, sy] = key.split(',').map(Number);
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const next = `${sx + dx},${sy + dy}`;
                    if (squares.has(next) && !seen.has(next)) {
                        seen.add(next);
                        stack.push(next);
                    }
                }
            }
        }
        groups.push(group);
    }

    const regions = groups.filter((group) => group.length >= MIN_REGION_CELLS);
    const strays = groups.filter((group) => group.length < MIN_REGION_CELLS);
    if (regions.length === 0) return [groups.flat().sort((a, b) => a - b)];

    const centroid = (group: number[]): Point => ({
        x: group.reduce((sum, cell) => sum + points[cell].x, 0) / group.length,
        y: group.reduce((sum, cell) => sum + points[cell].y, 0) / group.length,
    });
    const centroids = regions.map(centroid);
    for (const stray of strays) {
        const { x, y } = centroid(stray);
        let nearest = 0;
        centroids.forEach((c, index) => {
            const best = centroids[nearest];
            if (Math.hypot(c.x - x, c.y - y) < Math.hypot(best.x - x, best.y - y)) nearest = index;
        });
        regions[nearest].push(...stray);
    }

    return regions
        .map((region) => region.sort((a, b) => a - b))
        .sort((a, b) => b.length - a.length);
};

/** Whether a selection's regions can be compared one by one for shared markers. */
export const canFindSharedMarkers = (regions: number[][]): boolean =>
    regions.length >= 2 && regions.length <= MAX_SHARED_REGIONS;
