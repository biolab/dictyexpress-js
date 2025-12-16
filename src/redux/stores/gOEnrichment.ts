import {
    Data,
    DataGafAnnotation,
    DataGOEnrichmentAnalysis,
    DataStatus,
    GOEnrichmentJson,
} from '@genialis/resolwe/dist/api/types/rest';
import { combineReducers, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { clearStateOnActions } from './common';
import createIsFetchingSlice from './fetch';
import {
    allGenesDeselected,
    geneDeselected,
    genesSelected,
    geneHighlighted,
    genesHighlighted,
    geneUnhighlighted,
} from './genes';
import { timeSeriesSelected } from './timeSeries';
import { EnhancedGOEnrichmentJson } from 'redux/models/internal';
import { gOEnrichmentDataFetchSucceeded } from 'redux/epics/epicsActions';

// State slices.
export const pValueThresholdsOptions = [0.1, 0.05, 0.01, 0.001, 0.0001];
const pValueThresholdInitialState = pValueThresholdsOptions[0];
const pValueThresholdSlice = createSlice({
    name: 'gOEnrichment',
    initialState: pValueThresholdInitialState,
    reducers: {
        pValueThresholdChanged: (_state, action: PayloadAction<number>): number => {
            return action.payload;
        },
    },
});

const gOEnrichmentJsonInitialState = null as EnhancedGOEnrichmentJson | null;
const gOEnrichmentJsonSlice = createSlice({
    name: 'gOEnrichment',
    initialState: gOEnrichmentJsonInitialState,
    reducers: {
        fetchSucceeded: (
            _state,
            action: PayloadAction<EnhancedGOEnrichmentJson>,
        ): EnhancedGOEnrichmentJson => {
            return action.payload;
        },
    },
    extraReducers: (builder) => {
        clearStateOnActions(
            builder,
            [
                timeSeriesSelected,
                allGenesDeselected,
                geneDeselected,
                genesSelected,
                geneHighlighted,
                genesHighlighted,
                geneUnhighlighted,
                pValueThresholdSlice.actions.pValueThresholdChanged,
            ],
            gOEnrichmentJsonInitialState,
        );
    },
});

const speciesInitialState = '';
const speciesSlice = createSlice({
    name: 'gOEnrichment',
    initialState: speciesInitialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(
            gOEnrichmentDataFetchSucceeded,
            (_state, action: PayloadAction<DataGOEnrichmentAnalysis>): string => {
                return action.payload.output.species;
            },
        );
        clearStateOnActions(builder, [timeSeriesSelected, allGenesDeselected], speciesInitialState);
    },
});

const sourceInitialState = '';
const sourceSlice = createSlice({
    name: 'gOEnrichment',
    initialState: sourceInitialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(
            gOEnrichmentDataFetchSucceeded,
            (_state, action: PayloadAction<DataGOEnrichmentAnalysis>): string => {
                return action.payload.output.source;
            },
        );
        clearStateOnActions(builder, [timeSeriesSelected, allGenesDeselected], sourceInitialState);
    },
});

const gafInitialState = null as DataGafAnnotation | null;
const gafSlice = createSlice({
    name: 'gOEnrichment',
    initialState: gafInitialState,
    reducers: {
        gafFetchSucceeded: (
            _state,
            action: PayloadAction<DataGafAnnotation>,
        ): DataGafAnnotation => {
            return action.payload;
        },
    },
    extraReducers: (builder) => {
        clearStateOnActions(builder, [timeSeriesSelected, allGenesDeselected], gafInitialState);
    },
});

const ontologyOboInitialSlice = null as Data | null;
const ontologyOboSlice = createSlice({
    name: 'gOEnrichment',
    initialState: ontologyOboInitialSlice,
    reducers: {
        ontologyOboFetchSucceeded: (_state, action: PayloadAction<Data>): Data => {
            return action.payload;
        },
    },
});

const gOEnrichmentStatusInitialState = null as DataStatus | null;
const gOEnrichmentStatusSlice = createSlice({
    name: 'gOEnrichment',
    initialState: gOEnrichmentStatusInitialState,
    reducers: {
        statusUpdated: (_state, action: PayloadAction<DataStatus | null>) => {
            return action.payload;
        },
    },
});

const isFetchingGOEnrichmentJsonSlice = createIsFetchingSlice('gOEnrichment');

const gOEnrichmentReducer = combineReducers({
    status: gOEnrichmentStatusSlice.reducer,
    json: gOEnrichmentJsonSlice.reducer,
    gaf: gafSlice.reducer,
    isFetchingJson: isFetchingGOEnrichmentJsonSlice.reducer,
    pValueThreshold: pValueThresholdSlice.reducer,
    species: speciesSlice.reducer,
    source: sourceSlice.reducer,
    ontologyObo: ontologyOboSlice.reducer,
});

// Export actions.
export const { started: gOEnrichmentJsonFetchStarted, ended: gOEnrichmentJsonFetchEnded } =
    isFetchingGOEnrichmentJsonSlice.actions;

export const { pValueThresholdChanged } = pValueThresholdSlice.actions;

export const { gafFetchSucceeded } = gafSlice.actions;

export const { ontologyOboFetchSucceeded } = ontologyOboSlice.actions;

export const { fetchSucceeded: gOEnrichmentJsonFetchSucceeded } = gOEnrichmentJsonSlice.actions;

export const { statusUpdated: gOEnrichmentStatusUpdated } = gOEnrichmentStatusSlice.actions;

export type GOEnrichmentState = ReturnType<typeof gOEnrichmentReducer>;

export default gOEnrichmentReducer;

// Selectors (exposes the store to containers).
export const getIsFetchingGOEnrichmentJson = (state: GOEnrichmentState): boolean =>
    state.isFetchingJson;
export const getGOEnrichmentJson = (state: GOEnrichmentState): GOEnrichmentJson | null =>
    state.json;
export const getPValueThreshold = (state: GOEnrichmentState): number => state.pValueThreshold;
export const getGaf = (state: GOEnrichmentState): DataGafAnnotation | null => state.gaf;
export const getGOEnrichmentSpecies = (state: GOEnrichmentState): string => state.species;
export const getGOEnrichmentSource = (state: GOEnrichmentState): string => state.source;
export const getOntologyObo = (state: GOEnrichmentState): Data | null => state.ontologyObo;
export const getGOEnrichmentStatus = (state: GOEnrichmentState) => state.status;
