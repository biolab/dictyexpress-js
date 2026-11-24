import _ from 'lodash';
import differentialExpressionsReducer, {
    CELL_SELECTION_DIFFERENTIAL_EXPRESSION_ID,
    differentialExpressionCellSelectionResultAdded,
    differentialExpressionSelected,
    differentialExpressionsFetchSucceeded,
    DifferentialExpressionsState,
    differentialExpressionStorageFetchSucceeded,
} from './differentialExpressions';
import {
    generateDifferentialExpressionJson,
    generateDifferentialExpressionsById,
    generateStorage,
} from 'tests/mock';

const differentialExpressionsById = generateDifferentialExpressionsById(2);
const differentialExpressions = _.flatMap(differentialExpressionsById);
const differentialExpressionStorageJson = generateDifferentialExpressionJson(5);

describe('differentialExpressions store', () => {
    let initialState: DifferentialExpressionsState;

    describe('differentialExpressions not fetched', () => {
        beforeEach(() => {
            initialState = {
                byId: {},
                selectedId: 0,
                isFetchingDifferentialExpressions: false,
                isFetchingDifferentialExpressionsData: false,
            };
        });

        it('should add fetched differentialExpressions to state with differentialExpressionsFetchSucceeded action', () => {
            const newState = differentialExpressionsReducer(
                initialState,
                differentialExpressionsFetchSucceeded(differentialExpressions),
            );
            const expectedState = {
                ...initialState,
                byId: differentialExpressionsById,
            };

            expect(newState).toEqual(expectedState);
        });

        it('should keep a cell selection result when differential expressions are fetched', () => {
            const cellSelection = {
                ...differentialExpressions[0],
                id: CELL_SELECTION_DIFFERENTIAL_EXPRESSION_ID,
            };
            const withCellSelection = differentialExpressionsReducer(
                initialState,
                differentialExpressionCellSelectionResultAdded(cellSelection),
            );
            const newState = differentialExpressionsReducer(
                withCellSelection,
                differentialExpressionsFetchSucceeded(differentialExpressions),
            );

            expect(newState.byId).toEqual({
                ...differentialExpressionsById,
                [CELL_SELECTION_DIFFERENTIAL_EXPRESSION_ID]: cellSelection,
            });
        });

        it('should replace the previous cell selection result', () => {
            const first = { ...differentialExpressions[0], id: -1, name: 'first' };
            const second = { ...differentialExpressions[1], id: -1, name: 'second' };
            const newState = [first, second].reduce(
                (state, result) =>
                    differentialExpressionsReducer(
                        state,
                        differentialExpressionCellSelectionResultAdded(result),
                    ),
                initialState,
            );

            expect(newState.byId).toEqual({ [CELL_SELECTION_DIFFERENTIAL_EXPRESSION_ID]: second });
        });

        it('should set selectedId with differentialExpressionSelected action', () => {
            const newState = differentialExpressionsReducer(
                initialState,
                differentialExpressionSelected(123),
            );
            const expectedState = {
                ...initialState,
                selectedId: 123,
            };

            expect(newState).toEqual(expectedState);
        });
    });

    describe('differentialExpressions fetched', () => {
        beforeEach(() => {
            initialState = {
                byId: differentialExpressionsById,
                selectedId: 0,
                isFetchingDifferentialExpressions: false,
                isFetchingDifferentialExpressionsData: false,
            };
        });

        it('should add fetched differentialExpressions to state with differentialExpressionsFetchSucceeded action', () => {
            const newState = differentialExpressionsReducer(
                initialState,
                differentialExpressionStorageFetchSucceeded(
                    generateStorage(
                        differentialExpressions[0].output.de_json,
                        differentialExpressionStorageJson,
                    ),
                ),
            );
            const expectedState = {
                ...initialState,
                byId: {
                    [differentialExpressions[0].id]: {
                        ...differentialExpressions[0],
                        json: differentialExpressionStorageJson,
                    },
                    [differentialExpressions[1].id]: differentialExpressions[1],
                },
            };

            expect(newState).toEqual(expectedState);
        });
    });
});
