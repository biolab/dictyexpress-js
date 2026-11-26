import { CellDeResponse } from 'api/cellDeApi';
import { DifferentialExpression } from 'redux/models/internal';
import { CELL_SELECTION_DIFFERENTIAL_EXPRESSION_ID } from 'redux/stores/differentialExpressions';

/*
 * Selected cells are a marker ranking: genes are ranked by Cohen's d, which doesn't grow with
 * the number of cells. The gene table's p-values come from a pseudobulk test across the
 * strain's biological replicates, not from treating each cell as a replicate (explained in the
 * module's info, moduleInfoContent.tsx).
 */
const LOGFC_THRESHOLD = 1;
// Cohen's conventional "large" effect.
const EFFECT_SIZE_THRESHOLD = 0.8;

export type CellSelectionReference = 'sameTime' | 'rest';
// Pooled: the selected cells as one group. Shared: each region of the selection on its own,
// keeping genes that differ the same way in every region.
export type CellSelectionScope = 'combined' | 'shared';

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

export const getSharedMarkersName = (
    strain: string,
    reference: CellSelectionReference,
    regionSizes: number[],
): string =>
    `Shared markers: ${regionSizes.length} regions (${regionSizes.map(formatCount).join(' + ')} ${strain} cells) vs ${REFERENCE_NAMES[reference]}`;

export const getSharedMarkersMessage = (
    reference: CellSelectionReference,
    regionSizes: number[],
): string =>
    `Ranked markers shared by all ${regionSizes.length} selected regions, each against ${
        reference === 'sameTime'
            ? 'unselected cells from its own time points'
            : 'all unselected cells'
    }. The result is in Differential expression.`;

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

const benjaminiHochberg = (pvalues: (number | null)[]): (number | null)[] => {
    const tested = pvalues
        .map((p, index) => ({ p, index }))
        .filter((entry): entry is { p: number; index: number } => entry.p != null)
        .sort((a, b) => a.p - b.p);
    const adjusted: (number | null)[] = pvalues.map(() => null);
    let running = 1;
    for (let rank = tested.length; rank >= 1; rank--) {
        const { p, index } = tested[rank - 1];
        running = Math.min(running, (p * tested.length) / rank);
        adjusted[index] = running;
    }
    return adjusted;
};

/**
 * Combines the results of each region against unselected cells into shared markers. A gene
 * counts only if its fold change and Cohen's d have the same sign in every region; it then gets
 * its weakest fold change and effect size, its lowest detection in the group where it is higher
 * and its highest in the group where it is lower, and its largest p-value across regions (an
 * intersection-union test). Other genes get no effect: fold change and d of 0.
 */
export const combineRegionResults = (results: CellDeResponse[]): CellDeResponse => {
    const [first] = results;
    const nGenes = first.genes.length;
    const log2FoldChange: number[] = [];
    const cohensD: number[] = [];
    const pctSelected: number[] = [];
    const pctReference: number[] = [];
    const negLog10P: number[] = [];
    const negLog10Fdr: number[] = [];
    const replicateP: (number | null)[] = [];
    const replicateFc: (number | null)[] = [];
    const replicateTested = results.every((result) => result.replicate_pvalue != null);

    for (let gene = 0; gene < nGenes; gene++) {
        const fcs = results.map((result) => result.log2_fold_change[gene]);
        const ds = results.map((result) => result.cohens_d[gene]);
        const up = fcs.every((fc) => fc > 0) && ds.every((d) => d > 0);
        const down = fcs.every((fc) => fc < 0) && ds.every((d) => d < 0);
        const sign = up ? 1 : -1;
        const consistent = up || down;
        const selected = results.map((result) => result.pct_selected[gene]);
        const reference = results.map((result) => result.pct_reference[gene]);

        log2FoldChange.push(consistent ? sign * Math.min(...fcs.map(Math.abs)) : 0);
        cohensD.push(consistent ? sign * Math.min(...ds.map(Math.abs)) : 0);
        pctSelected.push(down ? Math.max(...selected) : Math.min(...selected));
        pctReference.push(down ? Math.min(...reference) : Math.max(...reference));
        negLog10P.push(consistent ? Math.min(...results.map((r) => r.neg_log10_pvalue[gene])) : 0);
        negLog10Fdr.push(consistent ? Math.min(...results.map((r) => r.neg_log10_fdr[gene])) : 0);

        const ps = replicateTested ? results.map((r) => r.replicate_pvalue?.[gene] ?? null) : [];
        const repFcs = replicateTested
            ? results.map((r) => r.replicate_log2_fold_change?.[gene] ?? null)
            : [];
        if (!replicateTested || ps.some((p) => p == null) || repFcs.some((fc) => fc == null)) {
            replicateP.push(null);
            replicateFc.push(null);
        } else {
            const values = repFcs as number[];
            const repUp = values.every((fc) => fc > 0);
            const repDown = values.every((fc) => fc < 0);
            replicateP.push(repUp || repDown ? Math.max(...(ps as number[])) : 1);
            replicateFc.push(
                repUp || repDown ? (repUp ? 1 : -1) * Math.min(...values.map(Math.abs)) : 0,
            );
        }
    }

    const failed = results.find((result) => result.replicate_test.status !== 'ok');
    return {
        ...first,
        n_selected: results.reduce((sum, result) => sum + result.n_selected, 0),
        n_reference: Math.min(...results.map((result) => result.n_reference)),
        log2_fold_change: log2FoldChange,
        cohens_d: cohensD,
        pct_selected: pctSelected,
        pct_reference: pctReference,
        neg_log10_pvalue: negLog10P,
        neg_log10_fdr: negLog10Fdr,
        pvalue: negLog10P.map((value) => 10 ** -value),
        fdr: negLog10Fdr.map((value) => 10 ** -value),
        replicate_test: failed
            ? { ...failed.replicate_test, replicates: undefined }
            : { ...first.replicate_test, replicates: undefined },
        ...(replicateTested && !failed
            ? {
                  replicate_pvalue: replicateP,
                  replicate_fdr: benjaminiHochberg(replicateP),
                  replicate_log2_fold_change: replicateFc,
              }
            : {
                  replicate_pvalue: undefined,
                  replicate_fdr: undefined,
                  replicate_log2_fold_change: undefined,
              }),
    };
};

/**
 * Wraps a cell-de result as a marker ranking entry, so the differential expressions module
 * shows it with its volcano layout and selection dialog.
 */
export const toDifferentialExpression = (
    result: CellDeResponse,
    name: string,
    sharedRegionSizes?: number[],
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
        ...(sharedRegionSizes != null && { shared_region_sizes: sharedRegionSizes }),
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
            pct_selected: result.pct_selected,
            pct_reference: result.pct_reference,
            neg_log10_pvalue: result.neg_log10_pvalue,
            neg_log10_fdr: result.neg_log10_fdr,
            replicate_pvalue: result.replicate_pvalue,
            replicate_fdr: result.replicate_fdr,
            replicate_log2_fold_change: result.replicate_log2_fold_change,
            replicate_test: result.replicate_test,
        },
    } as unknown as DifferentialExpression;
};
