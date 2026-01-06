import { AgGridReact } from 'ag-grid-react';
import React, { ReactElement, useEffect, useState, useRef, useCallback } from 'react';
import {
    GridApi,
    RowSelectedEvent,
    GridReadyEvent,
    ColDef,
    SelectionChangedEvent,
    RowClickedEvent,
    SortChangedEvent,
} from 'ag-grid-community';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { DictyGridContainer, FilterTextField, GridWrapper, ScrollShadow } from './dictyGrid.styles';

export type DictyGridProps<T> = {
    hideFilter?: boolean;
    filterLabel?: string;
    data: T[];
    selectedData?: T[];
    isFetching?: boolean;
    // AgGrid will remount if columnDefs change, so make sure you pass
    // column definitions with a persistent object (e.g. useRef / root scope).
    columnDefs: ColDef[];
    selectionMode?: 'single' | 'multiple';
    suppressRowClickSelection?: boolean;
    disableAnimateRows?: boolean;
    disableAutoSizeAllColumns?: boolean;
    disableSizeColumnsToFit?: boolean;
    getRowId: (data: T) => string;
    onReady?: () => void;
    onRowClicked?: (itemData: T) => void;
    onRowSelected?: (itemData: T) => void;
    onSelectionChanged?: (selectedItemsData: T[]) => void;
    onSortChanged?: (event: SortChangedEvent) => void;
};

const defaultColumnDef = {
    flex: 1,
    resizable: true,
    sortable: true,
};

const DictyGrid = <T,>({
    data,
    selectedData,
    isFetching,
    hideFilter = false,
    filterLabel,
    columnDefs,
    selectionMode,
    suppressRowClickSelection = false,
    disableAnimateRows = false,
    disableAutoSizeAllColumns = false,
    disableSizeColumnsToFit = false,
    getRowId,
    onReady,
    onRowClicked,
    onRowSelected,
    onSelectionChanged,
    onSortChanged,
}: DictyGridProps<T>): ReactElement => {
    const [filter, setFilter] = useState<string>('');
    const gridApi = useRef<GridApi | null>(null);
    const [gridKey, setGridKey] = useState(uuidv4());
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [shadows, setShadows] = useState({
        up: false,
        down: false,
        left: false,
        right: false,
        headerHeight: 0,
    });

    const setOverlay = useCallback(() => {
        gridApi.current?.setGridOption('loading', isFetching);

        if (data.length === 0) {
            gridApi.current?.showNoRowsOverlay();
        }
    }, [data, isFetching]);

    useEffect(() => {
        setOverlay();
    }, [setOverlay]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setFilter(e.target.value);
    };

    useEffect(() => {
        return (): void => {
            gridApi.current?.destroy();
            gridApi.current = null;
        };
    }, []);

    const sizeColumns = useCallback((): void => {
        if (!disableAutoSizeAllColumns) {
            gridApi.current?.autoSizeAllColumns();
        }

        if (!disableSizeColumnsToFit) {
            gridApi.current?.sizeColumnsToFit();
        }
    }, [disableAutoSizeAllColumns, disableSizeColumnsToFit]);

    /**
     * Hook to set grid key. Add non-reactive agGrid properties (like columnDefs)
     * to dependency list.
     */
    useEffect(() => {
        setGridKey(uuidv4());
    }, [columnDefs]);

    const handleRowSelected = (event: RowSelectedEvent): void => {
        if (event.node.isSelected()) {
            onRowSelected?.(event.node.data);
        }
    };

    /**
     * If any value is already selected, it needs to be manually set as selected or else grid won't show it.
     * @param dataToSelect - Data that will be marked as selected.
     */
    const setSelectedData = useCallback(
        (dataToSelect: T[] | undefined): void => {
            if (_.isEmpty(dataToSelect) || dataToSelect == null) {
                return;
            }

            const selectedDataIds = dataToSelect.map(getRowId);
            gridApi.current?.forEachNode((node) => {
                if (selectedDataIds?.includes(getRowId(node.data))) {
                    node.setSelected(true);
                }
            });
        },
        [getRowId],
    );

    useEffect(() => {
        setSelectedData(selectedData);
    }, [selectedData, setSelectedData]);

    const updateScrollShadows = useCallback(() => {
        const el = (s: string) => wrapperRef.current?.querySelector(s) as HTMLElement | null;
        const headerHeight = el('.ag-header')?.offsetHeight ?? 0;
        const vp = el('.ag-body-viewport');
        const hVp = el('.ag-center-cols-viewport');

        const up = (vp?.scrollTop ?? 0) > 0;
        const down = vp ? vp.scrollTop + vp.clientHeight < vp.scrollHeight - 1 : false;
        const left = (hVp?.scrollLeft ?? 0) > 0;
        const right = hVp ? hVp.scrollLeft + hVp.clientWidth < hVp.scrollWidth - 1 : false;

        setShadows((prev) =>
            prev.up !== up ||
            prev.down !== down ||
            prev.left !== left ||
            prev.right !== right ||
            prev.headerHeight !== headerHeight
                ? { up, down, left, right, headerHeight }
                : prev,
        );
    }, []);

    const handleOnGridReady = (params: GridReadyEvent): void => {
        gridApi.current = params.api;

        setOverlay();

        setSelectedData(selectedData);

        // Set up scroll shadow tracking (vertical + horizontal)
        const vp = wrapperRef.current?.querySelector('.ag-body-viewport');
        const hVp = wrapperRef.current?.querySelector('.ag-center-cols-viewport');
        vp?.addEventListener('scroll', updateScrollShadows);
        hVp?.addEventListener('scroll', updateScrollShadows);
        updateScrollShadows();

        onReady?.();
    };

    const handleOnRendered = (): void => {
        sizeColumns();
        // Update shadows after content renders
        setTimeout(updateScrollShadows, 100);
    };

    const handleOnGridSizeChanged = (): void => {
        sizeColumns();
    };

    const handleOnSelectionChanged = (event: SelectionChangedEvent): void => {
        onSelectionChanged?.(event.api.getSelectedNodes().map((selectedNode) => selectedNode.data));
    };

    const handleOnRowClicked = (event: RowClickedEvent): void => {
        onRowClicked?.(event.node.data);
    };

    const handleOnSortChanged = (event: SortChangedEvent): void => {
        onSortChanged?.(event);
    };

    return (
        <DictyGridContainer>
            {!hideFilter && (
                <FilterTextField
                    id="filterField"
                    variant="outlined"
                    label={filterLabel}
                    color="secondary"
                    size="small"
                    onChange={handleFilterChange}
                    value={filter}
                />
            )}
            <GridWrapper
                ref={wrapperRef}
                className="ag-theme-balham"
                $suppressHorizontalScroll={!disableSizeColumnsToFit}
            >
                <AgGridReact
                    key={gridKey}
                    onGridReady={handleOnGridReady}
                    onGridSizeChanged={handleOnGridSizeChanged}
                    defaultColDef={defaultColumnDef}
                    animateRows={!disableAnimateRows}
                    onFirstDataRendered={handleOnRendered}
                    groupDefaultExpanded={-1}
                    suppressColumnVirtualisation
                    onSortChanged={handleOnSortChanged}
                    columnDefs={columnDefs}
                    disableStaticMarkup
                    onFilterChanged={() => {
                        setOverlay();
                    }}
                    rowSelection={selectionMode}
                    rowStyle={
                        selectionMode == null && onRowClicked == null ? {} : { cursor: 'pointer' }
                    }
                    suppressRowClickSelection={suppressRowClickSelection}
                    onRowClicked={handleOnRowClicked}
                    onRowSelected={handleRowSelected}
                    getRowId={(params) => {
                        return getRowId(params.data);
                    }}
                    onSelectionChanged={handleOnSelectionChanged}
                    rowData={data}
                    quickFilterText={filter}
                />
                <ScrollShadow $dir="top" $visible={shadows.up} $offset={shadows.headerHeight} />
                <ScrollShadow $dir="bottom" $visible={shadows.down} />
                <ScrollShadow $dir="left" $visible={shadows.left} $offset={shadows.headerHeight} />
                <ScrollShadow
                    $dir="right"
                    $visible={shadows.right}
                    $offset={shadows.headerHeight}
                />
            </GridWrapper>
        </DictyGridContainer>
    );
};

export default DictyGrid;
