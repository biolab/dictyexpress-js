import _ from 'lodash';
import { Action } from '@reduxjs/toolkit';
import { Epic, combineEpics } from 'redux-observable';
import {
    map,
    mergeMap,
    startWith,
    endWith,
    catchError,
    filter,
    distinctUntilChanged,
} from 'rxjs/operators';
import { of, from, forkJoin, EMPTY } from 'rxjs';
import { Data, Storage } from '@genialis/resolwe/dist/api/types/rest';
import { mapStateSlice } from './rxjsCustomFilters';
import {
    getAllTimeSeriesSamplesIds,
    getComparisonTimeSeries,
    getSelectedTimeSeries,
} from 'redux/stores/timeSeries';
import { getSelectedGenesIds } from 'redux/stores/genes';
import { RootState } from 'redux/rootReducer';
import { handleError } from 'utils/errorUtils';
import { SamplesGenesExpressionsById } from 'redux/models/internal';
import {
    getDataBySamplesIds,
    getSamplesGenesExpressionsFast,
    getStorage,
    isFastFindSimilarEnabled,
} from 'api';
import {
    getSamplesExpressionsSamplesIds,
    samplesExpressionsFetchEnded,
    samplesExpressionsFetchStarted,
    samplesExpressionsFetchSucceeded,
} from 'redux/stores/samplesExpressions';

const getSampleStorage = async (
    sampleData: Data,
): Promise<{ sampleId: number; storage: Storage }> => {
    const storage = await getStorage(sampleData.output.exp_json);

    return {
        sampleId: sampleData.entity != null ? sampleData.entity.id : 0,
        storage,
    };
};

const fetchSamplesExpressionsEpic: Epic<Action, Action, RootState> = (_action$, state$) => {
    return state$.pipe(
        filter(() => !isFastFindSimilarEnabled()),
        mapStateSlice(
            (state) => getAllTimeSeriesSamplesIds(state.timeSeries),
            (timeSeriesSamplesIds) => timeSeriesSamplesIds.length > 0,
        ),
        mergeMap((timeSeriesSamplesIds) => {
            const samplesExpressionsInStore = getSamplesExpressionsSamplesIds(
                state$.value.samplesExpressions,
            );

            const timeSeriesSamplesIdsToFetch = timeSeriesSamplesIds.filter(
                (sampleId) => !samplesExpressionsInStore.includes(sampleId),
            );

            if (timeSeriesSamplesIdsToFetch.length === 0) {
                return EMPTY;
            }

            return from(getDataBySamplesIds(timeSeriesSamplesIdsToFetch)).pipe(
                mergeMap((sampleData) => {
                    // Once samples data is retrieved use it's output.exp_json to retrieve genes expressions.
                    return forkJoin(sampleData.map(getSampleStorage)).pipe(
                        map((sampleStorages) => {
                            const timeSeriesSamplesExpressions = {} as SamplesGenesExpressionsById;
                            sampleStorages.forEach(({ sampleId, storage }) => {
                                timeSeriesSamplesExpressions[sampleId] = storage.json.genes;
                            });

                            return samplesExpressionsFetchSucceeded(timeSeriesSamplesExpressions);
                        }),
                        catchError((error) =>
                            of(handleError(`Error retrieving samples storage data.`, error)),
                        ),
                    );
                }),
                catchError((error) =>
                    of(handleError(`Error retrieving samples storage data.`, error)),
                ),
                startWith(samplesExpressionsFetchStarted()),
                endWith(samplesExpressionsFetchEnded()),
            );
        }),
    );
};

const fetchSamplesGenesExpressionsFastEpic: Epic<Action, Action, RootState> = (
    _action$,
    state$,
) => {
    const requested = new Set<string>();
    let selectedTimeSeriesId: number | undefined;

    return state$.pipe(
        filter(() => isFastFindSimilarEnabled()),
        map((state) => {
            const selected = getSelectedTimeSeries(state.timeSeries);
            if (selected?.id !== selectedTimeSeriesId) {
                selectedTimeSeriesId = selected?.id;
                requested.clear();
            }
            const genesIds = getSelectedGenesIds(state.genes);
            const timeSeries = [
                ...(selected != null ? [{ id: selected.id, genesIds }] : []),
                ...getComparisonTimeSeries(state.timeSeries).map((comparison) => ({
                    id: comparison.id,
                    genesIds: _.uniq([
                        ...genesIds,
                        ...(comparison.genesMappings ?? [])
                            .filter((mapping) => genesIds.includes(mapping.source_id))
                            .map((mapping) => mapping.target_id),
                    ]),
                })),
            ];
            return timeSeries
                .map(({ id, genesIds: ids }) => ({
                    id,
                    genesIds: ids.filter((geneId) => !requested.has(`${id}:${geneId}`)),
                }))
                .filter(({ genesIds: ids }) => ids.length > 0);
        }),
        filter((toFetch) => toFetch.length > 0),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        mergeMap((toFetch) => {
            toFetch.forEach(({ id, genesIds }) =>
                genesIds.forEach((geneId) => requested.add(`${id}:${geneId}`)),
            );
            return forkJoin(
                toFetch.flatMap(({ id, genesIds }) =>
                    _.chunk(genesIds, 500).map((chunk) =>
                        getSamplesGenesExpressionsFast(id, chunk),
                    ),
                ),
            ).pipe(
                map((results) => samplesExpressionsFetchSucceeded(_.merge({}, ...results))),
                catchError((error) => {
                    toFetch.forEach(({ id, genesIds }) =>
                        genesIds.forEach((geneId) => requested.delete(`${id}:${geneId}`)),
                    );
                    return of(handleError('Error retrieving genes expressions.', error));
                }),
                startWith(samplesExpressionsFetchStarted()),
                endWith(samplesExpressionsFetchEnded()),
            );
        }),
    );
};

export default combineEpics(fetchSamplesExpressionsEpic, fetchSamplesGenesExpressionsFastEpic);
