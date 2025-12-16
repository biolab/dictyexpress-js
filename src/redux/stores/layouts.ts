import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Layout, Layouts } from 'react-grid-layout';
import {
    LocalStorageKey,
    ModulesKeys,
    LayoutBreakpoint,
} from 'components/genexpress/common/constants';
import { BreakpointsCols } from 'redux/models/internal';
import { logError } from 'utils/errorUtils';
import { readFromLocalStorage } from 'utils/localStorageUtils';

export const defaultBreakpointCols: BreakpointsCols = {
    [LayoutBreakpoint.large]: 12,
    [LayoutBreakpoint.mid]: 9,
    [LayoutBreakpoint.small]: 6,
};

const defaultWidthInCols = 3;
const defaultMinWidthInCols = 2;
const defaultHeightInCols = 3;
const defaultMinHeightInCols = 2;

export const generateModuleLayout = (
    moduleKey: string,
    breakpoint: LayoutBreakpoint,
    currentRowInfo: { rowIndex: number; availableSpaceInCols: number },
    widthInCols = defaultWidthInCols,
    minWidthInCols = defaultMinWidthInCols,
    heightInCols = defaultHeightInCols,
    minHeightInCols = defaultMinHeightInCols,
    breakpointCols = defaultBreakpointCols,
): Layout => {
    let x;
    let y;

    // If there's no more space in current row, move module to the next row.
    if (currentRowInfo.availableSpaceInCols < widthInCols) {
        currentRowInfo.rowIndex += 1;

        currentRowInfo.availableSpaceInCols = breakpointCols[breakpoint];

        x = 0;
        y = currentRowInfo.rowIndex * heightInCols;
    } else {
        // If there's enough space in current row, place module in it and subtract available space.
        x = breakpointCols[breakpoint] - currentRowInfo.availableSpaceInCols;
        y = currentRowInfo.rowIndex * heightInCols;
    }

    currentRowInfo.availableSpaceInCols -= widthInCols;

    return {
        i: moduleKey,
        x,
        y,
        w: widthInCols,
        h: heightInCols,
        minW: minWidthInCols,
        minH: minHeightInCols,
    };
};

const getBreakpointLayouts = (breakpoint: LayoutBreakpoint): Layout[] => {
    const availableSpaceInCols = {
        rowIndex: 0,
        availableSpaceInCols: defaultBreakpointCols[breakpoint],
    };
    return [
        generateModuleLayout(
            ModulesKeys.timeSeriesAndGeneSelector,
            breakpoint,
            availableSpaceInCols,
            {
                large: 4,
                mid: 3,
                small: defaultBreakpointCols.small,
            }[breakpoint],
        ),
        generateModuleLayout(
            ModulesKeys.expressionTimeCourses,
            breakpoint,
            availableSpaceInCols,
            {
                large: 4,
                mid: 3,
                small: defaultBreakpointCols.small,
            }[breakpoint],
        ),
        generateModuleLayout(
            ModulesKeys.singleCellExpressions,
            breakpoint,
            availableSpaceInCols,
            {
                large: 4,
                mid: 3,
                small: defaultBreakpointCols.small,
            }[breakpoint],
            3,
            defaultHeightInCols,
            3,
        ),
        generateModuleLayout(
            ModulesKeys.differentialExpressions,
            breakpoint,
            availableSpaceInCols,
            {
                large: 4,
                mid: 3,
                small: defaultBreakpointCols.small,
            }[breakpoint],
        ),
        generateModuleLayout(
            ModulesKeys.clustering,
            breakpoint,
            availableSpaceInCols,
            {
                large: 4,
                mid: 3,
                small: defaultBreakpointCols.small,
            }[breakpoint],
        ),
        generateModuleLayout(
            ModulesKeys.gOEnrichment,
            breakpoint,
            availableSpaceInCols,
            {
                large: 4,
                mid: 3,
                small: defaultBreakpointCols.small,
            }[breakpoint],
        ),
    ];
};

export const layoutsInitialState: Layouts = {
    [LayoutBreakpoint.large]: getBreakpointLayouts(LayoutBreakpoint.large),
    [LayoutBreakpoint.mid]: getBreakpointLayouts(LayoutBreakpoint.mid),
    [LayoutBreakpoint.small]: getBreakpointLayouts(LayoutBreakpoint.small),
};

let savedLayouts;
try {
    savedLayouts = readFromLocalStorage(LocalStorageKey.layouts);
} catch (error) {
    logError(error);
}

const layoutsSlice = createSlice({
    name: 'layouts',
    initialState: savedLayouts ?? layoutsInitialState,
    reducers: {
        layoutsChanged: (_state, action: PayloadAction<Layouts>): Layouts => {
            return action.payload;
        },
        layoutsReset: (): Layouts => {
            return layoutsInitialState;
        },
    },
});

export const { layoutsChanged, layoutsReset } = layoutsSlice.actions;

export type LayoutsState = ReturnType<typeof layoutsSlice.reducer>;
export default layoutsSlice.reducer;

export const getLayouts = (state: LayoutsState): Layouts => state;
