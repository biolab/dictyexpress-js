import { GOEnrichmentJson } from '@genialis/resolwe/dist/api/types/rest';
import { post } from './fetch';
import { deserializeResponse } from 'utils/apiUtils';

export const isFastGOEnrichmentEnabled = (): boolean =>
    typeof GO_ENRICHMENT_API_URL !== 'undefined' && GO_ENRICHMENT_API_URL != null;

export const goEnrichmentFast = async ({
    genes,
    pvalThreshold,
    source,
    species,
    ontology,
    gaf,
}: {
    genes: string[];
    pvalThreshold: number;
    source: string;
    species: string;
    ontology: number;
    gaf: number;
}): Promise<GOEnrichmentJson> => {
    const endpoint = GO_ENRICHMENT_API_URL;
    if (endpoint == null) {
        throw new Error('Fast GO enrichment endpoint is not configured.');
    }

    // post() builds `new URL(url)`, which requires an absolute URL. The endpoint
    // may be relative (e.g. '/go' so CloudFront proxies it), so resolve it
    // against the current origin first.
    const url = new URL(endpoint, window.location.origin).toString();

    return deserializeResponse<GOEnrichmentJson>(
        await post(url, {
            genes,
            pval_threshold: pvalThreshold,
            source,
            species,
            ontology,
            gaf,
        }),
    );
};
