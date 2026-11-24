import _ from 'lodash';
import { createSlice, PayloadAction, createSelector, combineReducers } from '@reduxjs/toolkit';
import { SamplesGenesExpressionsById } from '../models/internal';
import createIsFetchingSlice from './fetch';
import { timeSeriesSelected } from './timeSeries';

// State slices.
const samplesExpressionsByIdInitialState = {} as SamplesGenesExpressionsById;
const samplesExpressionsByIdSlice = createSlice({
    name: 'samplesExpressions',
    initialState: samplesExpressionsByIdInitialState,
    reducers: {
        fetchSucceeded: (
            state,
            action: PayloadAction<SamplesGenesExpressionsById>,
        ): SamplesGenesExpressionsById => {
            return _.mapValues({ ...state, ...action.payload }, (genes, sampleId) => ({
                ...state[Number(sampleId)],
                ...genes,
            }));
        },
        comparisonFetchSucceeded: (
            state,
            action: PayloadAction<SamplesGenesExpressionsById>,
        ): SamplesGenesExpressionsById => {
            return { ...state, ...action.payload };
        },
    },
    extraReducers: (builder) => {
        builder.addCase(timeSeriesSelected, (): SamplesGenesExpressionsById => {
            return samplesExpressionsByIdInitialState;
        });
    },
});

const isFetchingSamplesExpressionsSlice = createIsFetchingSlice('samplesExpressions');

const samplesExpressionsReducer = combineReducers({
    byId: samplesExpressionsByIdSlice.reducer,
    isFetchingSamplesExpressions: isFetchingSamplesExpressionsSlice.reducer,
});

// Export actions.
export const { started: samplesExpressionsFetchStarted, ended: samplesExpressionsFetchEnded } =
    isFetchingSamplesExpressionsSlice.actions;

export const {
    fetchSucceeded: samplesExpressionsFetchSucceeded,
    comparisonFetchSucceeded: samplesExpressionsComparisonFetchSucceeded,
} = samplesExpressionsByIdSlice.actions;

export type SamplesExpressionsState = ReturnType<typeof samplesExpressionsReducer>;

export default samplesExpressionsReducer;

// Selectors (exposes the store to containers).
export const getIsFetchingSamplesExpressions = (state: SamplesExpressionsState): boolean =>
    state.isFetchingSamplesExpressions;

export const getSamplesExpressionsById = (
    state: SamplesExpressionsState,
): SamplesGenesExpressionsById => state.byId;

export const getSamplesExpressionsSamplesIds = createSelector(
    getSamplesExpressionsById,
    (samplesExpressionsById) => {
        return Object.keys(samplesExpressionsById).map((stringId) => parseInt(stringId, 10));
    },
);
