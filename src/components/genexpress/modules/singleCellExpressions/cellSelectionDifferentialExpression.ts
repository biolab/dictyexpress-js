import { CellDeResponse, ReplicateTest } from 'api/cellDeApi';
import { DifferentialExpression } from 'redux/models/internal';
import { CELL_SELECTION_DIFFERENTIAL_EXPRESSION_ID } from 'redux/stores/differentialExpressions';

/*
 * Selected cells are a marker ranking: genes are ranked by Cohen's d, which doesn't grow with
 * the number of cells. The gene table's p-values come from a pseudobulk test across the
 * strain's biological replicates (separately grown fluorescent lines, or separate libraries),
 * not from treating each cell as a replicate. They stay exploratory because the cells were
 * picked from the same data.
 */
export const getCellSelectionNote = (replicateTest: ReplicateTest): string => {
    const ranking = "Genes ranked by effect size (Cohen's d).";
    if (replicateTest.status !== 'ok') {
        return `${ranking} No p-values: ${replicateTest.status}`;
    }
    const used = (replicateTest.replicates ?? []).filter((replicate) => replicate.used);
    return (
        `${ranking} P-values in the gene table: pseudobulk test across ${used.length} ` +
        `biological replicates (${used.map((replicate) => replicate.name).join(', ')}), ` +
        'exploratory because the cells were selected from the same data.'
    );
};

const LOGFC_THRESHOLD = 1;
// Cohen's conventional "large" effect.
const EFFECT_SIZE_THRESHOLD = 0.8;

export type CellSelectionReference = 'sameTime' | 'rest';

const formatCount = (count: number): string => count.toLocaleString('en-US');

const REFERENCE_NAMES: Record<CellSelectionReference, string> = {
    sameTime: 'same time points',
    rest: 'all other cells',
};

/** Short enough to read in the differential expression dropdown. */
export const getCellSelectionName = (
    strain: string,
    reference: CellSelectionReference,
    nSelected: number,
): string => `Markers: ${formatCount(nSelected)} ${strain} cells vs ${REFERENCE_NAMES[reference]}`;

export const getCellSelectionMessage = (
    strain: string,
    reference: CellSelectionReference,
    nSelected: number,
    nReference: number,
): string => {
    const referenceCells =
        reference === 'sameTime'
            ? `${formatCount(nReference)} ${strain} cells from the same time points`
            : `all ${formatCount(nReference)} other ${strain} cells`;
    return `Ranked markers of ${formatCount(nSelected)} selected cells against ${referenceCells}. The result is in Differential expression.`;
};

/**
 * Wraps a cell-de result as a marker ranking entry, so the differential expressions module
 * shows it with its volcano layout and selection dialog.
 */
export const toDifferentialExpression = (
    result: CellDeResponse,
    name: string,
): DifferentialExpression => {
    let upRegulated = 0;
    let downRegulated = 0;
    result.cohens_d.forEach((effectSize, index) => {
        const logFc = result.log2_fold_change[index];
        if (effectSize >= EFFECT_SIZE_THRESHOLD && logFc >= LOGFC_THRESHOLD) upRegulated += 1;
        if (effectSize <= -EFFECT_SIZE_THRESHOLD && logFc <= -LOGFC_THRESHOLD) downRegulated += 1;
    });

    // Only the fields the differential expressions module reads; the rest of the Resolwe
    // data object doesn't exist for a result computed on the fly.
    return {
        id: CELL_SELECTION_DIFFERENTIAL_EXPRESSION_ID,
        name,
        slug: 'single-cell-selection',
        created: new Date().toISOString(),
        kind: 'markers',
        note: getCellSelectionNote(result.replicate_test),
        logfc_threshold: LOGFC_THRESHOLD,
        effect_size_threshold: EFFECT_SIZE_THRESHOLD,
        prob_field: 'p value',
        prob_threshold: 0.01,
        up_regulated: upRegulated,
        down_regulated: downRegulated,
        output: { source: 'DICTYBASE', species: 'Dictyostelium discoideum' },
        json: {
            gene_id: result.genes,
            logfc: result.log2_fold_change,
            cohens_d: result.cohens_d,
            neg_log10_pvalue: result.neg_log10_pvalue,
            neg_log10_fdr: result.neg_log10_fdr,
            replicate_pvalue: result.replicate_pvalue,
            replicate_fdr: result.replicate_fdr,
        },
    } as unknown as DifferentialExpression;
};
