import singleCellExpressionsReducer, {
    SingleCellExpressionsState,
    singleCellExpressionsFetchStarted,
    singleCellExpressionsFetchEnded,
    getIsFetchingSingleCellExpressions,
} from './singleCellExpressions';

describe('singleCellExpressions store', () => {
    let initialState: SingleCellExpressionsState;

    beforeEach(() => {
        initialState = {
            isFetchingSingleCellExpressions: false,
        };
    });

    describe('singleCellExpressionsFetchStarted', () => {
        it('should set isFetchingSingleCellExpressions to true', () => {
            const newState = singleCellExpressionsReducer(
                initialState,
                singleCellExpressionsFetchStarted(),
            );

            expect(newState.isFetchingSingleCellExpressions).toBe(true);
        });

        it('should set isFetchingSingleCellExpressions to true when already fetching', () => {
            initialState.isFetchingSingleCellExpressions = true;
            const newState = singleCellExpressionsReducer(
                initialState,
                singleCellExpressionsFetchStarted(),
            );

            expect(newState.isFetchingSingleCellExpressions).toBe(true);
        });
    });

    describe('singleCellExpressionsFetchEnded', () => {
        it('should set isFetchingSingleCellExpressions to false', () => {
            initialState.isFetchingSingleCellExpressions = true;
            const newState = singleCellExpressionsReducer(
                initialState,
                singleCellExpressionsFetchEnded(),
            );

            expect(newState.isFetchingSingleCellExpressions).toBe(false);
        });

        it('should keep isFetchingSingleCellExpressions false when already not fetching', () => {
            const newState = singleCellExpressionsReducer(
                initialState,
                singleCellExpressionsFetchEnded(),
            );

            expect(newState.isFetchingSingleCellExpressions).toBe(false);
        });
    });

    describe('getIsFetchingSingleCellExpressions selector', () => {
        it('should return false when not fetching', () => {
            expect(getIsFetchingSingleCellExpressions(initialState)).toBe(false);
        });

        it('should return true when fetching', () => {
            initialState.isFetchingSingleCellExpressions = true;
            expect(getIsFetchingSingleCellExpressions(initialState)).toBe(true);
        });
    });
});
