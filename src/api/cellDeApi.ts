import { post } from './fetch';
import { deserializeResponse } from 'utils/apiUtils';

export type ReplicateTest = {
    // 'ok', or why the pseudobulk test across replicates didn't run.
    status: string;
    replicates?: { name: string; n_selected: number; n_reference: number; used: boolean }[];
    n_genes_tested?: number;
};

export type CellDeResponse = {
    strain: string;
    test: string;
    n_selected: number;
    n_reference: number;
    genes: string[];
    symbols: string[];
    log2_fold_change: number[];
    cohens_d: number[];
    pvalue: number[];
    neg_log10_pvalue: number[];
    fdr: number[];
    neg_log10_fdr: number[];
    replicate_test: ReplicateTest;
    // Present when replicate_test.status is 'ok'; null for genes too lowly expressed to test.
    replicate_pvalue?: (number | null)[];
    replicate_fdr?: (number | null)[];
};

export const isCellDeEnabled = (): boolean =>
    typeof CELL_DE_API_URL !== 'undefined' && CELL_DE_API_URL != null;

/**
 * Differential expression of the selected single cells vs reference cells of the same strain
 * (all other cells when `reference` is omitted).
 */
export const compareCells = async ({
    strain,
    cells,
    reference,
}: {
    strain: string;
    cells: number[];
    reference?: number[];
}): Promise<CellDeResponse> => {
    const endpoint = CELL_DE_API_URL;
    if (endpoint == null) {
        throw new Error('Single-cell differential expression endpoint is not configured.');
    }

    // Resolve the (possibly relative, proxied) endpoint to absolute; post() needs it.
    const url = new URL(endpoint, window.location.origin).toString();

    return deserializeResponse<CellDeResponse>(
        await post(url, { strain, cells, ...(reference != null && { reference }) }),
    );
};
