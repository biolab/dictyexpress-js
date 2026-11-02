import React, { ReactElement, useRef, useCallback, useState, useEffect, forwardRef } from 'react';
import _ from 'lodash';
import { Spec } from 'vega';
import Chart, { ChartHandle, DataDefinition, SignalDefinition } from '../../common/chart/chart';
import { getMinMax, logOfBase } from 'utils/math';
import { GEN_CYAN, GEN_GREY } from 'components/genexpress/common/theming/theming';
import { Thresholds, VolcanoPoint } from 'redux/models/internal';
import useStateWithEffect from 'components/genexpress/common/useStateWithEffect';

type DifferentialExpressionsVolcanoPlotProps = {
    data: VolcanoPoint[];
    highlightedGenesIds: string[];
    selectedGenesIds: string[];
    logFcOutliersLimit: number;
    displayOutliers: boolean;
    thresholds: Thresholds;
    // Full y-axis title, e.g. -log10(FDR) or |Cohen's d|.
    yAxisLabel: string;
    onSelect: ((genesIds: string[]) => void) | undefined;
};

type Range = {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};

const logFcClampedValueTransform: { type: 'formula'; as: string; expr: string } = {
    // Display range can be narrower than data. Move points into range.
    type: 'formula',
    as: 'logFcClampedValue',
    expr: `clamp(datum.logFcValue, range.minX, range.maxX)`,
};

const getVegaSpecification = (
    data: DifferentialExpressionsVolcanoPlotProps['data'],
    getRange: () => Range,
    thresholds: DifferentialExpressionsVolcanoPlotProps['thresholds'],
    yAxisLabel: DifferentialExpressionsVolcanoPlotProps['yAxisLabel'],
    selectedGenePoints: VolcanoPoint[],
    highlightedGenePoints: VolcanoPoint[],
): Spec => ({
    signals: [
        {
            name: 'range',
            value: getRange(),
        },
        {
            name: 'disableSelection',
            value: false,
        },
        {
            name: 'brushing_ended',
            value: false,
            on: [
                {
                    events: 'window:mousemove',
                    update: 'false',
                },
                // Any release on the window, so a brush released outside the plot still ends,
                // but true only if a brush started in the plot. Declared before `brushing`, so
                // it still reads true on that release.
                {
                    events: 'window:mouseup',
                    update: 'brushing',
                },
            ],
        },
        {
            name: 'brushing',
            value: false,
            on: [
                {
                    events: 'mousedown, [mousedown, window:mouseup] > window:mousemove',
                    update: 'true',
                },
                // On the window, so a brush released outside the plot still ends.
                {
                    events: 'window:mouseup',
                    update: 'false',
                },
            ],
        },
        {
            name: 'brush_start',
            value: { x: null, y: null },
            on: [
                {
                    events: 'mousedown, disableSelection',
                    update: 'disableSelection ? {x: null, y: null} : {x: invert("xscale", clamp(x(), 0, width)), y: invert("yscale", clamp(y(), 0, height))}',
                },
            ],
        },
        {
            name: 'brush_end',
            value: { x: null, y: null },
            on: [
                {
                    events: 'mousedown, [mousedown, window:mouseup] > window:mousemove',
                    update: '{x: invert("xscale", clamp(x(), 0, width)), y: invert("yscale", clamp(y(), 0, height))}',
                },
            ],
        },
    ],
    data: [
        {
            name: 'table',
            values: data,
            transform: [logFcClampedValueTransform],
        },
        {
            name: 'x-thresholds',
            values: [{ x: thresholds.fcLog }, { x: -thresholds.fcLog }],
        },
        {
            name: 'y-thresholds',
            values: [
                {
                    y: thresholds.pValueLog,
                },
            ],
        },
        {
            name: 'highlighted',
            values: highlightedGenePoints,
            transform: [logFcClampedValueTransform],
        },
        {
            name: 'selected',
            values: selectedGenePoints,
            transform: [logFcClampedValueTransform],
        },
        {
            name: 'currentSelection',
            source: 'table',
            transform: [
                {
                    type: 'filter',
                    expr: `inrange(datum.logFcClampedValue, [brush_start.x, brush_end.x]) &&
                   inrange(datum.logProbFiniteValue, [brush_start.y, brush_end.y])`,
                },
            ],
        },
        {
            name: 'selection',
            on: [
                { trigger: '!brushing_ended', remove: true },
                { trigger: 'brushing_ended', insert: `data('currentSelection')` },
            ],
        },
    ],
    marks: [
        {
            name: 'volcanoPointRemaining',
            type: 'symbol',
            from: {
                data: 'table',
            },
            encode: {
                enter: {
                    size: {
                        value: 3 * 3,
                    },
                    fill: {
                        value: GEN_GREY['500'],
                    },
                    tooltip: {
                        signal: `{'Gene': datum.geneName, 'log2(Fold Change)': datum.logFcValue, ${JSON.stringify(yAxisLabel)}: datum.logProbValue}`,
                    },
                },
                update: {
                    x: {
                        field: 'logFcClampedValue',
                        scale: 'xscale',
                    },
                    y: {
                        field: 'logProbFiniteValue',
                        scale: 'yscale',
                    },
                },
            },
        },
        {
            name: 'volcanoPointSelected',
            type: 'symbol',
            from: {
                data: 'selected',
            },
            encode: {
                enter: {
                    size: {
                        value: 9 * 9,
                    },
                    fill: { value: GEN_GREY['700'] },
                    tooltip: {
                        signal: `{'Gene': datum.geneName, 'log2(Fold Change)': datum.logFcValue, ${JSON.stringify(yAxisLabel)}: datum.logProbValue}`,
                    },
                },
                update: {
                    x: {
                        field: 'logFcClampedValue',
                        scale: 'xscale',
                    },
                    y: {
                        field: 'logProbFiniteValue',
                        scale: 'yscale',
                    },
                },
            },
        },
        {
            name: 'volcanoPointHighlighted',
            type: 'symbol',
            from: {
                data: 'highlighted',
            },
            encode: {
                enter: {
                    size: {
                        value: 9 * 9,
                    },
                    fill: {
                        value: GEN_CYAN['500'],
                    },
                    tooltip: {
                        signal: `{'Gene': datum.geneName, 'log2(Fold Change)': datum.logFcValue, ${JSON.stringify(yAxisLabel)}: datum.logProbValue}`,
                    },
                },
                update: {
                    x: {
                        field: 'logFcClampedValue',
                        scale: 'xscale',
                    },
                    y: {
                        field: 'logProbFiniteValue',
                        scale: 'yscale',
                    },
                },
            },
        },
        {
            name: 'selectionRect',
            type: 'rect',
            encode: {
                enter: {
                    stroke: {
                        value: GEN_GREY['500'],
                    },
                },
                update: {
                    x: {
                        scale: 'xscale',
                        signal: 'brush_start.x',
                    },
                    x2: {
                        scale: 'xscale',
                        signal: 'brush_end.x',
                    },
                    y: {
                        scale: 'yscale',
                        signal: 'brush_start.y',
                    },
                    y2: {
                        scale: 'yscale',
                        signal: 'brush_end.y',
                    },
                    stroke: {
                        value: GEN_GREY['500'],
                    },
                    strokeWidth: [
                        {
                            value: 1,
                            test: 'brushing === true',
                        },
                        {
                            value: 0,
                        },
                    ],
                },
            },
        },
        {
            name: 'xThresholdsRect',
            type: 'rect',
            from: {
                data: 'x-thresholds',
            },
            encode: {
                enter: {
                    width: {
                        value: 1,
                    },
                    fill: {
                        value: GEN_GREY['700'],
                    },
                },
                update: {
                    x: {
                        scale: 'xscale',
                        field: 'x',
                    },
                    y: {
                        value: 0,
                    },
                    y2: {
                        signal: 'height',
                    },
                },
            },
        },
        {
            name: 'yThresholdsRect',
            type: 'rect',
            from: {
                data: 'y-thresholds',
            },
            encode: {
                enter: {
                    height: {
                        value: 1,
                    },
                    fill: {
                        value: GEN_GREY['700'],
                    },
                },
                update: {
                    x: {
                        scale: 'xscale',
                        signal: 'range.minX',
                    },
                    x2: {
                        scale: 'xscale',
                        signal: 'range.maxX',
                    },
                    y: {
                        scale: 'yscale',
                        field: 'y',
                    },
                },
            },
        },
    ],
    scales: [
        {
            name: 'xscale',
            type: 'linear',
            domain: [{ signal: 'range.minX' }, { signal: 'range.maxX' }],
            range: 'width',
        },
        {
            name: 'yscale',
            type: 'linear',
            domain: [{ signal: 'range.minY' }, { signal: 'range.maxY' }],
            range: 'height',
        },
    ],
    axes: [
        {
            scale: 'xscale',
            // TODO: once https://github.com/vega/vega/issues/2927 is fixed, return label orientation back to bottom!
            orient: 'top',
            title: 'log2(Fold Change)',
            grid: true,
            labelFontSize: 14,
            titleFontSize: 14,
            labelFont: 'FS Joey Web Regular',
            titleFont: 'FS Joey Web Regular',
            encode: {
                labels: {
                    update: {
                        dy: { value: 4 },
                        align: { value: 'center' },
                    },
                },
                title: {
                    update: { dy: { value: 0 } },
                },
            },
        },
        {
            scale: 'yscale',
            orient: 'left',
            title: yAxisLabel,
            grid: true,
            labelFontSize: 14,
            titleFontSize: 14,
            labelFont: 'FS Joey Web Regular',
            titleFont: 'FS Joey Web Regular',
            encode: {
                labels: {
                    update: {
                        dx: { value: -9 },
                        align: { value: 'center' },
                    },
                },
                title: {
                    update: { dx: { value: -13 } },
                },
            },
        },
    ],
});

const DifferentialExpressionsVolcanoPlot = forwardRef<
    ChartHandle,
    DifferentialExpressionsVolcanoPlotProps
>(
    (
        {
            data,
            highlightedGenesIds,
            selectedGenesIds,
            logFcOutliersLimit,
            displayOutliers = false,
            thresholds,
            yAxisLabel,
            onSelect,
        },
        ref,
    ): ReactElement => {
        const [highlightedGenePoints, setHighlightedGenePoints] = useState<VolcanoPoint[]>([]);
        const [selectedGenePoints, setSelectedGenePoints] = useState<VolcanoPoint[]>([]);

        useEffect(() => {
            setHighlightedGenePoints(
                _.filter(data, (datum) => highlightedGenesIds.includes(datum.geneId)),
            );
        }, [data, highlightedGenesIds]);

        useEffect(() => {
            setSelectedGenePoints(
                _.filter(data, (datum) => selectedGenesIds.includes(datum.geneId)),
            );
        }, [data, selectedGenesIds]);

        const getLogProbLimit = useCallback((): number => {
            const HIGHEST_CALCULABLE_LOG_PROB = -logOfBase(Number.MIN_VALUE, 10);
            if (_.isEmpty(data)) return HIGHEST_CALCULABLE_LOG_PROB;

            const highestValueInData = _.max(
                _.map(data, ({ logProbValue }) => Number.isFinite(logProbValue) && logProbValue),
            );

            return highestValueInData
                ? Math.min(HIGHEST_CALCULABLE_LOG_PROB, highestValueInData * 1.1)
                : 0;
        }, [data]);

        const getRange = useCallback((): Range => {
            const [minY, maxY] = getMinMax(data.map((datum) => datum.logProbFiniteValue));
            const expandedY = Math.min(maxY * 1.1, getLogProbLimit()); // Expand the range by 10%.

            const [minX, maxX] = getMinMax(data.map((datum) => datum.logFcValue));
            const absMaxX = Math.max(Math.abs(minX), Math.abs(maxX));

            const expandedX = absMaxX + absMaxX * 2 * 0.1; // Expand the range by 10%.
            const usedX = !displayOutliers ? Math.min(expandedX, logFcOutliersLimit) : expandedX;

            return {
                minX: _.floor(-usedX, 2),
                maxX: _.ceil(usedX, 2),
                minY: _.floor(minY, 2),
                maxY: _.ceil(expandedY, 2),
            };
        }, [data, displayOutliers, getLogProbLimit, logFcOutliersLimit]);

        const updatableDataDefinitions: DataDefinition[] = useStateWithEffect(
            () => [
                {
                    name: 'highlighted',
                    data: highlightedGenePoints,
                },
                {
                    name: 'selected',
                    data: selectedGenePoints,
                },
                { name: 'table', data },
                { name: 'x-thresholds', data: [{ x: thresholds.fcLog }, { x: -thresholds.fcLog }] },
                { name: 'y-thresholds', data: [{ y: thresholds.pValueLog }] },
            ],
            [
                data,
                highlightedGenePoints,
                selectedGenePoints,
                thresholds.fcLog,
                thresholds.pValueLog,
            ],
        );

        const updatableSignalDefinitions: SignalDefinition[] = useStateWithEffect(
            () => [
                {
                    name: 'range',
                    value: getRange(),
                },
                {
                    name: 'disableSelection',
                    value: onSelect == null,
                },
            ],
            [getRange, onSelect],
        );

        // Data handlers that is updated (and reattached) only if highlighted variable changes.
        const dataHandlers = useStateWithEffect(
            () => [
                {
                    name: 'selection',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    handler: (_name: string, value: any): void => {
                        if (value != null && value.length > 0) {
                            const selectedVolcanoPoints = value.map(
                                (volcanoPointObject: { geneId: string }) =>
                                    volcanoPointObject.geneId,
                            );
                            onSelect?.(selectedVolcanoPoints);
                        }
                    },
                },
            ],
            [onSelect],
        );

        const renderSpecification = useRef<Spec>(
            getVegaSpecification(
                data,
                getRange,
                thresholds,
                yAxisLabel,
                selectedGenePoints,
                highlightedGenePoints,
            ),
        );

        return (
            <Chart
                updatableDataDefinitions={updatableDataDefinitions}
                updatableSignalDefinitions={updatableSignalDefinitions}
                dataHandlers={dataHandlers}
                vegaSpecification={renderSpecification.current}
                ref={ref}
            />
        );
    },
);

export default DifferentialExpressionsVolcanoPlot;
