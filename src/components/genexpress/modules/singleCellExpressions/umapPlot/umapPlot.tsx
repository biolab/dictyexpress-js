import { ReactElement, useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import {
    ScatterPlotContainer,
    CappedWarning,
    ControlsContainer,
    ControlButton,
    ZoomDisplay,
    ControlGroup,
    ControlLabel,
    ControlSelect,
    Canvas,
    AxisIndicator,
    Tooltip,
    TooltipHeader,
    TooltipGeneItem,
    TooltipGeneSymbol,
    TimeLegend,
    TimeLegendItems,
    TimeLegendItem,
    TimeLegendDot,
    ExpressionAlphaLegend,
    AlphaLegendTitle,
    AlphaGradientContainer,
    AlphaGradientBar,
    AlphaLabel,
} from './umapPlot.styles';

export interface UmapDataPoint {
    id: string;
    x: number;
    y: number;
    tag: string;
    time: string;
    cell_type: string;
}

interface ViewTransform {
    scale: number;
    offsetX: number;
    offsetY: number;
}

export interface UmapPlotHandle {
    getCanvas: () => HTMLCanvasElement | null;
    exportAsPNG: () => string | null;
}

interface ScatterPlotPoint extends UmapDataPoint {
    screenX: number;
    screenY: number;
}

type ColorValues = Record<string, number> | Float32Array | undefined;

// Helpers for color and drawing
const ZERO_COLOR = '#e8e8e8';
const TIME_COLORS = [
    '#e55b33', '#f39446', '#ece852', '#63be68', '#47b19f', '#2c7eb3',
];

const CELL_TYPE_COLORS = [
    '#e45a31', '#2f7db1',
];

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const genesColor = (t: number) => {
    const tt = clamp01(t);
    const start = hexToRgb('#e8e8e8');
    const mid = hexToRgb('#4a688d');
    const end = hexToRgb('#375068');
    if (tt <= 0.8) {
        const k = tt / 0.8;
        return `rgb(${Math.round(lerp(start.r, mid.r, k))}, ${Math.round(lerp(start.g, mid.g, k))}, ${Math.round(lerp(start.b, mid.b, k))})`;
    }
    const k = (tt - 0.8) / 0.2;
    return `rgb(${Math.round(lerp(mid.r, end.r, k))}, ${Math.round(lerp(mid.g, end.g, k))}, ${Math.round(lerp(mid.b, end.b, k))})`;
};

const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
};

// Color cache builders
const computeLegendMax = (
    values: ColorValues,
    nCells: number
): number => {
    let max = 0;

    if (values instanceof Float32Array) {
        for (let i = 0; i < values.length; i++) {
            const v = values[i];
            if (isFinite(v) && v > max) max = v;
        }
    } else if (values) {
        for (const key in values) {
            const v = values[key];
            if (typeof v === 'number' && isFinite(v) && v > max) max = v;
        }
    }

    return max > 0 ? max : 1;
};

const buildColorCache = (
    values: ColorValues,
    nCells: number,
    legendMax: number
): string[] => {
    const cache: string[] = new Array(nCells);

    if (values instanceof Float32Array) {
        for (let i = 0; i < nCells; i++) {
            const val = values[i] || 0;
            const t = val / legendMax;
            cache[i] = val <= 0 ? ZERO_COLOR : genesColor(t);
        }
    } else if (values) {
        for (let i = 0; i < nCells; i++) {
            const val = values[i.toString()] || 0;
            const t = val / legendMax;
            cache[i] = val <= 0 ? ZERO_COLOR : genesColor(t);
        }
    } else {
        cache.fill(ZERO_COLOR);
    }

    return cache;
};

const buildTimeColorCache = (data: UmapDataPoint[]): string[] => {
    const cache: string[] = new Array(data.length);

    // Get unique time values and sort them, filter out nulls
    const uniqueTimes = Array.from(new Set(data.map(d => d.time).filter(t => t != null))).sort();
    const timeToColor = new Map<string, string>();

    uniqueTimes.forEach((time, idx) => {
        timeToColor.set(time, TIME_COLORS[idx % TIME_COLORS.length]);
    });

    for (let i = 0; i < data.length; i++) {
        const time = data[i].time;
        cache[i] = (time != null) ? (timeToColor.get(time) || ZERO_COLOR) : ZERO_COLOR;
    }

    return cache;
};

const buildCellTypeColorCache = (data: UmapDataPoint[]): string[] => {
    const cache: string[] = new Array(data.length);

    // Get unique cell types and sort them, filter out nulls
    const uniqueCellTypes = Array.from(new Set(data.map(d => d.cell_type).filter(t => t != null))).sort();
    const cellTypeToColor = new Map<string, string>();

    uniqueCellTypes.forEach((cellType, idx) => {
        cellTypeToColor.set(cellType, CELL_TYPE_COLORS[idx % CELL_TYPE_COLORS.length]);
    });

    for (let i = 0; i < data.length; i++) {
        const cellType = data[i].cell_type;
        cache[i] = (cellType != null) ? (cellTypeToColor.get(cellType) || ZERO_COLOR) : ZERO_COLOR;
    }

    return cache;
};

const drawCircle = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
};

const renderPoints = (
    ctx: CanvasRenderingContext2D,
    points: ScatterPlotPoint[],
    colorCache: string[],
    getValue: (idx: number) => number,
    radius: number,
    defaultColor: string,
    alphaValues?: Float32Array | Record<string, number>,
    alphaMax?: number,
    expressionsActive: boolean = false
) => {
    const zero: ScatterPlotPoint[] = [];
    const nonZero: { p: ScatterPlotPoint; v: number }[] = [];

    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const idx = parseInt(p.id);
        const c = colorCache[idx] ?? defaultColor;
        if (c === ZERO_COLOR) {
            zero.push(p);
        } else {
            nonZero.push({ p, v: getValue(idx) });
        }
    }

    nonZero.sort((a, b) => a.v - b.v);

    // Draw zero-colored points (always full opacity for background cells)
    ctx.fillStyle = ZERO_COLOR;
    ctx.globalAlpha = 0.6;
    for (const p of zero) drawCircle(ctx, p.screenX, p.screenY, radius);

    // Draw non-zero points with alpha based on expression if provided
    for (const { p } of nonZero) {
        const idx = parseInt(p.id);
        ctx.fillStyle = colorCache[idx] ?? defaultColor;
        
        // Set alpha based on expression values if provided
        if (alphaValues && alphaMax && alphaMax > 0) {
            let exprValue = 0;
            if (alphaValues instanceof Float32Array) {
                exprValue = alphaValues[idx] || 0;
            } else {
                exprValue = alphaValues[idx.toString()] || 0;
            }
            // Map expression to alpha range [0.1, 1.0] - minimum 0.1 to keep points visible
            const normalizedExpr = Math.min(exprValue / alphaMax, 1.0);
            ctx.globalAlpha = Math.max(0.1, normalizedExpr);
        } else {
            ctx.globalAlpha = expressionsActive ? 0.12 : 0.6;
        }
        
        drawCircle(ctx, p.screenX, p.screenY, radius);
    }
    
    ctx.globalAlpha = 1.0;
};

interface GeneExpressionData {
    geneName: string;
    geneSymbol: string;
    expression: Float32Array;
}

const renderTooltip = (
    hoveredPoint: ScatterPlotPoint,
    geneExpressionData: GeneExpressionData[],
    colorValues: ColorValues,
    dimensions: { width: number; height: number }
): ReactElement => {
    const cellId = parseInt(hoveredPoint.id);
    const totalGenes = geneExpressionData.length;
    const showTop = 5;

    let displayGenes: Array<{ name: string; symbol: string; value: number }> = [];
    let hasMore = false;

    if (totalGenes > 0) {
        // Separate expressed and non-expressed genes
        const expressed: Array<{ name: string; symbol: string; value: number }> = [];
        const zeros: Array<{ name: string; symbol: string; value: number }> = [];

        for (const geneData of geneExpressionData) {
            const value = geneData.expression[cellId] || 0;
            const gene = { name: geneData.geneName, symbol: geneData.geneSymbol, value };
            if (value > 0) expressed.push(gene);
            else zeros.push(gene);
        }

        // Sort: expressed by value desc, zeros by symbol alphabetically
        expressed.sort((a, b) => b.value - a.value);
        zeros.sort((a, b) => a.symbol.localeCompare(b.symbol));

        // Take top 5: expressed first, then fill with zeros
        displayGenes = [...expressed, ...zeros].slice(0, showTop);
        hasMore = totalGenes > showTop;
    }

    // Check if tooltip would overflow on the right side (approximate width check)
    const estimatedTooltipWidth = 250;
    const isNearRightEdge = hoveredPoint.screenX + estimatedTooltipWidth + 10 > dimensions.width;

    return (
        <Tooltip
            style={{
                left: hoveredPoint.screenX + 10,
                top: hoveredPoint.screenY - 30,
                transform: isNearRightEdge ? 'translateX(calc(-100% - 20px))' : 'none',
            }}
        >
            <TooltipHeader>Cell: {hoveredPoint.tag}</TooltipHeader>
            <div style={{ fontSize: '11px', marginBottom: '4px', color: '#ccc' }}>
                Time: {hoveredPoint.time ?? 'N/A'} {hoveredPoint.cell_type ? `| Type: ${hoveredPoint.cell_type}` : ''}
            </div>
            {displayGenes.length > 0 ? (
                <div>
                    {displayGenes.map((gene, idx) => (
                        <TooltipGeneItem key={`${gene.symbol}-${idx}`}>
                            <TooltipGeneSymbol>{gene.symbol}</TooltipGeneSymbol>: {gene.value.toFixed(3)}
                        </TooltipGeneItem>
                    ))}
                    {hasMore && <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>...</div>}
                </div>
            ) : colorValues ? (
                <div>
                    Aggregated Expression:{' '}
                    {colorValues instanceof Float32Array
                        ? colorValues[cellId]?.toFixed(3) ?? '0.000'
                        : colorValues[hoveredPoint.id]?.toFixed(3) ?? '0.000'}
                </div>
            ) : null}
        </Tooltip>
    );
};

interface UmapPlotProps {
    data: UmapDataPoint[];
    colorValues?: ColorValues;
    transformMode?: 'linear' | 'log2' | 'log1p';
    aggregationMode?: 'average' | 'sum' | 'min' | 'max';
    onTransformModeChange?: (mode: 'linear' | 'log2' | 'log1p') => void;
    onAggregationModeChange?: (mode: 'average' | 'sum' | 'min' | 'max') => void;
    showControls?: boolean;
    geneExpressionData?: GeneExpressionData[];
    isCapped?: boolean;
    maxGenesToShow?: number;
    totalGenesSelected?: number;
    fixedBounds?: { minX: number; maxX: number; minY: number; maxY: number } | null;
}

const UmapPlot = forwardRef<UmapPlotHandle, UmapPlotProps>(
    (
        {
            data,
            colorValues,
            transformMode = 'log2',
            aggregationMode = 'average',
            onTransformModeChange,
            onAggregationModeChange,
            showControls = true,
            geneExpressionData = [],
            isCapped = false,
            maxGenesToShow = 500,
            totalGenesSelected = 0,
            fixedBounds = null,
        },
        ref
    ): ReactElement => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const spatialIndexRef = useRef<ScatterPlotPoint[]>([]);
        const colorCacheRef = useRef<string[]>([]);
        const legendMaxRef = useRef<number>(1);
        const hoveredPointRef = useRef<ScatterPlotPoint | null>(null);

        const [isHovering, setIsHovering] = useState(false);
        const [hoveredPoint, setHoveredPoint] = useState<ScatterPlotPoint | null>(null);
        const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
        const [isDragging, setIsDragging] = useState(false);
        const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
        const [lastTransform, setLastTransform] = useState<ViewTransform>({
            scale: 1,
            offsetX: 0,
            offsetY: 0,
        });
        const transformRef = useRef<ViewTransform>({ scale: 1, offsetX: 0, offsetY: 0 });
        const wheelAccumRef = useRef(0);
        const wheelRafRef = useRef<number | null>(null);
        const hoverRafRef = useRef<number | null>(null);
        const devicePixelRatio = window.devicePixelRatio || 1;
        const [zoomDisplay, setZoomDisplay] = useState(100);
        const [expressionMax, setExpressionMax] = useState(1);
        const [colorModeOverride, setColorModeOverride] = useState<'time' | 'cell_type' | null>(null);
        const [timeLegendItems, setTimeLegendItems] = useState<Array<{ time: string; color: string }>>([]);
        const [cellTypeLegendItems, setCellTypeLegendItems] = useState<Array<{ cellType: string; color: string }>>([]);
        
        // Color mode is either time or cell_type (no longer expression)
        const colorMode = colorModeOverride || 'time';

        useEffect(() => {
            const container = containerRef.current;
            if (!container) return;

            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const { width, height } = entry.contentRect;
                    setDimensions({ width: Math.max(200, width), height: Math.max(200, height) });
                }
            });

            resizeObserver.observe(container);
            const rect = container.getBoundingClientRect();
            setDimensions({ width: Math.max(200, rect.width), height: Math.max(200, rect.height) });

            return () => resizeObserver.disconnect();
        }, []);

        useEffect(() => {
            const container = containerRef.current;
            if (!container) return;

            const handleNativeWheel = (event: WheelEvent) => {
                event.preventDefault();
            };

            container.addEventListener('wheel', handleNativeWheel, {
                passive: false,
                capture: true,
            });

            return () =>
                container.removeEventListener('wheel', handleNativeWheel, { capture: true } as any);
        }, []);

        useImperativeHandle(ref, () => ({
            getCanvas: () => canvasRef.current,
            exportAsPNG: () =>
                canvasRef.current ? canvasRef.current.toDataURL('image/png') : null,
        }));

        const setupCanvas = useCallback(
            (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
                const targetWidth = Math.round(dimensions.width * devicePixelRatio);
                const targetHeight = Math.round(dimensions.height * devicePixelRatio);

                if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;
                }

                const styleWidth = `${dimensions.width}px`;
                const styleHeight = `${dimensions.height}px`;

                if (canvas.style.width !== styleWidth) {
                    canvas.style.width = styleWidth;
                }
                if (canvas.style.height !== styleHeight) {
                    canvas.style.height = styleHeight;
                }

                ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
            },
            [dimensions.width, dimensions.height, devicePixelRatio]
        );

        const calculateScreenCoordinates = useCallback(
            (points: UmapDataPoint[]): ScatterPlotPoint[] => {
                if (points.length === 0) return [];

                let minX, maxX, minY, maxY;

                if (fixedBounds) {
                    // Use fixed bounds from default strain
                    ({ minX, maxX, minY, maxY } = fixedBounds);
                } else {
                    // Calculate bounds from current data
                    minX = points[0].x;
                    maxX = points[0].x;
                    minY = points[0].y;
                    maxY = points[0].y;
                    for (const p of points) {
                        minX = Math.min(minX, p.x);
                        maxX = Math.max(maxX, p.x);
                        minY = Math.min(minY, p.y);
                        maxY = Math.max(maxY, p.y);
                    }
                }

                const padding = 40;
                const plotWidth = dimensions.width - 2 * padding;
                const plotHeight = dimensions.height - 2 * padding;
                const xScale = plotWidth / (maxX - minX);
                const yScale = plotHeight / (maxY - minY);

                const mapped = points.map((point) => {
                    const baseX = padding + (point.x - minX) * xScale;
                    const baseY = dimensions.height - padding - (point.y - minY) * yScale;
                    return {
                        ...point,
                        screenX:
                            (baseX - dimensions.width / 2) * transformRef.current.scale +
                            dimensions.width / 2 +
                            transformRef.current.offsetX,
                        screenY:
                            (baseY - dimensions.height / 2) * transformRef.current.scale +
                            dimensions.height / 2 +
                            transformRef.current.offsetY,
                    };
                });

                spatialIndexRef.current = mapped;
                setZoomDisplay(Math.round(transformRef.current.scale * 100));
                return mapped;
            },
            [dimensions.width, dimensions.height, fixedBounds]
        );

        useEffect(() => {
            if (colorMode === 'time') {
                colorCacheRef.current = buildTimeColorCache(data);
            } else if (colorMode === 'cell_type') {
                colorCacheRef.current = buildCellTypeColorCache(data);
            }
            
            // Always compute expression max for alpha values when genes are selected
            if (colorValues) {
                const nCells = data.length;
                const effectiveMax = computeLegendMax(colorValues, nCells);
                legendMaxRef.current = effectiveMax;
                setExpressionMax(effectiveMax);
            }
        }, [colorValues, data, colorMode]);

        useEffect(() => {
            if (colorMode === 'time' && data.length > 0) {
                const uniqueTimes = Array.from(new Set(data.map(d => d.time).filter(t => t != null))).sort();
                const items = uniqueTimes.map((time, idx) => ({
                    time,
                    color: TIME_COLORS[idx % TIME_COLORS.length],
                }));
                setTimeLegendItems(items);
            }
        }, [data, colorMode]);

        useEffect(() => {
            if (colorMode === 'cell_type' && data.length > 0) {
                const uniqueCellTypes = Array.from(new Set(data.map(d => d.cell_type).filter(t => t != null))).sort();
                const items = uniqueCellTypes.map((cellType, idx) => ({
                    cellType,
                    color: CELL_TYPE_COLORS[idx % CELL_TYPE_COLORS.length],
                }));
                setCellTypeLegendItems(items);
            }
        }, [data, colorMode]);


        const render = useCallback(
            (points: ScatterPlotPoint[]) => {
                const canvas = canvasRef.current;
                if (!canvas) return;

                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                setupCanvas(canvas, ctx);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, dimensions.width, dimensions.height);

                const normalRadius = 1.5;
                const defaultColor = ZERO_COLOR;

                const getValue = (idx: number): number => {
                    if (colorValues instanceof Float32Array) {
                        return colorValues[idx] || 0;
                    } else if (colorValues) {
                        return colorValues[idx.toString()] || 0;
                    }
                    return 0;
                };

                // Pass expression values for alpha if genes are selected
                renderPoints(
                    ctx,
                    points,
                    colorCacheRef.current,
                    getValue,
                    normalRadius,
                    defaultColor,
                    colorValues,
                    legendMaxRef.current,
                    totalGenesSelected > 0
                );

                if (hoveredPointRef.current) {
                    ctx.globalAlpha = 1.0;
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(
                        hoveredPointRef.current.screenX,
                        hoveredPointRef.current.screenY,
                        normalRadius + 2,
                        0,
                        2 * Math.PI
                    );
                    ctx.stroke();
                }

                ctx.globalAlpha = 1.0;
            },
            [dimensions.width, dimensions.height, setupCanvas, colorValues, totalGenesSelected]
        );

        const getMouseCoordinates = useCallback(
            (event: React.MouseEvent<HTMLCanvasElement> | React.WheelEvent<HTMLCanvasElement>) => {
                const canvas = canvasRef.current;
                if (!canvas) return { x: 0, y: 0 };
                const rect = canvas.getBoundingClientRect();
                return { x: event.clientX - rect.left, y: event.clientY - rect.top };
            },
            []
        );

        const handleMouseDown = useCallback(
            (event: React.MouseEvent<HTMLCanvasElement>) => {
                event.preventDefault();
                event.stopPropagation();
                const coords = getMouseCoordinates(event);
                setIsDragging(true);
                setDragStart(coords);
                setLastTransform(transformRef.current);
                hoveredPointRef.current = null;
                setHoveredPoint(null);
                setIsHovering(false);
                document.body.style.userSelect = 'none';
            },
            [getMouseCoordinates]
        );

        const handleMouseMove = useCallback(
            (event: React.MouseEvent<HTMLCanvasElement>) => {
                const coords = getMouseCoordinates(event);

                if (isDragging) {
                    event.preventDefault();
                    event.stopPropagation();
                    hoveredPointRef.current = null;
                    setHoveredPoint(null);
                    setIsHovering(false);
                    const deltaX = coords.x - dragStart.x;
                    const deltaY = coords.y - dragStart.y;
                    transformRef.current = {
                        ...lastTransform,
                        offsetX: lastTransform.offsetX + deltaX,
                        offsetY: lastTransform.offsetY + deltaY,
                    };
                    const screenPoints = calculateScreenCoordinates(data);
                    render(screenPoints);
                } else if (spatialIndexRef.current) {
                    // Throttle hover detection with RAF
                    if (hoverRafRef.current !== null) return;

                    hoverRafRef.current = window.requestAnimationFrame(() => {
                        hoverRafRef.current = null;

                        // hover detect: find nearest within radius
                        const R = 6;
                        let closest: ScatterPlotPoint | null = null;
                        let best = R * R;
                        const pts: ScatterPlotPoint[] = spatialIndexRef.current;

                        for (let i = 0; i < pts.length; i++) {
                            const p = pts[i];
                            const dx = p.screenX - coords.x;
                            const dy = p.screenY - coords.y;
                            const d2 = dx * dx + dy * dy;
                            if (d2 <= best) {
                                best = d2;
                                closest = p;
                            }
                        }

                        // Only re-render if hovered point changed
                        if (hoveredPointRef.current?.id !== closest?.id) {
                            hoveredPointRef.current = closest;
                            setHoveredPoint(closest);
                            setIsHovering(closest != null);
                            render(pts);
                        }
                    });
                }
            },
            [isDragging, dragStart, lastTransform, getMouseCoordinates, calculateScreenCoordinates, data, render]
        );

        const handleMouseUp = useCallback(() => {
            setIsDragging(false);
            hoveredPointRef.current = null;
            setHoveredPoint(null);
            setIsHovering(false);
            document.body.style.userSelect = '';
        }, []);

        const handleDoubleClick = useCallback(() => {
            // Reset zoom and pan
            transformRef.current = { scale: 1, offsetX: 0, offsetY: 0 };
            const screenPoints = calculateScreenCoordinates(data);
            render(screenPoints);
        }, [calculateScreenCoordinates, data, render]);

        const handleMouseLeave = useCallback(() => {
            if (hoverRafRef.current !== null) {
                window.cancelAnimationFrame(hoverRafRef.current);
                hoverRafRef.current = null;
            }
            hoveredPointRef.current = null;
            setHoveredPoint(null);
            setIsHovering(false);
            setIsDragging(false);
            document.body.style.userSelect = '';
        }, []);

        const handleWheel = useCallback(
            (event: React.WheelEvent<HTMLDivElement> | React.WheelEvent<HTMLCanvasElement>) => {
                const coords = getMouseCoordinates(event as any);
                wheelAccumRef.current += event.deltaY;

                if (wheelRafRef.current != null) return;

                wheelRafRef.current = window.requestAnimationFrame(() => {
                    const baseScale = transformRef.current.scale;
                    const k = 0.0015;
                    const ratio = Math.exp(-wheelAccumRef.current * k);
                    const newScale = baseScale * ratio;
                    wheelAccumRef.current = 0;
                    wheelRafRef.current = null;

                    if (newScale !== transformRef.current.scale) {
                        const scaleRatio = newScale / transformRef.current.scale;
                        const centerX = dimensions.width / 2;
                        const centerY = dimensions.height / 2;
                        const newOffsetX =
                            (coords.x - centerX) * (1 - scaleRatio) +
                            transformRef.current.offsetX * scaleRatio;
                        const newOffsetY =
                            (coords.y - centerY) * (1 - scaleRatio) +
                            transformRef.current.offsetY * scaleRatio;
                        transformRef.current = {
                            scale: newScale,
                            offsetX: newOffsetX,
                            offsetY: newOffsetY,
                        };
                        const screenPoints = calculateScreenCoordinates(data);
                        render(screenPoints);
                    }
                });
            },
            [getMouseCoordinates, calculateScreenCoordinates, data, render, dimensions.width, dimensions.height]
        );

        useEffect(() => {
            const screenPoints = calculateScreenCoordinates(data);
            render(screenPoints);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [data, colorValues, colorMode, dimensions.width, dimensions.height]);

        return (
            <ScatterPlotContainer ref={containerRef} onWheel={handleWheel}>
                {isCapped && (
                    <CappedWarning>
                        Showing first {maxGenesToShow} genes of {totalGenesSelected} selected.
                    </CappedWarning>
                )}

                {showControls && (
                    <ControlsContainer>
                        <ControlButton onClick={handleDoubleClick} title="Reset zoom and pan (or double-click)">
                            Reset View
                        </ControlButton>
                        <ZoomDisplay>Zoom: {zoomDisplay}%</ZoomDisplay>
                        <ControlGroup>
                            <ControlLabel>Color by:</ControlLabel>
                            <ControlSelect
                                value={colorMode}
                                onChange={(e) => setColorModeOverride(e.target.value as 'time' | 'cell_type')}
                            >
                                <option value="time">Time</option>
                                <option value="cell_type">Cell Type</option>
                            </ControlSelect>
                        </ControlGroup>
                        {totalGenesSelected > 0 && (
                            <ControlGroup>
                                <ControlLabel>Expression Transform:</ControlLabel>
                                <ControlSelect
                                    value={transformMode}
                                    onChange={(e) =>
                                        onTransformModeChange?.(e.target.value as 'linear' | 'log2' | 'log1p')
                                    }
                                >
                                    <option value="linear">Linear</option>
                                    <option value="log2">Log2</option>
                                    <option value="log1p">Log1p</option>
                                </ControlSelect>
                            </ControlGroup>
                        )}
                        {totalGenesSelected > 1 && (
                            <ControlGroup>
                                <ControlLabel>Expression Aggregation:</ControlLabel>
                                <ControlSelect
                                    value={aggregationMode}
                                    onChange={(e) =>
                                        onAggregationModeChange?.(
                                            e.target.value as 'average' | 'sum' | 'min' | 'max'
                                        )
                                    }
                                >
                                    <option value="average">Average</option>
                                    <option value="sum">Sum</option>
                                    <option value="min">Min</option>
                                    <option value="max">Max</option>
                                </ControlSelect>
                            </ControlGroup>
                        )}
                    </ControlsContainer>
                )}

                <Canvas
                    ref={canvasRef}
                    $isDragging={isDragging}
                    $isHovering={isHovering}
                    style={{
                        width: `${dimensions.width}px`,
                        height: `${dimensions.height}px`,
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onDoubleClick={handleDoubleClick}
                    onWheel={handleWheel}
                />

                {totalGenesSelected > 0 && (
                    <ExpressionAlphaLegend>
                        <AlphaLegendTitle>Expression</AlphaLegendTitle>
                        <AlphaGradientContainer>
                            <AlphaLabel>0</AlphaLabel>
                            <AlphaGradientBar />
                            <AlphaLabel>{expressionMax.toFixed(2)}</AlphaLabel>
                        </AlphaGradientContainer>
                    </ExpressionAlphaLegend>
                )}

                {colorMode === 'time' && timeLegendItems.length > 0 && (
                    <TimeLegend>
                        <TimeLegendItems>
                            {timeLegendItems.map((item) => (
                                <TimeLegendItem key={item.time}>
                                    <TimeLegendDot $color={item.color} />
                                    <span>{item.time}</span>
                                </TimeLegendItem>
                            ))}
                        </TimeLegendItems>
                    </TimeLegend>
                )}

                {colorMode === 'cell_type' && cellTypeLegendItems.length > 0 && (
                    <TimeLegend>
                        <TimeLegendItems>
                            {cellTypeLegendItems.map((item) => (
                                <TimeLegendItem key={item.cellType}>
                                    <TimeLegendDot $color={item.color} />
                                    <span>{item.cellType}</span>
                                </TimeLegendItem>
                            ))}
                        </TimeLegendItems>
                    </TimeLegend>
                )}

                <AxisIndicator style={{ bottom: totalGenesSelected > 0 ? '60px' : '0px' }}>
                    <svg width="52" height="52" viewBox="0 0 52 52">
                        <line x1="12" y1="40" x2="50" y2="40" stroke="#666" strokeWidth="1.5" />
                        <polygon points="46,36 52,40 46,44" fill="#666" />
                        <text
                            x="32"
                            y="50"
                            fontSize="9"
                            textAnchor="middle"
                            fill="#666"
                            fontWeight="600"
                        >
                            UMAP1
                        </text>
                        <line x1="12" y1="40" x2="12" y2="2" stroke="#666" strokeWidth="1.5" />
                        <polygon points="8,6 12,0 16,6" fill="#666" />
                        <text
                            x="-10"
                            y="4"
                            fontSize="9"
                            fill="#666"
                            fontWeight="600"
                            transform="translate(4,24) rotate(-90)"
                        >
                            UMAP2
                        </text>
                    </svg>
                </AxisIndicator>

                {hoveredPoint && renderTooltip(hoveredPoint, geneExpressionData, colorValues, dimensions)}
            </ScatterPlotContainer>
        );
    }
);

UmapPlot.displayName = 'UmapPlot';

export default UmapPlot;

