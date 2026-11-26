import {
    combineRegionResults,
    getSharedMarkersName,
    getCellSelectionMessage,
    getCellSelectionName,
    toDifferentialExpression,
} from './cellSelectionDifferentialExpression';
import { CellDeResponse } from 'api/cellDeApi';
import { CELL_SELECTION_DIFFERENTIAL_EXPRESSION_ID } from 'redux/stores/differentialExpressions';

const result: CellDeResponse = {
    strain: 'AX4',
    test: 't-test_overestim_var',
    n_selected: 3412,
    n_reference: 20878,
    genes: ['DDB_G1', 'DDB_G2', 'DDB_G3', 'DDB_G4'],
    symbols: ['a', 'b', 'c', 'd'],
    log2_fold_change: [2.5, -3, 0.2, 4],
    cohens_d: [1.9, -1.2, 2.1, 0.3],
    pct_selected: [0.95, 0.04, 0.6, 0.3],
    pct_reference: [0.05, 0.9, 0.4, 0.01],
    pvalue: [0, 1e-50, 0, 0.5],
    neg_log10_pvalue: [8661.2, 50, 812.4, 0.30103],
    fdr: [0, 2e-50, 0, 0.5],
    neg_log10_fdr: [8660.6, 49.7, 812.1, 0.30103],
    replicate_test: {
        status: 'ok',
        method: 'limma-treat',
        min_log2_fold_change: 1,
        replicates: [
            { name: 'act15GFP', n_selected: 1500, n_reference: 8000, used: true },
            { name: 'mCerulean', n_selected: 900, n_reference: 6000, used: true },
            { name: 'mCherry', n_selected: 5, n_reference: 6878, used: false },
        ],
        n_genes_tested: 3,
    },
    replicate_pvalue: [1e-6, 0.002, 0.3, null],
    replicate_fdr: [4e-6, 0.004, 0.4, null],
    replicate_log2_fold_change: [2.2, -2.8, 0.15, null],
};

describe('cellSelectionDifferentialExpression', () => {
    it('names the marker ranking briefly and describes it fully in the message', () => {
        expect(getCellSelectionName('AX4', 'sameTime', 3412)).toBe(
            'Markers: 3,412 AX4 cells vs same time points',
        );
        expect(getCellSelectionName('acaA-', 'rest', 10)).toBe(
            'Markers: 10 acaA- cells vs all other cells',
        );
        expect(getCellSelectionMessage('AX4', 'sameTime', 3412, 20878)).toBe(
            'Ranked markers of 3,412 selected cells against 20,878 AX4 cells from the same ' +
                'time points. The result is in Differential expression.',
        );
    });

    it('maps the result to a marker ranking with effect sizes and exploratory p-values', () => {
        const differentialExpression = toDifferentialExpression(result, 'name');

        expect(differentialExpression.id).toBe(CELL_SELECTION_DIFFERENTIAL_EXPRESSION_ID);
        expect(differentialExpression.kind).toBe('markers');
        expect(differentialExpression.json.replicate_pvalue).toEqual(result.replicate_pvalue);
        expect(differentialExpression.json.replicate_fdr).toEqual(result.replicate_fdr);
        expect(differentialExpression.json.replicate_test).toEqual(result.replicate_test);
        expect(differentialExpression.json.replicate_log2_fold_change).toEqual(
            result.replicate_log2_fold_change,
        );
        expect(differentialExpression.json.gene_id).toEqual(result.genes);
        expect(differentialExpression.json.logfc).toEqual(result.log2_fold_change);
        expect(differentialExpression.json.cohens_d).toEqual(result.cohens_d);
        expect(differentialExpression.json.pct_selected).toEqual(result.pct_selected);
        expect(differentialExpression.json.pct_reference).toEqual(result.pct_reference);
        // Kept as -log10: the p-values themselves underflowed to 0.
        expect(differentialExpression.json.neg_log10_pvalue).toEqual(result.neg_log10_pvalue);
        expect(differentialExpression.json.neg_log10_fdr).toEqual(result.neg_log10_fdr);
        expect(differentialExpression.output.species).toBe('Dictyostelium discoideum');
    });

    it('counts genes past both the fold change and effect size thresholds', () => {
        const differentialExpression = toDifferentialExpression(result, 'name');

        // DDB_G3 has a large d but a small fold change, DDB_G4 the other way round.
        expect(differentialExpression.up_regulated).toBe(1);
        expect(differentialExpression.down_regulated).toBe(1);
    });

    it('keeps only genes that change the same way in every region, at their weakest', () => {
        // Genes: up in both, down in both, up in one region only, up in both with mixed d.
        const region = (
            fc: number[],
            d: number[],
            selected: number[],
            reference: number[],
            p: (number | null)[],
        ): CellDeResponse => ({
            ...result,
            log2_fold_change: fc,
            cohens_d: d,
            pct_selected: selected,
            pct_reference: reference,
            neg_log10_pvalue: [10, 10, 10, 10],
            neg_log10_fdr: [9, 9, 9, 9],
            replicate_pvalue: p,
            replicate_fdr: p,
            replicate_log2_fold_change: fc,
        });
        const shared = combineRegionResults([
            region(
                [3, -2, 2, 1],
                [1.5, -1.2, 1.4, 0.9],
                [0.9, 0.05, 0.8, 0.6],
                [0.04, 0.8, 0.1, 0.2],
                [0.001, 0.01, 0.02, 0.03],
            ),
            region(
                [2, -4, -1, 2],
                [1.1, -2, -0.5, -0.1],
                [0.7, 0.02, 0.1, 0.5],
                [0.08, 0.9, 0.3, 0.2],
                [0.02, null, 0.04, 0.05],
            ),
        ]);

        expect(shared.log2_fold_change).toEqual([2, -2, 0, 0]);
        expect(shared.cohens_d).toEqual([1.1, -1.2, 0, 0]);
        // Least favourable region: lowest detection where higher, highest where lower.
        expect(shared.pct_selected[0]).toBe(0.7);
        expect(shared.pct_reference[0]).toBe(0.08);
        expect(shared.pct_selected[1]).toBe(0.05);
        expect(shared.pct_reference[1]).toBe(0.8);
        // Largest p over the regions; untested in any region stays untested.
        expect(shared.replicate_pvalue).toEqual([0.02, null, 1, 0.05]);
        expect(shared.n_selected).toBe(2 * result.n_selected);
        expect(getSharedMarkersName('AX4', 'sameTime', [3969, 1171])).toBe(
            'Shared markers: 2 regions (3,969 + 1,171 AX4 cells) vs same time points',
        );
    });
});
