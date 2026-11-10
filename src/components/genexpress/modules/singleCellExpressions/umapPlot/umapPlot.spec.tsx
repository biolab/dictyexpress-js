import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import type { ComponentProps } from 'react';
import { vi } from 'vitest';
import UmapPlot, {
    GeneExpressionData,
    UmapDataPoint,
    UmapPlotHandle,
    isPointInPolygon,
    selectGroup,
} from './umapPlot';

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
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
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
            selectedCellIds,
            onSelectionChange,
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
                selectedCellIds={selectedCellIds}
                onSelectionChange={onSelectionChange}
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

    it('checks whether a point lies inside an outline, including a concave one', () => {
        // An L: the top-right quarter of the 100x100 square is cut out.
        const outline = [
            { x: 0, y: 0 },
            { x: 50, y: 0 },
            { x: 50, y: 50 },
            { x: 100, y: 50 },
            { x: 100, y: 100 },
            { x: 0, y: 100 },
        ];

        expect(isPointInPolygon(25, 25, outline)).toBe(true);
        expect(isPointInPolygon(75, 75, outline)).toBe(true);
        expect(isPointInPolygon(75, 25, outline)).toBe(false);
        expect(isPointInPolygon(120, 75, outline)).toBe(false);
    });

    it('selects the cells inside a shift-drag outline', async () => {
        const onSelectionChange = vi.fn();
        const ref = createRef<UmapPlotHandle>();

        // In a 400x300 canvas with 40px padding the cells are drawn at
        // (40, 150), (200, 40) and (360, 260).
        render(<UmapPlot ref={ref} data={baseData} onSelectionChange={onSelectionChange} />);
        const canvas = await waitFor(() => {
            const element = ref.current?.getCanvas();
            expect(element).toBeInstanceOf(HTMLCanvasElement);
            return element as HTMLCanvasElement;
        });

        // Around (40, 150) and (200, 40), leaving (360, 260) outside.
        fireEvent.mouseDown(canvas, { clientX: 0, clientY: 0, shiftKey: true });
        fireEvent.mouseMove(canvas, { clientX: 250, clientY: 0 });
        fireEvent.mouseMove(canvas, { clientX: 250, clientY: 200 });
        fireEvent.mouseMove(canvas, { clientX: 0, clientY: 200 });
        fireEvent.mouseUp(canvas);

        expect(onSelectionChange).toHaveBeenCalledWith([0, 1]);
    });

    it('draws with a plain drag once the select tool is chosen, and Shift adds', async () => {
        const onSelectionChange = vi.fn();
        const ref = createRef<UmapPlotHandle>();

        render(
            <UmapPlot
                ref={ref}
                data={baseData}
                selectedCellIds={new Set([2])}
                onSelectionChange={onSelectionChange}
            />,
        );
        const canvas = await waitFor(() => {
            const element = ref.current?.getCanvas();
            expect(element).toBeInstanceOf(HTMLCanvasElement);
            return element as HTMLCanvasElement;
        });
        fireEvent.click(screen.getByRole('button', { name: 'Select cells' }));

        const drawAroundFirstCell = (shiftKey: boolean) => {
            fireEvent.mouseDown(canvas, { clientX: 0, clientY: 100, shiftKey });
            fireEvent.mouseMove(canvas, { clientX: 100, clientY: 100 });
            fireEvent.mouseMove(canvas, { clientX: 100, clientY: 200 });
            fireEvent.mouseMove(canvas, { clientX: 0, clientY: 200 });
            fireEvent.mouseUp(canvas);
        };

        drawAroundFirstCell(false);
        expect(onSelectionChange).toHaveBeenLastCalledWith([0]);

        drawAroundFirstCell(true);
        expect(onSelectionChange).toHaveBeenLastCalledWith([2, 0]);
    });

    it('selects a clicked cell with the select tool, and adds or removes one with Shift + click', async () => {
        const onSelectionChange = vi.fn();
        const ref = createRef<UmapPlotHandle>();

        const { rerender } = render(
            <UmapPlot ref={ref} data={baseData} onSelectionChange={onSelectionChange} />,
        );
        const canvas = await waitFor(() => {
            const element = ref.current?.getCanvas();
            expect(element).toBeInstanceOf(HTMLCanvasElement);
            return element as HTMLCanvasElement;
        });
        const click = (clientX: number, clientY: number, shiftKey = false) => {
            fireEvent.mouseDown(canvas, { clientX, clientY, shiftKey });
            fireEvent.mouseUp(canvas, { clientX, clientY, shiftKey });
        };

        // The pan tool doesn't select on a click, with or without Shift.
        click(40, 150);
        click(40, 150, true);
        expect(onSelectionChange).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Select cells' }));

        // 4px from the cell at (40, 150): within the pointer radius.
        click(44, 150);
        expect(onSelectionChange).toHaveBeenLastCalledWith([0]);

        // 10px away: too far, nothing changes.
        click(50, 150);
        expect(onSelectionChange).toHaveBeenCalledTimes(1);

        rerender(
            <UmapPlot
                ref={ref}
                data={baseData}
                selectedCellIds={new Set([0])}
                onSelectionChange={onSelectionChange}
            />,
        );
        click(200, 40, true);
        expect(onSelectionChange).toHaveBeenLastCalledWith([0, 1]);
        click(40, 150, true);
        expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    });

    it('leaves the selection alone after a click on empty space or a straight stroke', async () => {
        const onSelectionChange = vi.fn();
        const ref = createRef<UmapPlotHandle>();

        render(<UmapPlot ref={ref} data={baseData} onSelectionChange={onSelectionChange} />);
        const canvas = await waitFor(() => {
            const element = ref.current?.getCanvas();
            expect(element).toBeInstanceOf(HTMLCanvasElement);
            return element as HTMLCanvasElement;
        });

        fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10, shiftKey: true });
        fireEvent.mouseUp(canvas);
        fireEvent.mouseDown(canvas, { clientX: 0, clientY: 150, shiftKey: true });
        fireEvent.mouseMove(canvas, { clientX: 300, clientY: 150 });
        fireEvent.mouseUp(canvas);

        expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it('clears the selection on Escape, but not from a text field', () => {
        const onSelectionChange = vi.fn();
        render(
            <>
                <input aria-label="Search" />
                <UmapPlot
                    data={baseData}
                    selectedCellIds={new Set([1])}
                    onSelectionChange={onSelectionChange}
                />
            </>,
        );

        fireEvent.keyDown(screen.getByLabelText('Search'), { key: 'Escape' });
        expect(onSelectionChange).not.toHaveBeenCalled();

        fireEvent.keyDown(document.body, { key: 'Escape' });
        expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it('keeps the outline when the drag leaves the plot, clamped to its edge', async () => {
        const onSelectionChange = vi.fn();
        const ref = createRef<UmapPlotHandle>();

        render(<UmapPlot ref={ref} data={baseData} onSelectionChange={onSelectionChange} />);
        const canvas = await waitFor(() => {
            const element = ref.current?.getCanvas();
            expect(element).toBeInstanceOf(HTMLCanvasElement);
            return element as HTMLCanvasElement;
        });

        // From inside the plot, out past its right and bottom edges (400x300) and back.
        fireEvent.mouseDown(canvas, { clientX: 300, clientY: 200, shiftKey: true });
        fireEvent.mouseLeave(canvas);
        fireEvent.mouseMove(window, { clientX: 2000, clientY: 200 });
        fireEvent.mouseMove(window, { clientX: 2000, clientY: 2000 });
        fireEvent.mouseMove(window, { clientX: 300, clientY: 2000 });
        fireEvent.mouseUp(window);

        // Cells at (200, 40) and (40, 150) are outside, (360, 260) is inside the clamped outline.
        expect(onSelectionChange).toHaveBeenCalledWith([2]);
    });

    it('pans instead of selecting when shift is not held', async () => {
        const onSelectionChange = vi.fn();
        const ref = createRef<UmapPlotHandle>();

        render(<UmapPlot ref={ref} data={baseData} onSelectionChange={onSelectionChange} />);
        const canvas = await waitFor(() => {
            const element = ref.current?.getCanvas();
            expect(element).toBeInstanceOf(HTMLCanvasElement);
            return element as HTMLCanvasElement;
        });

        fireEvent.mouseDown(canvas, { clientX: 0, clientY: 0 });
        fireEvent.mouseMove(canvas, { clientX: 250, clientY: 200 });
        fireEvent.mouseUp(canvas);

        expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it('selects a group, or adds it to the selection, or removes it when all selected', () => {
        expect(selectGroup([1, 2], new Set([5]), false)).toEqual([1, 2]);
        expect(selectGroup([1, 2], new Set([5, 1]), true)).toEqual([5, 1, 2]);
        expect(selectGroup([1, 2], new Set([5, 1, 2]), true)).toEqual([5]);
        expect(selectGroup([1, 2], undefined, true)).toEqual([1, 2]);
    });

    it('selects the cells of a legend entry and shows the entry as selected', async () => {
        const onSelectionChange = vi.fn();
        const { rerender } = renderPlot({ colorMode: 'cell_type', onSelectionChange });

        fireEvent.click(await screen.findByRole('button', { name: 'Type A' }));
        expect(onSelectionChange).toHaveBeenLastCalledWith([0, 2]);

        rerender(
            <UmapPlot
                data={baseData}
                colorMode="cell_type"
                selectedCellIds={new Set([0, 2])}
                onSelectionChange={onSelectionChange}
            />,
        );
        expect(screen.getByRole('button', { name: 'Type A' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        fireEvent.click(screen.getByRole('button', { name: 'Type B' }), { shiftKey: true });
        expect(onSelectionChange).toHaveBeenLastCalledWith([0, 2, 1]);
    });

    it('keeps legend entries as plain labels without a selection handler', async () => {
        renderPlot({ colorMode: 'time' });

        expect(await screen.findByText('0h')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '0h' })).not.toBeInTheDocument();
    });
});
