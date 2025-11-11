import { combineReducers } from '@reduxjs/toolkit';
import createIsFetchingSlice from './fetch';

const isFetchingSingleCellExpressionsSlice = createIsFetchingSlice('singleCellExpressions');

const singleCellExpressionsReducer = combineReducers({
    isFetchingSingleCellExpressions: isFetchingSingleCellExpressionsSlice.reducer,
});

// Export actions.
export const { started: singleCellExpressionsFetchStarted, ended: singleCellExpressionsFetchEnded } =
    isFetchingSingleCellExpressionsSlice.actions;

export type SingleCellExpressionsState = ReturnType<typeof singleCellExpressionsReducer>;

export default singleCellExpressionsReducer;

// Selectors (exposes the store to containers).
export const getIsFetchingSingleCellExpressions = (state: SingleCellExpressionsState): boolean =>
    state.isFetchingSingleCellExpressions;

