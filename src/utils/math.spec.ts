import { formatNegLog10AsP } from './math';

describe('formatNegLog10AsP', () => {
    it('formats ordinary p-values with three significant digits', () => {
        expect(formatNegLog10AsP(2)).toBe('0.0100');
        expect(formatNegLog10AsP(5.5)).toBe('0.00000316');
        expect(formatNegLog10AsP(0)).toBe('1.00');
    });

    it('keeps p-values far below the smallest double readable', () => {
        expect(formatNegLog10AsP(8661.5)).toBe('3.16e-8662');
        expect(formatNegLog10AsP(400)).toBe('1.00e-400');
    });
});
