import { render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import type { ComponentProps } from 'react';
import { vi } from 'vitest';
import UmapPlot, { GeneExpressionData, UmapDataPoint, UmapPlotHandle } from './umapPlot';

const baseData: UmapDataPoint[] = [
    { id: '0', x: 0, y: 0, tag: 'cell_1', time: '0h', cell_type: 'Type A' },
    { id: '1', x: 1, y: 1, tag: 'cell_2', time: '2h', cell_type: 'Type B' },
    { id: '2', x: 2, y: -1, tag: 'cell_3', time: '4h', cell_type: 'Type A' },
];

const expressionValues = new Float32Array([0, 2, 4]);

const geneExpressionData: GeneExpressionData[] = [
    { geneName: 'DDB_G0267412', geneSymbol: 'pspA', expression: new Float32Array([0, 1, 3]) },
];

type ResizeObserverCallback = (
    entries: Array<{ contentRect: { width: number; height: number } }>,
) => void;

const createCanvasContext = () => {
    const context: Partial<CanvasRenderingContext2D> = {
        setTransform: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        clearRect: vi.fn(),
    };

    Object.defineProperty(context, 'imageSmoothingEnabled', {
        value: true,
        writable: true,
    });
    Object.defineProperty(context, 'imageSmoothingQuality', {
        value: 'high',
        writable: true,
    });
    Object.defineProperty(context, 'globalAlpha', {
        value: 1,
        writable: true,
    });
    Object.defineProperty(context, 'lineWidth', {
        value: 1,
        writable: true,
    });
    Object.defineProperty(context, 'fillStyle', {
        value: '#000',
        writable: true,
    });
    Object.defineProperty(context, 'strokeStyle', {
        value: '#000',
        writable: true,
    });

    return context as CanvasRenderingContext2D;
};

describe('UmapPlot', () => {
    const originalResizeObserver = global.ResizeObserver;
    const devicePixelRatioDescriptor = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    let boundingClientRectSpy: ReturnType<typeof vi.spyOn>;
    const restoreSpies: Array<() => void> = [];

    beforeAll(() => {
        class ResizeObserverMock {
            private readonly callback: ResizeObserverCallback;
            constructor(callback: ResizeObserverCallback) {
                this.callback = callback;
            }
            observe() {
                this.callback([
                    {
                        contentRect: {
                            width: 400,
                            height: 300,
                        },
                    },
                ]);
            }
            disconnect() {
                /* noop */
            }
        }

        (global as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
            ResizeObserverMock as unknown as typeof ResizeObserver;

        Object.defineProperty(window, 'devicePixelRatio', {
            value: 1,
            configurable: true,
        });

        const getContextSpy = vi
            .spyOn(HTMLCanvasElement.prototype, 'getContext')
            .mockImplementation(() => createCanvasContext());
        restoreSpies.push(() => getContextSpy.mockRestore());

        const toDataURLSpy = vi
            .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
            .mockReturnValue('data:image/png;base64,fake');
        restoreSpies.push(() => toDataURLSpy.mockRestore());

        boundingClientRectSpy = vi
            .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
            .mockReturnValue({
                width: 400,
                height: 300,
                top: 0,
                left: 0,
                bottom: 300,
                right: 400,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            });
    });

    afterAll(() => {
        if (originalResizeObserver) {
            (global as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
                originalResizeObserver;
        } else {
            delete (global as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
        }

        if (devicePixelRatioDescriptor) {
            Object.defineProperty(window, 'devicePixelRatio', devicePixelRatioDescriptor);
        } else {
            delete (window as unknown as { devicePixelRatio?: number }).devicePixelRatio;
        }

        restoreSpies.forEach((restore) => restore());
        boundingClientRectSpy.mockRestore();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const renderPlot = (props: Partial<ComponentProps<typeof UmapPlot>> = {}) => {
        const {
            data = baseData,
            colorMode = 'time',
            showLegend = true,
            colorValues,
            transformMode,
            aggregationMode,
            useAlpha,
            geneExpressionData,
            totalGenesSelected,
            fixedBounds,
        } = props;

        return render(
            <UmapPlot
                data={data}
                colorMode={colorMode}
                showLegend={showLegend}
                colorValues={colorValues}
                transformMode={transformMode}
                aggregationMode={aggregationMode}
                useAlpha={useAlpha}
                geneExpressionData={geneExpressionData}
                totalGenesSelected={totalGenesSelected}
                fixedBounds={fixedBounds}
            />,
        );
    };

    it('renders time legend when in time mode', async () => {
        renderPlot({ colorMode: 'time' });

        expect(await screen.findByText('Time')).toBeInTheDocument();
        expect(screen.getByText('0h')).toBeInTheDocument();
        expect(screen.getByText('2h')).toBeInTheDocument();
        expect(screen.getByText('4h')).toBeInTheDocument();
    });

    it('renders cell type legend when in cell type mode', async () => {
        renderPlot({ colorMode: 'cell_type' });

        expect(await screen.findByText('Cell Type')).toBeInTheDocument();
        expect(screen.getByText('Type A')).toBeInTheDocument();
        expect(screen.getByText('Type B')).toBeInTheDocument();
    });

    it('renders expression legend with max label when in expression mode', async () => {
        renderPlot({
            colorMode: 'expression',
            colorValues: expressionValues,
        });

        expect(await screen.findByText('Expression')).toBeInTheDocument();
        expect(screen.getByText('4.00')).toBeInTheDocument();
    });

    it('respects showLegend prop', async () => {
        renderPlot({
            colorMode: 'expression',
            colorValues: expressionValues,
            showLegend: false,
        });

        await waitFor(() => {
            expect(screen.queryByText('Expression')).toBeNull();
            expect(screen.queryByText('Time')).toBeNull();
        });
    });

    it('does not render expression legend when alpha legend is disabled', async () => {
        renderPlot({
            colorMode: 'time',
            geneExpressionData,
            useAlpha: false,
        });

        expect(await screen.findByText('Time')).toBeInTheDocument();
        expect(screen.queryByText('Expression')).toBeNull();
    });

    it('exposes canvas helpers through the ref', async () => {
        const ref = createRef<UmapPlotHandle>();

        render(
            <UmapPlot
                ref={ref}
                data={baseData}
                colorMode="expression"
                colorValues={expressionValues}
            />,
        );

        await waitFor(() => {
            expect(ref.current).not.toBeNull();
        });

        const canvas = ref.current?.getCanvas();
        expect(canvas).toBeInstanceOf(HTMLCanvasElement);
        expect(ref.current?.exportAsPNG()).toBe('data:image/png;base64,fake');
    });
});
