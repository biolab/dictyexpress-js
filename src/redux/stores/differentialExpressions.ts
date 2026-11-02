import { Storage } from '@genialis/resolwe/dist/api/types/rest';
import {
    createSlice,
    PayloadAction,
    createSelector,
    combineReducers,
    original,
} from '@reduxjs/toolkit';
import _ from 'lodash';
import { DifferentialExpression, DifferentialExpressionsById } from '../models/internal';
import createIsFetchingSlice from './fetch';

// Result of comparing cells selected in the single-cell module. Real differential expressions
// are Resolwe data with positive ids; each new comparison replaces this one.
export const CELL_SELECTION_DIFFERENTIAL_EXPRESSION_ID = -1;

const differentialExpressionsByIdInitialState = {} as DifferentialExpressionsById;
const differentialExpressionsByIdSlice = createSlice({
    name: 'differentialExpressions',
    initialState: differentialExpressionsByIdInitialState,
    reducers: {
        fetchSucceeded: (
            state,
            action: PayloadAction<DifferentialExpression[]>,
        ): DifferentialExpressionsById => {
            const byId: DifferentialExpressionsById = _.keyBy(
                action.payload,
                (differentialExpression) => differentialExpression.id.toString(),
            );
            // Keep a cell selection result made before the list arrived.
            const cellSelection = original(state)?.[CELL_SELECTION_DIFFERENTIAL_EXPRESSION_ID];
            if (cellSelection != null) {
                byId[CELL_SELECTION_DIFFERENTIAL_EXPRESSION_ID] = cellSelection;
            }
            return byId;
        },
        cellSelectionResultAdded: (state, action: PayloadAction<DifferentialExpression>) => {
            state[CELL_SELECTION_DIFFERENTIAL_EXPRESSION_ID] = action.payload;
        },
        storageFetchSucceeded: (
            state,
            action: PayloadAction<Storage>,
        ): DifferentialExpressionsById => {
            // Get all differential expressions with the same output json that was fetched
            // and fill their json property.
            return _(_.flatMap(state))
                .map((differentialExpression) => {
                    if (differentialExpression.output.de_json === action.payload.id) {
                        return {
                            ...differentialExpression,
                            json: action.payload.json,
                        };
                    }
                    return differentialExpression;
                })
                .keyBy('id')
                .value();
        },
    },
});

const selectedIdSlice = createSlice({
    name: 'differentialExpressions',
    initialState: null as number | null,
    reducers: {
        selected: (_state, action: PayloadAction<number>): number => action.payload,
    },
});

const isFetchingDifferentialExpressionsSlice = createIsFetchingSlice('differentialExpressions');
const isFetchingDifferentialExpressionsDataSlice = createIsFetchingSlice(
    'differentialExpressionsData',
);

const differentialExpressionsReducer = combineReducers({
    byId: differentialExpressionsByIdSlice.reducer,
    selectedId: selectedIdSlice.reducer,
    isFetchingDifferentialExpressions: isFetchingDifferentialExpressionsSlice.reducer,
    isFetchingDifferentialExpressionsData: isFetchingDifferentialExpressionsDataSlice.reducer,
});

export const {
    started: differentialExpressionsFetchStarted,
    ended: differentialExpressionsFetchEnded,
} = isFetchingDifferentialExpressionsSlice.actions;

export const { selected: differentialExpressionSelected } = selectedIdSlice.actions;

export const {
    started: differentialExpressionsDataFetchStarted,
    ended: differentialExpressionsDataFetchEnded,
} = isFetchingDifferentialExpressionsDataSlice.actions;

export const {
    fetchSucceeded: differentialExpressionsFetchSucceeded,
    storageFetchSucceeded: differentialExpressionStorageFetchSucceeded,
    cellSelectionResultAdded: differentialExpressionCellSelectionResultAdded,
} = differentialExpressionsByIdSlice.actions;

export type DifferentialExpressionsState = ReturnType<typeof differentialExpressionsReducer>;

export default differentialExpressionsReducer;

// Selectors (exposes the store to containers).
const getSelectedDifferentialExpressionId = (state: DifferentialExpressionsState): number | null =>
    state.selectedId;

export const getIsFetchingDifferentialExpressions = (
    state: DifferentialExpressionsState,
): boolean => state.isFetchingDifferentialExpressions;

export const getIsFetchingDifferentialExpressionsData = (
    state: DifferentialExpressionsState,
): boolean => state.isFetchingDifferentialExpressionsData;

export const getDifferentialExpressionsById = (
    state: DifferentialExpressionsState,
): DifferentialExpressionsById => state.byId;

export const getDifferentialExpressions = createSelector(
    getDifferentialExpressionsById,
    (differentialExpressionsById): DifferentialExpression[] => {
        return _.flatMap(differentialExpressionsById);
    },
);

export const getDifferentialExpression = (
    differentialExpressionId: number,
    state: DifferentialExpressionsState,
): DifferentialExpression | null => state.byId[differentialExpressionId];

export const getSelectedDifferentialExpression = createSelector(
    getDifferentialExpressionsById,
    getSelectedDifferentialExpressionId,
    (differentialExpressionsById, selectedId): DifferentialExpression | null => {
        return selectedId != null ? differentialExpressionsById[selectedId] : null;
    },
);

export const getSelectedDifferentialExpressionGeneIds = createSelector(
    getSelectedDifferentialExpression,
    (selectedDifferentialExpression) => selectedDifferentialExpression?.json.gene_id as string[],
);
