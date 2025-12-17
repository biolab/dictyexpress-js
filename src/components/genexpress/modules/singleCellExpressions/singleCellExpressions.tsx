import { ReactElement, useMemo, useRef, useEffect, useState } from 'react';
import { connect, ConnectedProps, useDispatch } from 'react-redux';
import {
    MenuItem,
    SelectChangeEvent,
    styled,
    FormControlLabel,
    Switch,
    Button,
} from '@mui/material';
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
    ControlsRow,
    LegendToggleContainer,
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

const StyledDictySelect = styled(DictySelect)`
    min-width: 80px;
    max-width: 90px;
`;

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

    // /**
    //  * Auto-switch from expression mode when no genes with data
    //  */
    useEffect(() => {
        if (geneExpressionData.length === 0 && colorMode === 'expression') {
            setShowLegend(false);
        } else {
            setShowLegend(true);
        }
    }, [geneExpressionData.length, colorMode]);

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

    // Calculate number of visible toggles
    const visibleToggleCount = useMemo(() => {
        let count = 1; // Legend toggle is always visible
        if (shownGenesCount > 0 && colorMode !== 'expression') {
            count++; // Expression toggle is visible
        }
        return count;
    }, [shownGenesCount, colorMode]);

    // Show error state
    if (error) {
        return (
            <SingleCellExpressionsContainer>
                <ErrorMessage>{error}</ErrorMessage>
            </SingleCellExpressionsContainer>
        );
    }

    // Show empty state only on initial load
    if (umapCoordinates.length === 0 && isInitialLoad) {
        return (
            <SingleCellExpressionsContainer>
                <LoadingMessage>Loading single-cell data...</LoadingMessage>
            </SingleCellExpressionsContainer>
        );
    }

    // Main view - always show content with loading bar in header
    return (
        <SingleCellExpressionsContainer>
            <ControlsRow $toggleCount={visibleToggleCount}>
                {availableStrains.length > 1 ? (
                    <StyledDictySelect
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
                    </StyledDictySelect>
                ) : (
                    <StyledDictySelect
                        label="Strain"
                        value={selectedStrain}
                        handleOnChange={handleStrainChange}
                        disabled
                        data-tutorial="single-cell-strain-dropdown"
                    >
                        <MenuItem value={selectedStrain}>{selectedStrain}</MenuItem>
                    </StyledDictySelect>
                )}

                <StyledDictySelect
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
                </StyledDictySelect>

                {shownGenesCount > 0 && (colorMode === 'expression' || useAlpha) && (
                    <>
                        <StyledDictySelect
                            label="Transform"
                            value={transformMode}
                            handleOnChange={(e: SelectChangeEvent<unknown>) =>
                                setTransformMode(e.target.value as 'linear' | 'log1p')
                            }
                        >
                            <MenuItem value="linear">Linear</MenuItem>
                            <MenuItem value="log1p">Log1p</MenuItem>
                        </StyledDictySelect>

                        {shownGenesCount > 1 && (
                            <StyledDictySelect
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
                            </StyledDictySelect>
                        )}
                    </>
                )}

                <LegendToggleContainer>
                    {shownGenesCount > 0 && colorMode !== 'expression' && (
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
                </LegendToggleContainer>
            </ControlsRow>

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
