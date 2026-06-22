import _ from 'lodash';
import { DataStatus, DONE_DATA_STATUS, Storage } from '@genialis/resolwe/dist/api/types/rest';
import { combineEpics, Epic } from 'redux-observable';
import {
    catchError,
    endWith,
    filter,
    map,
    mergeMap,
    startWith,
    switchMap,
    withLatestFrom,
} from 'rxjs/operators';
import { Action } from '@reduxjs/toolkit';
import { combineLatest, EMPTY, from, merge, of } from 'rxjs';
import {
    fetchGenesSimilarities,
    fetchGenesSimilaritiesData,
    fetchGenesSimilaritiesDataSucceeded,
} from './epicsActions';
import getProcessDataEpicsFactory, {
    ProcessDataEpicsFactoryProps,
    ProcessesInfo,
} from './getProcessDataEpicsFactory';
import { mapStateSlice } from './rxjsCustomFilters';
import {
    getGenesSimilaritiesDistanceMeasure,
    getGenesSimilarities,
    getGenesSimilaritiesQueryGeneId,
    genesSimilaritiesFetchEnded,
    genesSimilaritiesFetchStarted,
    genesSimilaritiesFetchSucceeded,
    genesSimilaritiesQueryGeneSet,
    genesSimilaritiesStatusUpdated,
} from 'redux/stores/genesSimilarities';
import { FindSimilarGenesData } from 'redux/models/rest';
import { findSimilarGenesFast, isFastFindSimilarEnabled } from 'api';
import { getBasketExpressionsIds, getSelectedTimeSeries } from 'redux/stores/timeSeries';
import { getSelectedGenesIds } from 'redux/stores/genes';
import { RootState } from 'redux/rootReducer';
import { handleError } from 'utils/errorUtils';

const processParametersObservable: ProcessDataEpicsFactoryProps<FindSimilarGenesData>['processParametersObservable'] =
    (action$, state$) => {
        return merge(
            action$.pipe(
                filter(() => !isFastFindSimilarEnabled()),
                filter(fetchGenesSimilarities.match),
                withLatestFrom(state$),
                mergeMap(([, state]) => {
                    return of({
                        expressionsIds: getBasketExpressionsIds(state.timeSeries),
                        queryGeneId: getGenesSimilaritiesQueryGeneId(state.genesSimilarities),
                        distanceMeasure: getGenesSimilaritiesDistanceMeasure(
                            state.genesSimilarities,
                        ),
                    });
                }),
                filter(() => getGenesSimilarities(state$.value.genesSimilarities) == null),
                switchMap(
                    // Unused _fetchGenesSimilarities var is necessary to keep rxjs from piping before
                    // fetchGenesSimilarities action is emitted (after find similar genes modal is opened).

                    ({ expressionsIds, queryGeneId, distanceMeasure }) => {
                        // The {Pearson/Spearman} correlation between genes must be computed on at least
                        // two genes.
                        if (queryGeneId == null) {
                            return of({});
                        }

                        // If basket expressions aren't in store yet, hierarchical clustering can't be
                        // computed.
                        if (expressionsIds.length === 0) {
                            return of({});
                        }

                        return of({
                            expressions: _.sortBy(expressionsIds),
                            gene: queryGeneId,
                            distance: distanceMeasure,
                        });
                    },
                ),
            ),
            combineLatest([
                state$.pipe(
                    mapStateSlice((state) => {
                        return getBasketExpressionsIds(state.timeSeries);
                    }),
                ),
                state$.pipe(
                    mapStateSlice((state) => {
                        return getGenesSimilaritiesQueryGeneId(state.genesSimilarities);
                    }),
                ),
                state$.pipe(
                    mapStateSlice((state) => {
                        return getGenesSimilaritiesDistanceMeasure(state.genesSimilarities);
                    }),
                ),
            ]).pipe(
                filter(() => !isFastFindSimilarEnabled()),
                mergeMap(() => of({})),
            ),
        );
    };

const getFindSimilarGenesProcessDataEpics = getProcessDataEpicsFactory<FindSimilarGenesData>({
    processInfo: ProcessesInfo.FindSimilarGenes,
    processParametersObservable,
    fetchDataActionCreator: fetchGenesSimilaritiesData,
    processStartedActionCreator: genesSimilaritiesFetchStarted,
    processEndedActionCreator: genesSimilaritiesFetchEnded,
    fetchDataSucceededActionCreator: fetchGenesSimilaritiesDataSucceeded,
    getStorageIdFromData: (data) => {
        return data.output.similar_genes;
    },
    actionFromStorageResponse: (storage: Storage) =>
        genesSimilaritiesFetchSucceeded(storage.json['similar genes']),
    actionFromStatusUpdate: (status: DataStatus | null) => genesSimilaritiesStatusUpdated(status),
});

const handleSelectedGenesChangedEpic: Epic<Action, Action, RootState> = (action$, state$) => {
    return state$.pipe(
        mapStateSlice(
            (state) => getSelectedGenesIds(state.genes),
            (selectedGenesIds) => selectedGenesIds.length > 0,
        ),
        filter((selectedGenesIds) => {
            const queryGeneId = getGenesSimilaritiesQueryGeneId(state$.value.genesSimilarities);
            return queryGeneId == null || !selectedGenesIds.includes(queryGeneId);
        }),
        map((selectedGenesIds) => genesSimilaritiesQueryGeneSet(selectedGenesIds[0] ?? null)),
    );
};

const fastFindSimilarGenesEpic: Epic<Action, Action, RootState> = (action$, state$) => {
    return action$.pipe(
        filter(() => isFastFindSimilarEnabled()),
        filter(fetchGenesSimilarities.match),
        withLatestFrom(state$),
        filter(([, state]) => getGenesSimilarities(state.genesSimilarities) == null),
        switchMap(([, state]) => {
            const expressionsIds = getBasketExpressionsIds(state.timeSeries);
            const queryGeneId = getGenesSimilaritiesQueryGeneId(state.genesSimilarities);
            const selectedTimeSeries = getSelectedTimeSeries(state.timeSeries);

            if (queryGeneId == null || selectedTimeSeries == null || expressionsIds.length === 0) {
                return EMPTY;
            }

            return from(
                findSimilarGenesFast({
                    timeSeriesId: selectedTimeSeries.id,
                    expressionsIds: _.sortBy(expressionsIds),
                    geneId: queryGeneId,
                    distance: getGenesSimilaritiesDistanceMeasure(state.genesSimilarities),
                }),
            ).pipe(
                mergeMap((response) =>
                    of(
                        genesSimilaritiesStatusUpdated(DONE_DATA_STATUS),
                        genesSimilaritiesFetchSucceeded(
                            response['similar genes'] ?? response.similar_genes ?? [],
                        ),
                    ),
                ),
                catchError((error) =>
                    of(
                        genesSimilaritiesStatusUpdated(null),
                        handleError('Error retrieving similar genes.', error),
                    ),
                ),
                startWith(genesSimilaritiesFetchStarted(), genesSimilaritiesStatusUpdated(null)),
                endWith(genesSimilaritiesFetchEnded()),
            );
        }),
    );
};

export default combineEpics(
    getFindSimilarGenesProcessDataEpics,
    fastFindSimilarGenesEpic,
    handleSelectedGenesChangedEpic,
);
