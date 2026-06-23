import { DONE_DATA_STATUS } from '@genialis/resolwe/dist/api/types/rest';
import _ from 'lodash';
import { geneDeselected, genesSelected } from './genes';
import gOEnrichmentReducer, {
    gafFetchSucceeded,
    gOEnrichmentJsonCleared,
    gOEnrichmentJsonFetchSucceeded,
    GOEnrichmentState,
    ontologyOboFetchSucceeded,
    pValueThresholdChanged,
    pValueThresholdsOptions,
} from './gOEnrichment';
import { timeSeriesSelected } from './timeSeries';
import { gOEnrichmentDataFetchSucceeded } from 'redux/epics/epicsActions';
import {
    generateGenesById,
    generateGeneOntologyStorageJson,
    generateData,
    generateGaf,
} from 'tests/mock';
import { appendMissingAttributesToJson } from 'utils/gOEnrichmentUtils';

const genesById = generateGenesById(2);
const genes = _.flatMap(genesById);
const { humanGaf } = generateGaf(1);
const gOEnrichmentJson = generateGeneOntologyStorageJson(genes.map((gene) => gene.feature_id));
appendMissingAttributesToJson(gOEnrichmentJson, genes[0].source, genes[0].species);
const gOEnrichmentAnalysisData = {
    ...generateData(1),
    status: DONE_DATA_STATUS,
    output: {
        terms: 1,
        species: genes[0].species,
        source: genes[0].source,
    },
};
const ontologyObo = generateData(2);

describe('gOEnrichmentStore store', () => {
    let initialState: GOEnrichmentState;

    describe('empty initial state', () => {
        beforeEach(() => {
            initialState = {
                status: null,
                json: null,
                gaf: null,
                source: '',
                species: '',
                pValueThreshold: pValueThresholdsOptions[0],
                isFetchingJson: false,
                ontologyObo: null,
            };
        });

        it('should add fetched json to state with gOEnrichmentJsonFetchSucceeded action', () => {
            const newState = gOEnrichmentReducer(
                initialState,
                gOEnrichmentJsonFetchSucceeded(gOEnrichmentJson),
            );
            const expectedState = {
                ...initialState,
                json: gOEnrichmentJson,
            };

            expect(newState).toEqual(expectedState);
        });

        it('should change pValueThreshold with pValueThresholdChanged action', () => {
            const newState = gOEnrichmentReducer(
                initialState,
                pValueThresholdChanged(pValueThresholdsOptions[1]),
            );
            const expectedState = {
                ...initialState,
                pValueThreshold: pValueThresholdsOptions[1],
            };

            expect(newState).toEqual(expectedState);
        });

        it('should set source and species with gOEnrichmentDataFetchSucceeded action', () => {
            const newState = gOEnrichmentReducer(
                initialState,
                gOEnrichmentDataFetchSucceeded(gOEnrichmentAnalysisData),
            );
            const expectedState = {
                ...initialState,
                source: gOEnrichmentAnalysisData.output.source,
                species: gOEnrichmentAnalysisData.output.species,
            };

            expect(newState).toEqual(expectedState);
        });

        it('should add gaf to state with gafFetchSucceeded action', () => {
            const newState = gOEnrichmentReducer(initialState, gafFetchSucceeded(humanGaf));
            const expectedState = {
                ...initialState,
                gaf: humanGaf,
            };

            expect(newState).toEqual(expectedState);
        });

        it('should add ontologyObo to state with ontologyOboFetchSucceeded action', () => {
            const newState = gOEnrichmentReducer(
                initialState,
                ontologyOboFetchSucceeded(ontologyObo),
            );
            const expectedState = {
                ...initialState,
                ontologyObo,
            };

            expect(newState).toEqual(expectedState);
        });
    });

    describe('not empty initial state', () => {
        beforeEach(() => {
            initialState = {
                status: null,
                json: gOEnrichmentJson,
                gaf: humanGaf,
                source: 'DICTYBASE',
                species: 'Dictyostelium purpureum',
                pValueThreshold: pValueThresholdsOptions[0],
                isFetchingJson: false,
                ontologyObo,
            };
        });

        it('should clear all fetched data on timeSeriesSelected action', () => {
            const newState = gOEnrichmentReducer(initialState, timeSeriesSelected(1));
            const expectedState = {
                ...initialState,
                json: null,
                gaf: null,
                source: '',
                species: '',
            };

            expect(newState).toEqual(expectedState);
        });

        it('should clear all fetched data on allGenesDeselected action', () => {
            const newState = gOEnrichmentReducer(initialState, timeSeriesSelected(1));
            const expectedState = {
                ...initialState,
                json: null,
                gaf: null,
                source: '',
                species: '',
            };

            expect(newState).toEqual(expectedState);
        });

        it('should keep json data on geneDeselected action', () => {
            const newState = gOEnrichmentReducer(initialState, geneDeselected('1'));

            expect(newState).toEqual(initialState);
        });

        it('should keep json data on genesSelected action', () => {
            const newState = gOEnrichmentReducer(initialState, genesSelected(['1']));

            expect(newState).toEqual(initialState);
        });

        it('should clear json data on cleared action', () => {
            const newState = gOEnrichmentReducer(initialState, gOEnrichmentJsonCleared());
            const expectedState = {
                ...initialState,
                json: null,
            };

            expect(newState).toEqual(expectedState);
        });
    });
});
