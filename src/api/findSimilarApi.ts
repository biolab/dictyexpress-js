import { post } from './fetch';
import { FastFindSimilarGenesResponse } from 'redux/models/rest';
import { deserializeResponse } from 'utils/apiUtils';

export const isFastFindSimilarEnabled = (): boolean =>
    typeof FIND_SIMILAR_API_URL !== 'undefined' && FIND_SIMILAR_API_URL != null;

export const findSimilarGenesFast = async ({
    timeSeriesId,
    expressionsIds,
    geneId,
    distance,
}: {
    timeSeriesId: number;
    expressionsIds: number[];
    geneId: string;
    distance: string;
}): Promise<FastFindSimilarGenesResponse> => {
    const endpoint = FIND_SIMILAR_API_URL;
    if (endpoint == null) {
        throw new Error('Fast find-similar endpoint is not configured.');
    }

    // post() builds a `new URL(url)`, which requires an absolute URL. The
    // configured endpoint may be relative (e.g. '/find-similar' so Vite can
    // proxy it), so resolve it against the current origin first.
    const url = new URL(endpoint, window.location.origin).toString();

    return deserializeResponse<FastFindSimilarGenesResponse>(
        await post(url, {
            time_series: timeSeriesId,
            expressions: expressionsIds,
            gene: geneId,
            distance,
        }),
    );
};
