import { ReactElement, useMemo, useRef, useEffect, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { RootState } from 'redux/rootReducer';
import { getSelectedGenes } from 'redux/stores/genes';
import UmapPlot, { UmapDataPoint, UmapPlotHandle } from './umapPlot/umapPlot';
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
    SingleCellExpressionsHeader, 
    ErrorMessage, 
    LoadingMessage,
    StrainSelectorContainer,
    StrainLabel,
    StrainSelect,
    StrainText,
} from './singleCellExpressions.styles';

const MAX_GENES_TO_SHOW = 500;
const DEFAULT_STRAIN = 'AX4';

type SingleCellExpressionsProps = Record<string, never>;

const mapStateToProps = (state: RootState) => ({
    selectedGenes: getSelectedGenes(state.genes),
});

const connector = connect(mapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;
type CombinedProps = SingleCellExpressionsProps & PropsFromRedux;

const SingleCellExpressions = ({ selectedGenes }: CombinedProps): ReactElement => {
    const chartRef = useRef<UmapPlotHandle>(null);

    // State for strain selection
    const [availableStrains, setAvailableStrains] = useState<string[]>([]);
    const [selectedStrain, setSelectedStrain] = useState<string>(getCurrentStrain());
    const [referenceBounds, setReferenceBounds] = useState<{ minX: number; maxX: number; minY: number; maxY: number } | null>(null);

    // State for data
    const [umapCoordinates, setUmapCoordinates] = useState<UmapDataPoint[]>([]);
    const [geneNames, setGeneNames] = useState<string[]>([]); // Gene IDs (DDB_G...)
    const [geneSymbols, setGeneSymbols] = useState<string[]>([]); // Gene symbols (pspA, pspB...)
    const [cellTags, setCellTags] = useState<string[]>([]); // Cell tags from obs.index
    const [datasetInfo, setDatasetInfo] = useState<{ strain: string; n_genes: number; n_cells: number } | null>(
        null
    );
    const [colorValues, setColorValues] = useState<Float32Array | undefined>(undefined);
    const [geneExpressionData, setGeneExpressionData] = useState<
        Array<{ geneName: string; geneSymbol: string; expression: Float32Array }>
    >([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // State for controls
    const [transformMode, setTransformMode] = useState<'linear' | 'log2' | 'log1p'>('log2');
    const [aggregationMode, setAggregationMode] = useState<'average' | 'sum' | 'min' | 'max'>(
        'average'
    );

    /**
     * Load available strains on mount
     */
    useEffect(() => {
        const loadStrains = async () => {
            try {
                const strains = await listAvailableStrains();
                setAvailableStrains(strains);
            } catch (err) {
                console.error('Failed to load available strains:', err);
            }
        };
        loadStrains();
    }, []);

    /**
     * Load single-cell data when strain changes
     */
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                setError(null);
                
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
                    const minX = Math.min(...points.map(p => p.x));
                    const maxX = Math.max(...points.map(p => p.x));
                    const minY = Math.min(...points.map(p => p.y));
                    const maxY = Math.max(...points.map(p => p.y));
                    setReferenceBounds({ minX, maxX, minY, maxY });
                }

                setUmapCoordinates(points);
                setGeneNames(names);
                setGeneSymbols(symbols);
                setCellTags(tags);
                setDatasetInfo(info);
                setLoading(false);
                setIsInitialLoad(false);
            } catch (err) {
                setError('Failed to load single-cell data. Please check the data files.');
                setLoading(false);
                setIsInitialLoad(false);
            }
        };

        loadInitialData();
    }, [selectedStrain]);

    /**
     * Load and aggregate gene expression data whenever selected genes change.
     */
    useEffect(() => {
        if (!datasetInfo) {
            return;
        }
        
        if (selectedGenes.length === 0) {
            setColorValues(undefined);
            setGeneExpressionData([]);
            return;
        }

        const loadGeneExpression = async () => {
            try {
                const limitedGenes = selectedGenes.slice(0, MAX_GENES_TO_SHOW);
                
                const geneIndices: number[] = [];
                
                for (const gene of limitedGenes) {
                    let idx = -1;
                    
                    // Try matching by gene symbol (case-insensitive) first.
                    if (gene.name) {
                        idx = geneSymbols.findIndex(
                            (symbol) => symbol.toLowerCase() === gene.name.toLowerCase()
                        );
                    }
                    
                    // Try matching by feature ID if symbol match failed.
                    if (idx === -1 && gene.feature_id) {
                        idx = geneNames.findIndex((id) => id === gene.feature_id);
                    }
                    
                    if (idx !== -1) {
                        geneIndices.push(idx);
                    }
                }

                if (geneIndices.length === 0) {
                    setColorValues(undefined);
                    return;
                }
                
                const expressionData = await loadMultipleGenesExpression(geneIndices);

                const transformedGeneData: Array<{ geneName: string; geneSymbol: string; expression: Float32Array }> = [];
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
            } catch (err) {
                // Expression loading failed, but don't show error to user
                setColorValues(undefined);
            }
        };

        loadGeneExpression();
    }, [selectedGenes, geneNames, geneSymbols, datasetInfo, aggregationMode, transformMode]);

    /**
     * Handle strain selection change
     */
    const handleStrainChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newStrain = event.target.value;
        setStrain(newStrain);
        setSelectedStrain(newStrain);
    };

    const isCapped = selectedGenes.length > MAX_GENES_TO_SHOW;

    const cellCountDisplay = useMemo(() => {
        return umapCoordinates.length > 0 ? `${umapCoordinates.length} cells` : '';
    }, [umapCoordinates.length]);

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
            <SingleCellExpressionsHeader>
                <div>
                    {cellCountDisplay}
                    {selectedGenes.length > 0 && (
                        <span>
                            {' '}
                            • {isCapped ? MAX_GENES_TO_SHOW : selectedGenes.length} gene
                            {(isCapped ? MAX_GENES_TO_SHOW : selectedGenes.length) !== 1
                                ? 's'
                                : ''}{' '}
                            selected
                        </span>
                    )}
                </div>
                <StrainSelectorContainer>
                    <StrainLabel>Strain:</StrainLabel>
                    {availableStrains.length > 1 ? (
                        <StrainSelect
                            id="strain-selector"
                            value={selectedStrain}
                            onChange={handleStrainChange}
                        >
                            {availableStrains.map((strain) => (
                                <option key={strain} value={strain}>
                                    {strain}
                                </option>
                            ))}
                        </StrainSelect>
                    ) : (
                        <StrainText>{selectedStrain}</StrainText>
                    )}
                </StrainSelectorContainer>
            </SingleCellExpressionsHeader>
            <UmapPlot
                data={umapCoordinates}
                colorValues={colorValues}
                transformMode={transformMode}
                aggregationMode={aggregationMode}
                onTransformModeChange={setTransformMode}
                onAggregationModeChange={setAggregationMode}
                showControls={true}
                geneExpressionData={geneExpressionData}
                isCapped={isCapped}
                maxGenesToShow={MAX_GENES_TO_SHOW}
                totalGenesSelected={selectedGenes.length}
                fixedBounds={referenceBounds}
                ref={chartRef}
            />
        </SingleCellExpressionsContainer>
    );
};

export default connector(SingleCellExpressions);
