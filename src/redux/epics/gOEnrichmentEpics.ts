import { combineLatest, EMPTY, from, merge, Observable, of } from 'rxjs';
import {
    catchError,
    debounceTime,
    endWith,
    filter,
    map,
    startWith,
    switchMap,
} from 'rxjs/operators';
import { DataGOEnrichmentAnalysis, Storage } from '@genialis/resolwe/dist/api/types/rest';
import { combineEpics, Epic } from 'redux-observable';
import { Action } from '@reduxjs/toolkit';
import { fetchGOEnrichmentData, gOEnrichmentDataFetchSucceeded } from './epicsActions';
import getProcessDataEpicsFactory, {
    ProcessDataEpicsFactoryProps,
    ProcessesInfo,
} from './getProcessDataEpicsFactory';
import { filterNullAndUndefined, mapStateSlice } from './rxjsCustomFilters';
import { handleError } from 'utils/errorUtils';
import { goEnrichmentFast, isFastGOEnrichmentEnabled } from 'api';
import { appendMissingAttributesToJson } from 'utils/gOEnrichmentUtils';
import { EnhancedGOEnrichmentJson } from 'redux/models/internal';
import {
    getGaf,
    getGOEnrichmentJson,
    getGOEnrichmentSource,
    getGOEnrichmentSpecies,
    getOntologyObo,
    getPValueThreshold,
    gOEnrichmentJsonFetchEnded,
    gOEnrichmentJsonCleared,
    gOEnrichmentJsonFetchStarted,
    gOEnrichmentJsonFetchSucceeded,
    gOEnrichmentStatusUpdated,
} from 'redux/stores/gOEnrichment';
import {
    getSelectedGenes,
    getSelectedGenesSortedById,
    getHighlightedGenesSortedById,
} from 'redux/stores/genes';
import { RootState } from 'redux/rootReducer';

export const gOEnrichmentProcessDebounceTime = 3000;
// The fast (Lambda) path computes in ~0.3s, so it just coalesces rapid gene
// changes rather than needing the process path's long debounce.
export const gOEnrichmentFastDebounceTime = 400;

const getGenesForEnrichment$ = (state$: Observable<RootState>) =>
    state$.pipe(
        mapStateSlice((state) => {
            const highlighted = getHighlightedGenesSortedById(state.genes);
            return highlighted.length > 0 ? highlighted : getSelectedGenesSortedById(state.genes);
        }),
    );

const clearGOEnrichmentOnGenesForEnrichmentChanged: Epic<Action, Action, RootState> = (
    _action$,
    state$,
) => {
    return getGenesForEnrichment$(state$).pipe(
        filter(() => getGOEnrichmentJson(state$.value.gOEnrichment) != null),
        map(() => gOEnrichmentJsonCleared()),
    );
};

const setAwaitingGoEnrichmentData: Epic<Action, Action, RootState> = (_action$, state$) => {
    return state$.pipe(
        mapStateSlice((state) => getSelectedGenes(state.genes)),
        filter((selectedGenes) => selectedGenes.length > 0),
        filter(() => getGOEnrichmentJson(state$.value.gOEnrichment) == null),
        switchMap(() => {
            return of(gOEnrichmentJsonFetchStarted());
        }),
    );
};

const processParametersObservable: ProcessDataEpicsFactoryProps<DataGOEnrichmentAnalysis>['processParametersObservable'] =
    (_action$, state$) => {
        return combineLatest([
            state$.pipe(
                mapStateSlice((state) => {
                    return getGaf(state.gOEnrichment);
                }),
            ),
            state$.pipe(
                mapStateSlice((state) => {
                    return getPValueThreshold(state.gOEnrichment);
                }),
            ),
            // Each time selected/highlighted genes change, emit null and then debounced genes. Without emitting null,
            // getProcessDataEpicsFactory will treat the empty array as no selected genes.
            // When genes are highlighted, use highlighted genes for GO enrichment, otherwise use selected genes.
            merge(
                getGenesForEnrichment$(state$).pipe(
                    switchMap(() => {
                        return of(null);
                    }),
                ),
                getGenesForEnrichment$(state$).pipe(
                    debounceTime(gOEnrichmentProcessDebounceTime),
                ),
            ),
            state$.pipe(
                mapStateSlice((state) => {
                    return getOntologyObo(state.gOEnrichment);
                }),
                filterNullAndUndefined(),
            ),
        ]).pipe(
            filter(() => !isFastGOEnrichmentEnabled()),
            filter(() => getGOEnrichmentJson(state$.value.gOEnrichment) == null),
            switchMap(([gaf, pValueThreshold, selectedGenes, ontologyObo]) => {
                // This condition is necessary because RxJS filter function doesn't have null type guard in it's type definition.
                if (selectedGenes == null) {
                    return EMPTY;
                }
                if (gaf == null || selectedGenes.length === 0) {
                    return of({});
                }

                return of({
                    genes: selectedGenes.map((gene) => gene.feature_id),
                    pval_threshold: pValueThreshold,
                    source: selectedGenes[0].source,
                    species: selectedGenes[0].species,
                    ontology: ontologyObo.id,
                    gaf: gaf.id,
                });
            }),
        );
    };

const getGOEnrichmentProcessDataEpics = getProcessDataEpicsFactory<DataGOEnrichmentAnalysis>({
    processInfo: ProcessesInfo.GOEnrichment,
    processParametersObservable,
    fetchDataActionCreator: fetchGOEnrichmentData,
    processStartedActionCreator: gOEnrichmentJsonFetchStarted,
    processEndedActionCreator: gOEnrichmentJsonFetchEnded,
    fetchDataSucceededActionCreator: gOEnrichmentDataFetchSucceeded,
    getStorageIdFromData: (data: DataGOEnrichmentAnalysis) => {
        return data.output.terms;
    },
    actionFromStorageResponse: (storage: Storage, state: RootState) => {
        // Save gene ontology enrichment json to redux store. Data will be extracted and displayed in
        // gOEnrichment visualization component (table).
        const source = getGOEnrichmentSource(state.gOEnrichment);
        const species = getGOEnrichmentSpecies(state.gOEnrichment);
        appendMissingAttributesToJson(storage.json, source, species);
        return gOEnrichmentJsonFetchSucceeded(storage.json);
    },
    actionFromStatusUpdate: (status) => gOEnrichmentStatusUpdated(status),
});

/*
 * Fast path: when GO_ENRICHMENT_API_URL is set, call the gotea Lambda directly
 * instead of the Resolwe goenrichment process. Mirrors the process trigger
 * (debounced genes + p-value, gated on the GAF being loaded).
 */
const fastGOEnrichmentEpic: Epic<Action, Action, RootState> = (_action$, state$) => {
    const genes$ = getGenesForEnrichment$(state$);
    return combineLatest([
        state$.pipe(
            mapStateSlice((state) => getGaf(state.gOEnrichment)),
            filterNullAndUndefined(),
        ),
        state$.pipe(mapStateSlice((state) => getPValueThreshold(state.gOEnrichment))),
        // Emit null on every gene change, then the debounced value (mirrors the
        // process path) so a change cancels an in-flight compute and restarts it.
        merge(
            genes$.pipe(switchMap(() => of(null))),
            genes$.pipe(debounceTime(gOEnrichmentFastDebounceTime)),
        ),
        // The OBO id lets the Lambda lazy-build artifacts for any species on a miss.
        state$.pipe(
            mapStateSlice((state) => getOntologyObo(state.gOEnrichment)),
            filterNullAndUndefined(),
        ),
    ]).pipe(
        filter(() => isFastGOEnrichmentEnabled()),
        filter(() => getGOEnrichmentJson(state$.value.gOEnrichment) == null),
        switchMap(([gaf, pValueThreshold, selectedGenes, ontologyObo]) => {
            if (selectedGenes == null || Object.keys(gaf).length === 0) {
                return EMPTY;
            }
            if (selectedGenes.length === 0) {
                return EMPTY;
            }
            return from(
                goEnrichmentFast({
                    genes: selectedGenes.map((gene) => gene.feature_id),
                    pvalThreshold: pValueThreshold,
                    source: selectedGenes[0].source,
                    species: selectedGenes[0].species,
                    ontology: ontologyObo.id,
                    gaf: gaf.id,
                }),
            ).pipe(
                map((json) => {
                    // Enhance in place like the process path's actionFromStorageResponse.
                    // Result gene ids are in the GAF namespace, so use the GAF
                    // source/species for later list_by_ids lookups during export.
                    const enhanced = json as unknown as EnhancedGOEnrichmentJson;
                    appendMissingAttributesToJson(enhanced, gaf.output.source, gaf.output.species);
                    return gOEnrichmentJsonFetchSucceeded(enhanced);
                }),
                catchError((error) => of(handleError('Error retrieving GO enrichment.', error))),
                startWith(gOEnrichmentJsonFetchStarted()),
                endWith(gOEnrichmentJsonFetchEnded()),
            );
        }),
    );
};

export default combineEpics(
    setAwaitingGoEnrichmentData,
    clearGOEnrichmentOnGenesForEnrichmentChanged,
    getGOEnrichmentProcessDataEpics,
    fastGOEnrichmentEpic,
);
