import { canFindSharedMarkers, findCellRegions } from './cellRegions';

// Two dense 5x5 patches far apart, plus the extent of a larger UMAP around them.
const patch = (x0: number, y0: number) =>
    Array.from({ length: 25 }, (_, i) => ({
        x: x0 + (i % 5) * 0.05,
        y: y0 + Math.floor(i / 5) * 0.05,
    }));
const points = [
    ...patch(0, 0),
    ...patch(8, 8),
    { x: -2, y: -2 },
    { x: 12, y: 12 },
    { x: 0.6, y: 0.6 },
];
const first = Array.from({ length: 25 }, (_, i) => i);
const second = Array.from({ length: 25 }, (_, i) => 25 + i);

describe('findCellRegions', () => {
    it('splits cells that are far apart on the UMAP into regions, largest first', () => {
        const regions = findCellRegions([...second.slice(0, 20), ...first], points);
        expect(regions).toEqual([first, second.slice(0, 20)]);
        expect(canFindSharedMarkers(regions)).toBe(true);
    });

    it('keeps touching cells in one region', () => {
        expect(findCellRegions(first, points)).toEqual([first]);
        expect(canFindSharedMarkers([first])).toBe(false);
    });

    it('adds a stray cell to the nearest region', () => {
        expect(findCellRegions([...first, ...second, 52], points)).toEqual([
            [...first, 52],
            second,
        ]);
    });

    it('returns no regions for no cells', () => {
        expect(findCellRegions([], points)).toEqual([]);
    });
});
