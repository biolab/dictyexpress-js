import {
    ReactElement,
    ReactNode,
    useRef,
    useEffect,
    useCallback,
    useState,
    forwardRef,
    useImperativeHandle,
    useMemo,
} from 'react';
import { SvgIcon, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { PanToolOutlined } from '@mui/icons-material';
import { Handler as VegaTooltipHandler } from 'vega-tooltip';
import {
    ScatterPlotContainer,
    SelectionTools,
    ZoomHint,
    Canvas,
    AxisIndicator,
    TimeLegend,
    TimeLegendTitle,
    TimeLegendItems,
    TimeLegendItem,
    TimeLegendDot,
    LegendItemButton,
    ExpressionAlphaLegend,
    AlphaLegendTitle,
    AlphaGradientContainer,
    AlphaGradientBar,
    AlphaLabel,
} from './umapPlot.styles';
import { GEN_GREY, GEN_ORANGE } from 'components/genexpress/common/theming/theming';

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

type TooltipPointer = {
    clientX: number;
    clientY: number;
};

type LassoPoint = { x: number; y: number };
// The outline being drawn; `add` keeps the current selection and adds the outlined cells.
// `selectTool` and `shiftKey` are kept for a press released without moving: with the select
// tool that is a click on a cell.
type Lasso = { points: LassoPoint[]; add: boolean; selectTool: boolean; shiftKey: boolean };
type SelectionTool = 'pan' | 'select';

// Skip mouse moves shorter than this (px), so the outline doesn't grow a vertex per pixel.
const MIN_LASSO_STEP = 2;
// A cell is hovered or clicked when the pointer is within this distance (px) of it.
const POINTER_RADIUS = 6;

// Helpers for color and drawing
const ZERO_COLOR = '#e8e8e8';
const TIME_COLORS = ['#e55b33', '#f39446', '#ece852', '#63be68', '#47b19f', '#2c7eb3'];

const CELL_TYPE_COLORS = ['#e45a31', '#2f7db1'];

const MAX_TOOLTIP_GENES = 5;

// Selected cells get an orange glow (outer, inner halo) and keep their own color, so the
// other cells stay readable around them.
const SELECTION_GLOW = [
    { extraRadius: 4, alpha: 0.18 },
    { extraRadius: 2, alpha: 0.45 },
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
const computeLegendMax = (values: ColorValues, _nCells: number): number => {
    const allValues: number[] = [];

    if (values instanceof Float32Array) {
        for (let i = 0; i < values.length; i++) {
            const v = values[i];
            if (isFinite(v) && v > 0) allValues.push(v);
        }
    } else if (values) {
        for (const key in values) {
            const v = values[key];
            if (typeof v === 'number' && isFinite(v) && v > 0) allValues.push(v);
        }
    }

    if (allValues.length === 0) return 1;

    // Use 99th percentile to avoid outliers making everything too faint
    allValues.sort((a, b) => a - b);
    const p99Index = Math.floor(allValues.length * 0.99);
    return allValues[p99Index];
};

const buildColorCache = (values: ColorValues, nCells: number, legendMax: number): string[] => {
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
    const uniqueTimes = Array.from(
        new Set(data.map((d) => d.time).filter((t) => t != null)),
    ).sort();
    const timeToColor = new Map<string, string>();

    uniqueTimes.forEach((time, idx) => {
        timeToColor.set(time, TIME_COLORS[idx % TIME_COLORS.length]);
    });

    for (let i = 0; i < data.length; i++) {
        const time = data[i].time;
        cache[i] = time != null ? timeToColor.get(time) || ZERO_COLOR : ZERO_COLOR;
    }

    return cache;
};

const buildCellTypeColorCache = (data: UmapDataPoint[]): string[] => {
    const cache: string[] = new Array(data.length);

    // Get unique cell types and sort them, filter out nulls
    const uniqueCellTypes = Array.from(
        new Set(data.map((d) => d.cell_type).filter((t) => t != null)),
    ).sort();
    const cellTypeToColor = new Map<string, string>();

    uniqueCellTypes.forEach((cellType, idx) => {
        cellTypeToColor.set(cellType, CELL_TYPE_COLORS[idx % CELL_TYPE_COLORS.length]);
    });

    for (let i = 0; i < data.length; i++) {
        const cellType = data[i].cell_type;
        cache[i] = cellType != null ? cellTypeToColor.get(cellType) || ZERO_COLOR : ZERO_COLOR;
    }

    return cache;
};

/** Whether a point lies inside a closed outline (ray casting, even-odd rule). */
export const isPointInPolygon = (x: number, y: number, polygon: LassoPoint[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i];
        const b = polygon[j];
        if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
            inside = !inside;
        }
    }
    return inside;
};

/**
 * Ids of the cells drawn inside a lasso outline, or null when the outline has no area (a
 * click or a straight stroke).
 */
const getCellsInLasso = (points: ScatterPlotPoint[], polygon: LassoPoint[]): number[] | null => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const { x, y } of polygon) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }
    if (polygon.length < 3 || minX === maxX || minY === maxY) {
        return null;
    }
    const selected: number[] = [];
    for (const p of points) {
        if (
            p.screenX >= minX &&
            p.screenX <= maxX &&
            p.screenY >= minY &&
            p.screenY <= maxY &&
            isPointInPolygon(p.screenX, p.screenY, polygon)
        ) {
            selected.push(parseInt(p.id));
        }
    }
    return selected;
};

/** The cell drawn nearest to a position, within the pointer radius. */
const findCellAt = (points: ScatterPlotPoint[], x: number, y: number): ScatterPlotPoint | null => {
    let closest: ScatterPlotPoint | null = null;
    let best = POINTER_RADIUS * POINTER_RADIUS;
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const dx = p.screenX - x;
        const dy = p.screenY - y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= best) {
            best = d2;
            closest = p;
        }
    }
    return closest;
};

const LassoIcon = (): ReactElement => (
    <SvgIcon fontSize="inherit" viewBox="0 0 24 24">
        <ellipse
            cx="12"
            cy="9.5"
            rx="9"
            ry="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeDasharray="3.2 2.2"
        />
        <path
            d="M7.5 14.8c-1.6 1.2-1.4 3.2.4 3.6 1.6.3 2.3 1.6 1.4 3.3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
        />
    </SvgIcon>
);

const drawCircle = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
};

/**
 * Selection after clicking a legend entry: its group's cells, or with `add` the current
 * selection plus the group (minus the group, if it was all selected already).
 */
export const selectGroup = (
    groupCells: number[],
    current: Set<number> | undefined,
    add: boolean,
): number[] => {
    if (!add || current == null) {
        return groupCells;
    }
    const group = new Set(groupCells);
    if (groupCells.every((id) => current.has(id))) {
        return Array.from(current).filter((id) => !group.has(id));
    }
    return Array.from(current).concat(groupCells.filter((id) => !current.has(id)));
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
    _expressionsActive: boolean = false,
    useAlpha: boolean = true,
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

        // Set alpha based on expression values if provided and useAlpha is enabled
        if (useAlpha && alphaValues && alphaMax && alphaMax > 0) {
            let exprValue = 0;
            if (alphaValues instanceof Float32Array) {
                exprValue = alphaValues[idx] || 0;
            } else {
                exprValue = alphaValues[idx.toString()] || 0;
            }
            // Map expression to alpha range [0.01, 1.0] - minimum 0.01 to keep points visible
            const normalizedExpr = Math.min(exprValue / alphaMax, 1.0);
            ctx.globalAlpha = Math.max(0.01, normalizedExpr);
        } else {
            // When opacity toggle is off or no expression data, use standard opacity
            ctx.globalAlpha = 0.6;
        }

        drawCircle(ctx, p.screenX, p.screenY, radius);
    }

    ctx.globalAlpha = 1.0;
};

export interface GeneExpressionData {
    geneName: string;
    geneSymbol: string;
    expression: Float32Array;
}

interface UmapPlotProps {
    data: UmapDataPoint[];
    colorValues?: ColorValues;
    colorMode?: 'time' | 'cell_type' | 'expression';
    transformMode?: 'linear' | 'log2' | 'log1p';
    aggregationMode?: 'average' | 'sum' | 'min' | 'max';
    showLegend?: boolean;
    useAlpha?: boolean;
    geneExpressionData?: GeneExpressionData[];
    totalGenesSelected?: number;
    fixedBounds?: { minX: number; maxX: number; minY: number; maxY: number } | null;
    selectedCellIds?: Set<number>;
    onSelectionChange?: (cellIds: number[]) => void;
    // Overlays drawn over the plot, like the cell selection panel.
    children?: ReactNode;
}

const UmapPlot = forwardRef<UmapPlotHandle, UmapPlotProps>(
    (
        {
            data,
            colorValues,
            colorMode: colorModeProp = 'time',
            transformMode: _transformMode = 'log2',
            aggregationMode: _aggregationMode = 'average',
            showLegend = true,
            useAlpha = true,
            geneExpressionData = [],
            totalGenesSelected = 0,
            fixedBounds = null,
            selectedCellIds,
            onSelectionChange,
            children,
        },
        ref,
    ): ReactElement => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const spatialIndexRef = useRef<ScatterPlotPoint[]>([]);
        const colorCacheRef = useRef<string[]>([]);
        const legendMaxRef = useRef<number>(1);
        const hoveredPointRef = useRef<ScatterPlotPoint | null>(null);
        const tooltipHandlerRef = useRef<VegaTooltipHandler | null>(null);
        const pointerEventRef = useRef<TooltipPointer | null>(null);

        const hideTooltip = useCallback(() => {
            if (!tooltipHandlerRef.current) return;
            const pointer = pointerEventRef.current ?? { clientX: 0, clientY: 0 };
            tooltipHandlerRef.current.call(
                null,
                pointer as unknown as MouseEvent,
                { datum: null } as unknown as { datum: null },
                null,
            );
            pointerEventRef.current = null;
        }, []);

        useEffect(() => {
            tooltipHandlerRef.current = new VegaTooltipHandler({
                offsetX: 10,
                offsetY: 10,
                theme: 'light',
                formatTooltip: (value: Record<string, string>) => {
                    const keys = Object.keys(value);
                    const hasGenes = keys.some(
                        (k) => !['Cell', 'Time', 'Type', 'Expression'].includes(k),
                    );
                    return (
                        '<table>' +
                        keys
                            .map((k, i) => {
                                const needsSep =
                                    i > 0 &&
                                    (keys[i - 1] === 'Cell' ||
                                        (keys[i - 1] === 'Type' && hasGenes));
                                const sepStyle = needsSep
                                    ? ' style="border-top:1px solid rgba(0,0,0,0.12);padding-top:4px"'
                                    : '';
                                return `<tr><td class="key"${sepStyle}>${k}</td><td class="value"${sepStyle}>${value[k]}</td></tr>`;
                            })
                            .join('') +
                        '</table>'
                    );
                },
            });
            return () => hideTooltip();
        }, [hideTooltip]);

        const showTooltip = useCallback(
            (point: ScatterPlotPoint, pointer: TooltipPointer | null) => {
                if (!tooltipHandlerRef.current || !pointer) return;

                const tooltipValue: Record<string, string> = {
                    Cell: point.tag,
                    Time: point.time ?? 'N/A',
                };

                if (point.cell_type) {
                    tooltipValue.Type = point.cell_type;
                } else {
                    tooltipValue.Type = ' ';
                }

                const cellId = Number.parseInt(point.id, 10);
                const totalGenes = geneExpressionData.length;

                if (totalGenes > 0) {
                    const expressed: Array<{ symbol: string; value: number }> = [];
                    const zeros: Array<{ symbol: string; value: number }> = [];

                    for (const geneData of geneExpressionData) {
                        const value = geneData.expression[cellId] || 0;
                        const entry = { symbol: geneData.geneSymbol, value };
                        if (value > 0) {
                            expressed.push(entry);
                        } else {
                            zeros.push(entry);
                        }
                    }

                    expressed.sort((a, b) => b.value - a.value);
                    zeros.sort((a, b) => a.symbol.localeCompare(b.symbol));

                    const displayGenes = [...expressed, ...zeros].slice(0, MAX_TOOLTIP_GENES);
                    displayGenes.forEach((gene) => {
                        tooltipValue[gene.symbol] = gene.value.toFixed(3);
                    });

                    if (totalGenes > MAX_TOOLTIP_GENES) {
                        tooltipValue[`+ ${totalGenes - MAX_TOOLTIP_GENES} more`] = '';
                    }
                } else if (colorValues) {
                    let aggregated = 0;
                    if (colorValues instanceof Float32Array) {
                        aggregated = colorValues[cellId] ?? 0;
                    } else if (colorValues) {
                        aggregated = Number(colorValues[point.id] ?? 0);
                    }
                    tooltipValue.Expression = aggregated.toFixed(3);
                }

                tooltipHandlerRef.current.call(
                    null,
                    pointer as unknown as MouseEvent,
                    { datum: tooltipValue } as unknown as { datum: Record<string, string> },
                    tooltipValue,
                );
            },
            [geneExpressionData, colorValues],
        );

        const [isHovering, setIsHovering] = useState(false);
        const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
        const [isDragging, setIsDragging] = useState(false);
        const [isBrushing, setIsBrushing] = useState(false);
        const brushRef = useRef<Lasso | null>(null);
        const [tool, setTool] = useState<SelectionTool>('pan');
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
        const zoomHintTimeoutRef = useRef<number | null>(null);
        const devicePixelRatio = window.devicePixelRatio || 1;
        const [expressionMax, setExpressionMax] = useState(1);
        const [timeLegendItems, setTimeLegendItems] = useState<
            Array<{ time: string; color: string }>
        >([]);
        const [cellTypeLegendItems, setCellTypeLegendItems] = useState<
            Array<{ cellType: string; color: string }>
        >([]);
        const [showZoomHint, setShowZoomHint] = useState(false);

        // Cell ids per time point and per cell type, for selecting a group from the legend.
        const groupCells = useMemo(() => {
            const groups = {
                time: new Map<string, number[]>(),
                cell_type: new Map<string, number[]>(),
            };
            for (const point of data) {
                for (const field of ['time', 'cell_type'] as const) {
                    const value = point[field];
                    if (value == null) continue;
                    const ids = groups[field].get(value) ?? [];
                    ids.push(Number(point.id));
                    groups[field].set(value, ids);
                }
            }
            return groups;
        }, [data]);

        const renderLegendItem = (field: 'time' | 'cell_type', value: string, color: string) => {
            const content = (
                <>
                    <TimeLegendDot $color={color} />
                    <span>{value}</span>
                </>
            );
            if (onSelectionChange == null) {
                return <TimeLegendItem key={value}>{content}</TimeLegendItem>;
            }
            const cells = groupCells[field].get(value) ?? [];
            const isSelected =
                selectedCellIds != null &&
                cells.length > 0 &&
                cells.every((id) => selectedCellIds.has(id));
            return (
                <TimeLegendItem key={value}>
                    <LegendItemButton
                        type="button"
                        $isSelected={isSelected}
                        aria-pressed={isSelected}
                        title="Click to select these cells, Shift + click to add or remove them"
                        onClick={(event) =>
                            onSelectionChange(selectGroup(cells, selectedCellIds, event.shiftKey))
                        }
                    >
                        {content}
                    </LegendItemButton>
                </TimeLegendItem>
            );
        };

        // Use the colorMode from props
        const colorMode = colorModeProp;

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
                container.removeEventListener('wheel', handleNativeWheel, {
                    capture: true,
                } as AddEventListenerOptions);
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
            [dimensions.width, dimensions.height, devicePixelRatio],
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
                return mapped;
            },
            [dimensions.width, dimensions.height, fixedBounds],
        );

        useEffect(() => {
            if (colorMode === 'time') {
                colorCacheRef.current = buildTimeColorCache(data);
            } else if (colorMode === 'cell_type') {
                colorCacheRef.current = buildCellTypeColorCache(data);
            } else if (colorMode === 'expression') {
                const nCells = data.length;
                const effectiveMax = computeLegendMax(colorValues, nCells);
                legendMaxRef.current = effectiveMax;
                setExpressionMax(effectiveMax);
                colorCacheRef.current = buildColorCache(colorValues, nCells, effectiveMax);
            }

            // Always compute expression max for alpha values when genes are selected
            if (colorValues && colorMode !== 'expression') {
                const nCells = data.length;
                const effectiveMax = computeLegendMax(colorValues, nCells);
                legendMaxRef.current = effectiveMax;
                setExpressionMax(effectiveMax);
            }
        }, [colorValues, data, colorMode]);

        useEffect(() => {
            if (colorMode === 'time' && data.length > 0) {
                const uniqueTimes = Array.from(
                    new Set(data.map((d) => d.time).filter((t) => t != null)),
                ).sort();
                const items = uniqueTimes.map((time, idx) => ({
                    time,
                    color: TIME_COLORS[idx % TIME_COLORS.length],
                }));
                setTimeLegendItems(items);
            }
        }, [data, colorMode]);

        useEffect(() => {
            if (colorMode === 'cell_type' && data.length > 0) {
                const uniqueCellTypes = Array.from(
                    new Set(data.map((d) => d.cell_type).filter((t) => t != null)),
                ).sort();
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

                // Pass expression values for alpha if genes have data
                renderPoints(
                    ctx,
                    points,
                    colorCacheRef.current,
                    getValue,
                    normalRadius,
                    defaultColor,
                    colorValues,
                    legendMaxRef.current,
                    geneExpressionData.length > 0,
                    useAlpha,
                );

                if (selectedCellIds && selectedCellIds.size > 0) {
                    const selectedPoints = points.filter((p) =>
                        selectedCellIds.has(parseInt(p.id)),
                    );
                    // One path per halo, filled once, so overlapping halos don't add up.
                    ctx.fillStyle = GEN_ORANGE['500'];
                    for (const { extraRadius, alpha } of SELECTION_GLOW) {
                        ctx.globalAlpha = alpha;
                        ctx.beginPath();
                        for (const p of selectedPoints) {
                            ctx.moveTo(p.screenX + normalRadius + extraRadius, p.screenY);
                            ctx.arc(
                                p.screenX,
                                p.screenY,
                                normalRadius + extraRadius,
                                0,
                                2 * Math.PI,
                            );
                        }
                        ctx.fill();
                    }
                    ctx.globalAlpha = 1.0;
                    renderPoints(
                        ctx,
                        selectedPoints,
                        colorCacheRef.current,
                        getValue,
                        normalRadius,
                        defaultColor,
                        colorValues,
                        legendMaxRef.current,
                        geneExpressionData.length > 0,
                        useAlpha,
                    );
                }

                // The lasso outline, closed back to its start as it will be on release.
                if (brushRef.current && brushRef.current.points.length > 1) {
                    const [first, ...rest] = brushRef.current.points;
                    ctx.beginPath();
                    ctx.moveTo(first.x, first.y);
                    for (const point of rest) ctx.lineTo(point.x, point.y);
                    ctx.closePath();
                    ctx.globalAlpha = 0.12;
                    ctx.fillStyle = GEN_ORANGE['500'];
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                    ctx.strokeStyle = GEN_GREY['500'];
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }

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
                        2 * Math.PI,
                    );
                    ctx.stroke();
                }

                ctx.globalAlpha = 1.0;
            },
            [
                dimensions.width,
                dimensions.height,
                setupCanvas,
                colorValues,
                geneExpressionData.length,
                useAlpha,
                selectedCellIds,
            ],
        );

        const getMouseCoordinates = useCallback(
            (event: React.MouseEvent<HTMLCanvasElement> | React.WheelEvent<HTMLCanvasElement>) => {
                const canvas = canvasRef.current;
                if (!canvas) return { x: 0, y: 0 };
                const rect = canvas.getBoundingClientRect();
                return { x: event.clientX - rect.left, y: event.clientY - rect.top };
            },
            [],
        );

        const handleMouseDown = useCallback(
            (event: React.MouseEvent<HTMLCanvasElement>) => {
                event.preventDefault();
                event.stopPropagation();
                const coords = getMouseCoordinates(event);
                // The select tool draws on a plain drag; with the pan tool, Shift + drag does.
                if (onSelectionChange && (tool === 'select' || event.shiftKey)) {
                    brushRef.current = {
                        points: [coords],
                        add: tool === 'select' && event.shiftKey,
                        selectTool: tool === 'select',
                        shiftKey: event.shiftKey,
                    };
                    setIsBrushing(true);
                } else {
                    setIsDragging(true);
                    setDragStart(coords);
                    setLastTransform(transformRef.current);
                }
                hoveredPointRef.current = null;
                setIsHovering(false);
                pointerEventRef.current = null;
                hideTooltip();
                document.body.style.userSelect = 'none';
            },
            [getMouseCoordinates, hideTooltip, onSelectionChange, tool],
        );

        const handleMouseMove = useCallback(
            (event: React.MouseEvent<HTMLCanvasElement>) => {
                const coords = getMouseCoordinates(event);
                pointerEventRef.current = { clientX: event.clientX, clientY: event.clientY };

                if (isBrushing) {
                    // Followed on the window (see the brushing effect), also outside the plot.
                    return;
                } else if (isDragging) {
                    event.preventDefault();
                    event.stopPropagation();
                    hoveredPointRef.current = null;
                    setIsHovering(false);
                    hideTooltip();
                    pointerEventRef.current = null;
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

                        const pts: ScatterPlotPoint[] = spatialIndexRef.current;
                        const closest = findCellAt(pts, coords.x, coords.y);

                        // Only re-render if hovered point changed
                        if (closest) {
                            if (hoveredPointRef.current?.id !== closest.id) {
                                hoveredPointRef.current = closest;
                                setIsHovering(true);
                                render(pts);
                            }
                            showTooltip(closest, pointerEventRef.current);
                        } else {
                            if (hoveredPointRef.current) {
                                hoveredPointRef.current = null;
                                setIsHovering(false);
                                render(pts);
                            }
                            hideTooltip();
                        }
                    });
                }
            },
            [
                isBrushing,
                isDragging,
                dragStart,
                lastTransform,
                getMouseCoordinates,
                calculateScreenCoordinates,
                data,
                render,
                hideTooltip,
                showTooltip,
            ],
        );

        // With the select tool, a click on a cell selects it; with Shift it is added to the selection, or removed
        // from it when already selected. A click on empty space changes nothing.
        const selectCellAt = useCallback(
            (x: number, y: number, add: boolean): boolean => {
                const cell = onSelectionChange ? findCellAt(spatialIndexRef.current, x, y) : null;
                if (!cell || !onSelectionChange) return false;
                onSelectionChange(selectGroup([parseInt(cell.id)], selectedCellIds, add));
                return true;
            },
            [onSelectionChange, selectedCellIds],
        );

        const finishBrush = useCallback(() => {
            const brush = brushRef.current;
            brushRef.current = null;
            setIsBrushing(false);
            document.body.style.userSelect = '';
            // Released where it was pressed: a click, which selects only with the select tool.
            if (brush && brush.points.length === 1 && brush.selectTool) {
                const [{ x, y }] = brush.points;
                if (!selectCellAt(x, y, brush.shiftKey)) render(spatialIndexRef.current);
                return;
            }
            // Without an outline (null) the selection is left alone.
            const inLasso = brush ? getCellsInLasso(spatialIndexRef.current, brush.points) : null;
            if (brush && inLasso && onSelectionChange) {
                if (brush.add && selectedCellIds != null && selectedCellIds.size > 0) {
                    onSelectionChange(
                        Array.from(selectedCellIds).concat(
                            inLasso.filter((id) => !selectedCellIds.has(id)),
                        ),
                    );
                } else {
                    onSelectionChange(inLasso);
                }
            } else {
                render(spatialIndexRef.current);
            }
        }, [onSelectionChange, render, selectedCellIds, selectCellAt]);

        // While drawing, follow the mouse on the whole window, so an outline dragged past the
        // plot's edge runs along it instead of being lost.
        useEffect(() => {
            if (!isBrushing) return;

            const handleWindowMouseMove = (event: MouseEvent) => {
                const canvas = canvasRef.current;
                const lasso = brushRef.current;
                if (!canvas || !lasso) return;
                const rect = canvas.getBoundingClientRect();
                const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
                const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
                const last = lasso.points[lasso.points.length - 1];
                if (Math.hypot(x - last.x, y - last.y) < MIN_LASSO_STEP) return;
                lasso.points.push({ x, y });
                render(spatialIndexRef.current);
            };

            window.addEventListener('mousemove', handleWindowMouseMove);
            window.addEventListener('mouseup', finishBrush);
            return () => {
                window.removeEventListener('mousemove', handleWindowMouseMove);
                window.removeEventListener('mouseup', finishBrush);
            };
        }, [isBrushing, finishBrush, render]);

        // Escape abandons an outline being drawn, or else clears the selection.
        useEffect(() => {
            const hasSelection = selectedCellIds != null && selectedCellIds.size > 0;
            if (!onSelectionChange || (!isBrushing && !hasSelection)) return;

            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key !== 'Escape') return;
                const target = event.target as HTMLElement | null;
                // Leave Escape to text fields, menus and dialogs.
                if (
                    target?.closest?.(
                        'input, textarea, select, [contenteditable="true"], [role="dialog"], [role="listbox"], [role="menu"]',
                    )
                ) {
                    return;
                }
                if (brushRef.current) {
                    brushRef.current = null;
                    setIsBrushing(false);
                    document.body.style.userSelect = '';
                    render(spatialIndexRef.current);
                } else {
                    onSelectionChange([]);
                }
            };

            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }, [isBrushing, onSelectionChange, render, selectedCellIds]);

        const handleMouseUp = useCallback(() => {
            if (isBrushing) return; // finished by the window listener
            setIsDragging(false);
            hoveredPointRef.current = null;
            setIsHovering(false);
            pointerEventRef.current = null;
            hideTooltip();
            document.body.style.userSelect = '';
        }, [hideTooltip, isBrushing]);

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
            // Redraw without the hover ring, which is otherwise left on the canvas.
            if (hoveredPointRef.current) {
                hoveredPointRef.current = null;
                render(spatialIndexRef.current);
            }
            setIsHovering(false);
            setIsDragging(false);
            pointerEventRef.current = null;
            hideTooltip();
            // A brush keeps going outside the plot until the mouse is released.
            if (!brushRef.current) {
                document.body.style.userSelect = '';
            }
        }, [hideTooltip, render]);

        const handleWheel = useCallback(
            (event: React.WheelEvent<HTMLDivElement> | React.WheelEvent<HTMLCanvasElement>) => {
                const coords = getMouseCoordinates(event as React.WheelEvent<HTMLCanvasElement>);
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

                        // Show zoom hint and hide after short delay
                        setShowZoomHint(true);
                        if (zoomHintTimeoutRef.current) {
                            window.clearTimeout(zoomHintTimeoutRef.current);
                        }
                        zoomHintTimeoutRef.current = window.setTimeout(() => {
                            setShowZoomHint(false);
                            zoomHintTimeoutRef.current = null;
                        }, 300);
                    }
                });
            },
            [
                getMouseCoordinates,
                calculateScreenCoordinates,
                data,
                render,
                dimensions.width,
                dimensions.height,
            ],
        );

        useEffect(() => {
            if (data.length === 0) return;
            if (colorMode === 'expression' && totalGenesSelected > 0 && !colorValues) return;
            const screenPoints = calculateScreenCoordinates(data);
            render(screenPoints);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [
            data,
            colorValues,
            colorMode,
            dimensions.width,
            dimensions.height,
            useAlpha,
            geneExpressionData,
            selectedCellIds,
        ]);

        useEffect(() => {
            return () => {
                if (zoomHintTimeoutRef.current) {
                    window.clearTimeout(zoomHintTimeoutRef.current);
                }
            };
        }, []);

        return (
            <ScatterPlotContainer ref={containerRef} onWheel={handleWheel}>
                <ZoomHint $visible={showZoomHint}>Double-click to reset zoom</ZoomHint>
                {onSelectionChange != null && (
                    <SelectionTools>
                        <ToggleButtonGroup
                            orientation="vertical"
                            size="small"
                            exclusive
                            value={tool}
                            onChange={(_event, value: SelectionTool | null) => {
                                if (value != null) setTool(value);
                            }}
                            aria-label="Mouse drag tool"
                        >
                            <Tooltip title="Pan: drag to move the plot" placement="right">
                                <ToggleButton value="pan" aria-label="Pan">
                                    <PanToolOutlined fontSize="inherit" />
                                </ToggleButton>
                            </Tooltip>
                            <Tooltip
                                title="Select cells: draw around them, or click one (Shift adds to the selection, Esc clears it)"
                                placement="right"
                            >
                                <ToggleButton value="select" aria-label="Select cells">
                                    <LassoIcon />
                                </ToggleButton>
                            </Tooltip>
                        </ToggleButtonGroup>
                    </SelectionTools>
                )}
                {children}

                <Canvas
                    ref={canvasRef}
                    $isDragging={isDragging}
                    $isBrushing={isBrushing || tool === 'select'}
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

                {showLegend &&
                    (colorMode === 'expression' || (geneExpressionData.length > 0 && useAlpha)) && (
                        <ExpressionAlphaLegend>
                            <AlphaLegendTitle>Expression</AlphaLegendTitle>
                            <AlphaGradientContainer>
                                <AlphaLabel>0</AlphaLabel>
                                <AlphaGradientBar $isExpression={colorMode === 'expression'} />
                                <AlphaLabel>{expressionMax.toFixed(2)}</AlphaLabel>
                            </AlphaGradientContainer>
                        </ExpressionAlphaLegend>
                    )}

                {showLegend && colorMode === 'time' && timeLegendItems.length > 0 && (
                    <TimeLegend>
                        <TimeLegendTitle>Time</TimeLegendTitle>
                        <TimeLegendItems>
                            {timeLegendItems.map((item) =>
                                renderLegendItem('time', item.time, item.color),
                            )}
                        </TimeLegendItems>
                    </TimeLegend>
                )}

                {showLegend && colorMode === 'cell_type' && cellTypeLegendItems.length > 0 && (
                    <TimeLegend>
                        <TimeLegendTitle>Cell Type</TimeLegendTitle>
                        <TimeLegendItems>
                            {cellTypeLegendItems.map((item) =>
                                renderLegendItem('cell_type', item.cellType, item.color),
                            )}
                        </TimeLegendItems>
                    </TimeLegend>
                )}

                <AxisIndicator>
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
            </ScatterPlotContainer>
        );
    },
);

UmapPlot.displayName = 'UmapPlot';

export default UmapPlot;
