import { combineLatest, EMPTY, merge, of } from 'rxjs';
import { debounceTime, filter, switchMap } from 'rxjs/operators';
import { DataGOEnrichmentAnalysis, Storage } from '@genialis/resolwe/dist/api/types/rest';
import { combineEpics, Epic } from 'redux-observable';
import { Action } from '@reduxjs/toolkit';
import { fetchGOEnrichmentData, gOEnrichmentDataFetchSucceeded } from './epicsActions';
import getProcessDataEpicsFactory, {
    ProcessDataEpicsFactoryProps,
    ProcessesInfo,
} from './getProcessDataEpicsFactory';
import { filterNullAndUndefined, mapStateSlice } from './rxjsCustomFilters';
import { appendMissingAttributesToJson } from 'utils/gOEnrichmentUtils';
import {
    getGaf,
    getGOEnrichmentJson,
    getGOEnrichmentSource,
    getGOEnrichmentSpecies,
    getOntologyObo,
    getPValueThreshold,
    gOEnrichmentJsonFetchEnded,
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
                state$.pipe(
                    mapStateSlice((state) => {
                        const highlighted = getHighlightedGenesSortedById(state.genes);
                        return highlighted.length > 0
                            ? highlighted
                            : getSelectedGenesSortedById(state.genes);
                    }),
                    switchMap(() => {
                        return of(null);
                    }),
                ),
                state$
                    .pipe(
                        mapStateSlice((state) => {
                            const highlighted = getHighlightedGenesSortedById(state.genes);
                            return highlighted.length > 0
                                ? highlighted
                                : getSelectedGenesSortedById(state.genes);
                        }),
                    )
                    .pipe(debounceTime(gOEnrichmentProcessDebounceTime)),
            ),
            state$.pipe(
                mapStateSlice((state) => {
                    return getOntologyObo(state.gOEnrichment);
                }),
                filterNullAndUndefined(),
            ),
        ]).pipe(
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

export default combineEpics(setAwaitingGoEnrichmentData, getGOEnrichmentProcessDataEpics);
