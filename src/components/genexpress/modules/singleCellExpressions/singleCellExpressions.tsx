import { ReactElement, useMemo, useRef, useEffect, useState } from 'react';
import { connect, ConnectedProps, useDispatch } from 'react-redux';
import { MenuItem, SelectChangeEvent, FormControlLabel, Switch, Button } from '@mui/material';
import UmapPlot, { UmapDataPoint, UmapPlotHandle, GeneExpressionData } from './umapPlot/umapPlot';
import {
    loadUMAPCoordinates,
    loadGeneNames,
    loadGeneSymbols,
    loadCellTags,
    loadCellTimes,
    loadCellTypes,
    loadDatasetInfo,
    loadMultipleGenesExpression,
    aggregateGeneExpression,
    transformExpression,
    setStrain,
    listAvailableStrains,
    getCurrentStrain,
} from './dataLoader';
import {
    SingleCellExpressionsContainer,
    ErrorMessage,
    LoadingMessage,
    SingleCellExpressionsControls,
    InfoRow,
} from './singleCellExpressions.styles';
import GeneDataStatusModal from './geneDataStatusModal/geneDataStatusModal';
import { RootState } from 'redux/rootReducer';
import { getSelectedGenes, getHighlightedGenes } from 'redux/stores/genes';
import {
    singleCellExpressionsFetchStarted,
    singleCellExpressionsFetchEnded,
} from 'redux/stores/singleCellExpressions';
import { addSnackbar } from 'redux/stores/notifications';
import DictySelect from 'components/genexpress/common/dictySelect/dictySelect';
import { handleError } from 'utils/errorUtils';
import { Gene } from 'redux/models/internal';
import useReport from 'components/genexpress/common/reportBuilder/useReport';
import { objectsArrayToTsv } from 'utils/reportUtils';
import useSize from 'components/genexpress/common/useSize';
import HiddenControlsIndicator from 'components/genexpress/common/hiddenControlsIndicator/hiddenControlsIndicator';

const DEFAULT_STRAIN = 'AX4';

type SingleCellExpressionsProps = Record<string, never>;

const mapStateToProps = (state: RootState) => ({
    selectedGenes: getSelectedGenes(state.genes),
    highlightedGenes: getHighlightedGenes(state.genes),
});

const connector = connect(mapStateToProps, {
    connectedSingleCellExpressionsFetchStarted: singleCellExpressionsFetchStarted,
    connectedSingleCellExpressionsFetchEnded: singleCellExpressionsFetchEnded,
});

type PropsFromRedux = ConnectedProps<typeof connector>;
type CombinedProps = SingleCellExpressionsProps & PropsFromRedux;

const SingleCellExpressions = ({
    selectedGenes,
    highlightedGenes,
    connectedSingleCellExpressionsFetchStarted,
    connectedSingleCellExpressionsFetchEnded,
}: CombinedProps): ReactElement => {
    // Use highlighted genes when available, otherwise use all selected genes
    const genesToDisplay = highlightedGenes.length > 0 ? highlightedGenes : selectedGenes;
    const chartRef = useRef<UmapPlotHandle>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { width } = useSize(containerRef);
    // We need a request ID to avoid race conditions and showing stale data.
    const geneExpressionRequestIdRef = useRef(0);
    const dispatch = useDispatch();

    // State for strain selection
    const [availableStrains, setAvailableStrains] = useState<string[]>([]);
    const [selectedStrain, setSelectedStrain] = useState<string>(getCurrentStrain());
    const [referenceBounds, setReferenceBounds] = useState<{
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    } | null>(null);

    // State for data
    const [umapCoordinates, setUmapCoordinates] = useState<UmapDataPoint[]>([]);
    const [geneNames, setGeneNames] = useState<string[]>([]); // Gene IDs (DDB_G...)
    const [geneSymbols, setGeneSymbols] = useState<string[]>([]); // Gene symbols (pspA, pspB...)
    const [datasetInfo, setDatasetInfo] = useState<{
        strain: string;
        n_genes: number;
        n_cells: number;
    } | null>(null);
    const [colorValues, setColorValues] = useState<Float32Array | undefined>(undefined);
    const [geneExpressionData, setGeneExpressionData] = useState<GeneExpressionData[]>([]);
    const [loadingGeneExpression, setLoadingGeneExpression] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // State for controls
    const [colorMode, setColorMode] = useState<'expression' | 'time' | 'cell_type'>('expression');
    const [transformMode, setTransformMode] = useState<'linear' | 'log1p'>('log1p');
    const [aggregationMode, setAggregationMode] = useState<'average' | 'sum' | 'min' | 'max'>(
        'average',
    );
    const [showLegend, setShowLegend] = useState(true);
    const [useAlpha, setUseAlpha] = useState(true);
    const [isGeneDataModalOpen, setIsGeneDataModalOpen] = useState(false);
    const [displayControls, setDisplayControls] = useState({
        firstLevel: true,
        secondLevel: true,
    });

    /**
     * Load available strains on mount
     */
    useEffect(() => {
        const loadStrains = async () => {
            const strains = await listAvailableStrains();
            setAvailableStrains(strains);
        };
        void loadStrains();
    }, []);

    /**
     * Load single-cell data when strain changes
     */
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setError(null);
                connectedSingleCellExpressionsFetchStarted();

                // Reset data when switching strains
                setColorValues(undefined);
                setGeneExpressionData([]);

                const [coordinates, names, symbols, tags, times, types, info] = await Promise.all([
                    loadUMAPCoordinates(),
                    loadGeneNames(),
                    loadGeneSymbols(),
                    loadCellTags(),
                    loadCellTimes(),
                    loadCellTypes(),
                    loadDatasetInfo(),
                ]);

                const points: UmapDataPoint[] = coordinates.x.map((x, i) => ({
                    id: i.toString(),
                    x,
                    y: coordinates.y[i],
                    tag: tags[i],
                    time: times[i],
                    cell_type: types[i],
                }));

                // Store reference bounds from default strain
                if (selectedStrain === DEFAULT_STRAIN && !referenceBounds && points.length > 0) {
                    const minX = Math.min(...points.map((p) => p.x));
                    const maxX = Math.max(...points.map((p) => p.x));
                    const minY = Math.min(...points.map((p) => p.y));
                    const maxY = Math.max(...points.map((p) => p.y));
                    setReferenceBounds({ minX, maxX, minY, maxY });
                }

                setUmapCoordinates(points);
                setGeneNames(names);
                setGeneSymbols(symbols);
                setDatasetInfo(info);
                setIsInitialLoad(false);
                connectedSingleCellExpressionsFetchEnded();
            } catch {
                setError('Failed to load single-cell data. Please check the data files.');
                setIsInitialLoad(false);
                connectedSingleCellExpressionsFetchEnded();
            }
        };

        void loadInitialData();
    }, [
        selectedStrain,
        referenceBounds,
        connectedSingleCellExpressionsFetchStarted,
        connectedSingleCellExpressionsFetchEnded,
    ]);

    /**
     * Load and aggregate gene expression data whenever displayed genes change.
     * Uses highlighted genes when available, otherwise uses all selected genes.
     */
    useEffect(() => {
        if (!datasetInfo) {
            return;
        }

        const requestId = ++geneExpressionRequestIdRef.current;

        if (genesToDisplay.length === 0) {
            setColorValues(undefined);
            setGeneExpressionData([]);
            setLoadingGeneExpression(false);
            return;
        }

        const loadGeneExpression = async () => {
            try {
                setLoadingGeneExpression(true);
                connectedSingleCellExpressionsFetchStarted();

                const geneIndices: number[] = [];

                for (const gene of genesToDisplay) {
                    let idx = -1;

                    if (idx === -1 && gene.feature_id) {
                        idx = geneNames.findIndex((id) => id === gene.feature_id);
                    }

                    if (idx !== -1) {
                        geneIndices.push(idx);
                    }
                }

                if (geneIndices.length === 0) {
                    if (requestId !== geneExpressionRequestIdRef.current) {
                        connectedSingleCellExpressionsFetchEnded();
                        return;
                    }
                    setColorValues(undefined);
                    setGeneExpressionData([]);
                    setLoadingGeneExpression(false);
                    connectedSingleCellExpressionsFetchEnded();
                    return;
                }

                const { data: expressionData, failedIndices } =
                    await loadMultipleGenesExpression(geneIndices);

                if (requestId !== geneExpressionRequestIdRef.current) {
                    connectedSingleCellExpressionsFetchEnded();
                    return;
                }

                if (failedIndices.length > 0) {
                    const failedGeneNames = failedIndices
                        .map((idx) => geneSymbols[idx] || geneNames[idx])
                        .join(', ');
                    dispatch(
                        addSnackbar({
                            message: `Failed to load expression data for ${failedIndices.length} gene(s): ${failedGeneNames}`,
                            variant: 'warning',
                        }),
                    );
                }

                const transformedGeneData: Array<{
                    geneName: string;
                    geneSymbol: string;
                    expression: Float32Array;
                }> = [];
                for (let i = 0; i < geneIndices.length; i++) {
                    const geneIdx = geneIndices[i];
                    const expression = expressionData.get(geneIdx);
                    if (expression) {
                        const transformed = transformExpression(expression, transformMode);
                        transformedGeneData.push({
                            geneName: geneNames[geneIdx],
                            geneSymbol: geneSymbols[geneIdx],
                            expression: transformed,
                        });
                    }
                }

                const expressions = Array.from(expressionData.values());
                const aggregated = aggregateGeneExpression(expressions, aggregationMode);
                const transformedAggregated = transformExpression(aggregated, transformMode);

                setColorValues(transformedAggregated);
                setGeneExpressionData(transformedGeneData);
            } catch (error) {
                if (requestId !== geneExpressionRequestIdRef.current) {
                    connectedSingleCellExpressionsFetchEnded();
                    return;
                }
                dispatch(handleError('Error loading single cell gene expression data.', error));
                setColorValues(undefined);
                setGeneExpressionData([]);
            } finally {
                if (requestId === geneExpressionRequestIdRef.current) {
                    setLoadingGeneExpression(false);
                    connectedSingleCellExpressionsFetchEnded();
                }
            }
        };

        void loadGeneExpression();
    }, [
        genesToDisplay,
        geneNames,
        geneSymbols,
        datasetInfo,
        aggregationMode,
        transformMode,
        dispatch,
        connectedSingleCellExpressionsFetchStarted,
        connectedSingleCellExpressionsFetchEnded,
    ]);

    useEffect(() => {
        setShowLegend(!(geneExpressionData.length === 0 && colorMode === 'expression'));
    }, [geneExpressionData.length, colorMode]);

    useEffect(() => {
        if (width == null) return;
        const availableWidth = width - 120;
        const genesWithData = geneExpressionData.length;

        const showTransform = genesWithData > 0 && (colorMode === 'expression' || useAlpha);
        const showAggregation = genesWithData > 1 && (colorMode === 'expression' || useAlpha);
        const showExpressionToggle = genesWithData > 0 && colorMode !== 'expression';

        const baseWidth = 160; // Color by + Legend toggle
        const expressionToggleWidth = showExpressionToggle ? 90 : 0;
        const transformWidth = showTransform ? 90 : 0;
        const aggregationWidth = showAggregation ? 90 : 0;

        const firstLevelWidth = baseWidth + expressionToggleWidth;
        const secondLevelWidth = firstLevelWidth + transformWidth + aggregationWidth;

        setDisplayControls({
            firstLevel: availableWidth > firstLevelWidth,
            secondLevel: availableWidth > secondLevelWidth,
        });
    }, [width, geneExpressionData.length, colorMode, useAlpha]);

    useReport(
        (processFile) => {
            if (umapCoordinates.length === 0) {
                return;
            }

            if (geneExpressionData.length > 0) {
                const cellTable = umapCoordinates.map((cell, idx) => {
                    const row: Record<string, string | number> = {
                        cell_id: cell.tag,
                        umap_x: cell.x,
                        umap_y: cell.y,
                        time: cell.time,
                        cell_type: cell.cell_type,
                    };
                    for (const gene of geneExpressionData) {
                        row[gene.geneName] = gene.expression[idx];
                    }
                    return row;
                });
                processFile(
                    'Single Cell Expressions/cell_expressions.tsv',
                    objectsArrayToTsv(cellTable),
                    false,
                );
            }

            if (chartRef.current != null) {
                const pngDataUrl = chartRef.current.exportAsPNG();
                if (pngDataUrl) {
                    const base64Data = pngDataUrl.substring(pngDataUrl.indexOf(',') + 1);
                    processFile('Single Cell Expressions/single_cell_umap.png', base64Data, true);
                }
            }
        },
        [umapCoordinates, geneExpressionData],
    );

    /**
     * Handle strain selection change
     */
    const handleStrainChange = (event: SelectChangeEvent<unknown>) => {
        const newStrain = event.target.value as string;
        setStrain(newStrain);
        setSelectedStrain(newStrain);
    };

    const cellCountDisplay = useMemo(() => {
        return umapCoordinates.length > 0 ? `${umapCoordinates.length} cells` : '';
    }, [umapCoordinates.length]);

    // Genes that actually have data (shown on plot)
    const shownGenesCount = geneExpressionData.length;

    // Separate genes with and without data
    const { genesWithData, genesWithoutData } = useMemo(() => {
        const geneNamesWithData = new Set(geneExpressionData.map((g) => g.geneName));
        const withData: Gene[] = [];
        const withoutData: Gene[] = [];

        for (const gene of genesToDisplay) {
            if (geneNamesWithData.has(gene.feature_id)) {
                withData.push(gene);
            } else {
                withoutData.push(gene);
            }
        }

        return { genesWithData: withData, genesWithoutData: withoutData };
    }, [genesToDisplay, geneExpressionData]);

    // Show error state
    if (error) {
        return (
            <SingleCellExpressionsContainer ref={containerRef}>
                <ErrorMessage>{error}</ErrorMessage>
            </SingleCellExpressionsContainer>
        );
    }

    // Show empty state only on initial load
    if (umapCoordinates.length === 0 && isInitialLoad) {
        return (
            <SingleCellExpressionsContainer ref={containerRef}>
                <LoadingMessage>Loading single-cell data...</LoadingMessage>
            </SingleCellExpressionsContainer>
        );
    }

    // Main view - always show content with loading bar in header
    return (
        <SingleCellExpressionsContainer ref={containerRef}>
            <SingleCellExpressionsControls>
                {availableStrains.length > 1 ? (
                    <DictySelect
                        label="Strain"
                        value={selectedStrain}
                        handleOnChange={handleStrainChange}
                        data-tutorial="single-cell-strain-dropdown"
                    >
                        {availableStrains.map((strain) => (
                            <MenuItem key={strain} value={strain}>
                                {strain}
                            </MenuItem>
                        ))}
                    </DictySelect>
                ) : (
                    <DictySelect
                        label="Strain"
                        value={selectedStrain}
                        handleOnChange={handleStrainChange}
                        disabled
                        data-tutorial="single-cell-strain-dropdown"
                    >
                        <MenuItem value={selectedStrain}>{selectedStrain}</MenuItem>
                    </DictySelect>
                )}

                <DictySelect
                    label="Color by"
                    value={colorMode}
                    handleOnChange={(e: SelectChangeEvent<unknown>) =>
                        setColorMode(e.target.value as 'expression' | 'time' | 'cell_type')
                    }
                    data-tutorial="single-cell-color-dropdown"
                >
                    <MenuItem value="expression">Expression</MenuItem>
                    <MenuItem value="time">Time</MenuItem>
                    <MenuItem value="cell_type">Cell Type</MenuItem>
                </DictySelect>

                {displayControls.secondLevel &&
                    shownGenesCount > 0 &&
                    (colorMode === 'expression' || useAlpha) && (
                        <DictySelect
                            label="Transform"
                            value={transformMode}
                            handleOnChange={(e: SelectChangeEvent<unknown>) =>
                                setTransformMode(e.target.value as 'linear' | 'log1p')
                            }
                        >
                            <MenuItem value="linear">Linear</MenuItem>
                            <MenuItem value="log1p">Log1p</MenuItem>
                        </DictySelect>
                    )}

                {displayControls.secondLevel &&
                    shownGenesCount > 1 &&
                    (colorMode === 'expression' || useAlpha) && (
                        <DictySelect
                            label="Aggregation"
                            value={aggregationMode}
                            handleOnChange={(e: SelectChangeEvent<unknown>) =>
                                setAggregationMode(
                                    e.target.value as 'average' | 'sum' | 'min' | 'max',
                                )
                            }
                        >
                            <MenuItem value="average">Average</MenuItem>
                            <MenuItem value="sum">Sum</MenuItem>
                            <MenuItem value="min">Min</MenuItem>
                            <MenuItem value="max">Max</MenuItem>
                        </DictySelect>
                    )}

                {displayControls.firstLevel &&
                    shownGenesCount > 0 &&
                    colorMode !== 'expression' && (
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={useAlpha}
                                    onChange={(event): void => {
                                        setUseAlpha(event.target.checked);
                                    }}
                                    size="small"
                                />
                            }
                            label="Expression"
                            labelPlacement="top"
                        />
                    )}
                {displayControls.firstLevel && (
                    <FormControlLabel
                        control={
                            <Switch
                                checked={showLegend}
                                onChange={(event): void => {
                                    setShowLegend(event.target.checked);
                                }}
                                size="small"
                            />
                        }
                        disabled={shownGenesCount === 0 && colorMode === 'expression'}
                        label="Legend"
                        labelPlacement="top"
                    />
                )}
                {!displayControls.secondLevel && <HiddenControlsIndicator />}
            </SingleCellExpressionsControls>

            <UmapPlot
                data={umapCoordinates}
                colorValues={colorValues}
                colorMode={colorMode}
                transformMode={transformMode}
                aggregationMode={aggregationMode}
                showLegend={showLegend}
                useAlpha={useAlpha}
                geneExpressionData={geneExpressionData}
                totalGenesSelected={genesToDisplay.length}
                fixedBounds={referenceBounds}
                ref={chartRef}
            />

            <InfoRow>
                <Button size="small" style={{ pointerEvents: 'none' }}>
                    {cellCountDisplay}
                </Button>
                {genesToDisplay.length > 0 && (
                    <>
                        <span>•</span>
                        <Button
                            size="small"
                            onClick={() => setIsGeneDataModalOpen(true)}
                            disabled={loadingGeneExpression}
                        >
                            {shownGenesCount} / {genesToDisplay.length}{' '}
                            {highlightedGenes.length > 0 ? 'highlighted ' : ''}gene
                            {genesToDisplay.length !== 1 ? 's' : ''} with data
                        </Button>
                    </>
                )}
            </InfoRow>

            {isGeneDataModalOpen && (
                <GeneDataStatusModal
                    genesWithData={genesWithData}
                    genesWithoutData={genesWithoutData}
                    onClose={() => setIsGeneDataModalOpen(false)}
                />
            )}
        </SingleCellExpressionsContainer>
    );
};

export default connector(SingleCellExpressions);
