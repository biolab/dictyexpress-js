import {
    Action,
    ActionCreatorWithoutPayload,
    ActionCreatorWithPayload,
    PayloadAction,
} from '@reduxjs/toolkit';
import { Epic, combineEpics, StateObservable } from 'redux-observable';
import {
    map,
    mergeMap,
    startWith,
    endWith,
    catchError,
    withLatestFrom,
    filter,
    switchMap,
    first,
    bufferCount,
    toArray,
} from 'rxjs/operators';
import { of, from, EMPTY, Observable, merge } from 'rxjs';
import { filterNullAndUndefined, mapStateSlice } from './rxjsCustomFilters';
import {
    fetchAssociationsGenes,
    fetchAndSelectPredefinedGenes,
    fetchDifferentialExpressionGenes,
    TFetchGenesActionPayload,
} from './epicsActions';
import { getBasketInfo } from 'redux/stores/timeSeries';
import { getGenesSimilaritiesQueryGene, RootState } from 'redux/rootReducer';
import {
    associationsGenesFetchEnded,
    associationsGenesFetchStarted,
    bookmarkedGenesFetchEnded,
    bookmarkedGenesFetchStarted,
    differentialExpressionGenesFetchEnded,
    differentialExpressionGenesFetchStarted,
    genesFetchSucceeded,
    genesSelected,
    getGenesIdsInStore,
    similarGenesFetchEnded,
    similarGenesFetchStarted,
} from 'redux/stores/genes';
import { handleError } from 'utils/errorUtils';
import { Gene } from 'redux/models/internal';
import { listByIds } from 'api';
import { getGenesSimilarities } from 'redux/stores/genesSimilarities';

const listByIdsLimit = 5000;
const fetchGenesActionObservable = (
    geneIds: string[],
    state$: StateObservable<RootState>,
    source?: string,
    species?: string,
): Observable<PayloadAction<Gene[]>> => {
    const geneIdsInStore = getGenesIdsInStore(state$.value.genes);
    // Fetch only genes that aren't in redux store yet.
    const geneIdsToFetch = geneIds.filter((geneId) => !geneIdsInStore.includes(geneId));

    if (geneIdsToFetch.length === 0) {
        return EMPTY;
    }

    return state$.pipe(
        mapStateSlice((state) => getBasketInfo(state.timeSeries)),
        filterNullAndUndefined(),
        first(),
        switchMap((basketInfo) => {
            return from(geneIdsToFetch).pipe(
                bufferCount(listByIdsLimit),
                // Fetch chunks in parallel, then commit in ONE genesFetchSucceeded:
                // dispatching per-chunk re-rendered the genes list once per chunk.
                mergeMap(
                    (bufferedGeneIds) =>
                        from(
                            listByIds(
                                source ?? basketInfo.source,
                                bufferedGeneIds,
                                species ?? basketInfo.species,
                            ),
                        ),
                    4,
                ),
                toArray(),
                map((responses) => genesFetchSucceeded(responses.flat())),
            );
        }),
    );
};

const fetchGenesEpicsFactory = (
    fetchGenesAction: ActionCreatorWithPayload<TFetchGenesActionPayload, string>,
    startWithActionCreator: ActionCreatorWithoutPayload,
    endWithActionCreator: ActionCreatorWithoutPayload,
    errorMessage = 'Error retrieving genes.',
): Epic<Action, Action, RootState> => {
    return (action$, state$): Observable<Action> => {
        return action$.pipe(
            filter(fetchGenesAction.match),
            mergeMap((action) => {
                return fetchGenesActionObservable(
                    action.payload.geneIds,
                    state$,
                    action.payload.source,
                    action.payload.species,
                ).pipe(
                    catchError((error) => of(handleError(errorMessage, error))),
                    startWith(startWithActionCreator()),
                    endWith(endWithActionCreator()),
                );
            }),
        );
    };
};

const fetchSelectedDifferentialExpressionGenesEpic = fetchGenesEpicsFactory(
    fetchDifferentialExpressionGenes,
    differentialExpressionGenesFetchStarted,
    differentialExpressionGenesFetchEnded,
    'Error retrieving genes in differential expression.',
);

const fetchAssociationsGenesEpic = fetchGenesEpicsFactory(
    fetchAssociationsGenes,
    associationsGenesFetchStarted,
    associationsGenesFetchEnded,
    'Error retrieving associated genes.',
);

const fetchPredefinedGenesEpic: Epic<Action, Action, RootState> = (action$, state$) =>
    action$.pipe(
        filter(fetchAndSelectPredefinedGenes.match),
        switchMap((action) => {
            return merge(
                fetchGenesActionObservable(action.payload.geneIds, state$),
                of(genesSelected(action.payload.geneIds)),
            ).pipe(
                catchError((error) => of(handleError('Error retrieving predefined genes.', error))),
                startWith(bookmarkedGenesFetchStarted()),
                endWith(bookmarkedGenesFetchEnded()),
            );
        }),
    );

const fetchSimilarGenesEpic: Epic<Action, Action, RootState> = (action$, state$) => {
    return state$.pipe(
        mapStateSlice((state) => getGenesSimilarities(state.genesSimilarities)),
        filterNullAndUndefined(),
        filter((genesSimilarities) => genesSimilarities.length > 0),
        withLatestFrom(state$),
        mergeMap(([genesSimilarities, state]) => {
            const queryGene = getGenesSimilaritiesQueryGene(state);
            return fetchGenesActionObservable(
                genesSimilarities.map((geneSimilarity) => geneSimilarity.gene),
                state$,
                queryGene?.source,
                queryGene?.species,
            ).pipe(
                catchError((error) => of(handleError('Error retrieving similar genes.', error))),
                startWith(similarGenesFetchStarted()),
                endWith(similarGenesFetchEnded()),
            );
        }),
    );
};

export default combineEpics(
    fetchSelectedDifferentialExpressionGenesEpic,
    fetchAssociationsGenesEpic,
    fetchSimilarGenesEpic,
    fetchPredefinedGenesEpic,
);
