import {
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
    pvalue: [0, 1e-50, 0, 0.5],
    neg_log10_pvalue: [8661.2, 50, 812.4, 0.30103],
    fdr: [0, 2e-50, 0, 0.5],
    neg_log10_fdr: [8660.6, 49.7, 812.1, 0.30103],
    replicate_test: {
        status: 'ok',
        replicates: [
            { name: 'act15GFP', n_selected: 1500, n_reference: 8000, used: true },
            { name: 'mCerulean', n_selected: 900, n_reference: 6000, used: true },
            { name: 'mCherry', n_selected: 5, n_reference: 6878, used: false },
        ],
        n_genes_tested: 3,
    },
    replicate_pvalue: [1e-6, 0.002, 0.3, null],
    replicate_fdr: [4e-6, 0.004, 0.4, null],
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
        expect(differentialExpression.json.gene_id).toEqual(result.genes);
        expect(differentialExpression.json.logfc).toEqual(result.log2_fold_change);
        expect(differentialExpression.json.cohens_d).toEqual(result.cohens_d);
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
});
