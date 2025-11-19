import React, { ReactElement, forwardRef, useState } from 'react';
import _ from 'lodash';
import { Spec } from 'vega';
import { useTheme } from '@mui/material';
import Chart, { ChartHandle, DataDefinition, DataHandler } from '../../common/chart/chart';
import useStateWithEffect from 'components/genexpress/common/useStateWithEffect';
import { GeneExpression } from 'redux/models/internal';
import { GEN_GREY } from 'components/genexpress/common/theming/theming';
import useForwardedRef from 'components/genexpress/common/useForwardedRef';
import { getComparisonTimeSeries } from 'redux/stores/timeSeries';

type ComparisonTimeSeries = ReturnType<typeof getComparisonTimeSeries>;

type GeneExpressionsLineChartProps = {
    genesExpressions: GeneExpression[];
    comparisonTimeSeries: ComparisonTimeSeries;
    highlightedGenesIds: string[];
    selectedGenesIds: string[];
    onHighlight: (genesIds: string[]) => void;
    showLegend: boolean;
    colorByTimeSeries: boolean;
};

const color = GEN_GREY['500'];
export const colorScaleLimit = 20;
export const lineStrokeWidth = 1;
export const lineStrokeDash = [8, 8]; // [stroke, space]
export const highlightedLineStrokeWidth = 4;

// Check if all labels can be parsed to numeric values
const canUseNumericAxis = (genesExpressions: GeneExpression[]): boolean => {
    if (genesExpressions.length === 0) return false;
    const uniqueLabels = Array.from(new Set(genesExpressions.map((expr) => expr.label)));
    return uniqueLabels.every((label) => {
        const parsed = Number(label.replace(/[^0-9.]/g, ''));
        return !isNaN(parsed) && label.replace(/[^0-9.]/g, '').length > 0;
    });
};

const getVegaSpecification = (
    genesExpressions: GeneExpression[],
    comparisonTimeSeries: ComparisonTimeSeries,
    highlightedGenesIds: string[],
    selectedGenesIds: string[],
    highlightedColor: string,
    showLegend: boolean,
    colorByTimeSeries: boolean,
    chartHeight?: number,
): Spec => {
    const useNumericAxis = canUseNumericAxis(genesExpressions);
    const xField = useNumericAxis ? 'numericLabel' : 'label';

    return {
        signals: [
            {
                name: 'clear',
                value: true,
                on: [
                    {
                        events: 'mouseup[!event.item]',
                        update: 'true',
                        force: true,
                    },
                ],
            },
            {
                name: 'ctrl',
                value: false,
                on: [
                    {
                        events: '@genesExpressionsLinesArea:click, @genesExpressionsPoints:click, @legendSymbol:click, @legendLabel:click',
                        // On Macintosh keyboards, metaKey is the ⌘ Command key.
                        // At least as of Firefox 48, the ⊞ Windows key is no longer considered a metaKey.
                        update: 'event.ctrlKey || event.metaKey',
                        force: true,
                    },
                ],
            },
            {
                name: 'clicked',
                value: null,
                on: [
                    {
                        events: '@genesExpressionsLinesArea:click, @genesExpressionsPoints:click, @legendSymbol:click, @legendLabel:click',
                        update: 'datum.geneId == null ? datum.value : datum.geneId',
                        force: true,
                    },
                ],
            },
            {
                name: 'hovered',
                value: null,
                on: [
                    {
                        events: '@legendSymbol:mouseover, @legendLabel:mouseover, @genesExpressionsLinesArea:mouseover, @genesExpressionsPoints:mouseover',
                        update: '{geneId: datum.geneId == null ? datum.value : datum.geneId, timeSeriesName: datum.timeSeriesName}',
                        force: true,
                    },
                ],
            },
            {
                name: 'unhovered',
                value: null,
                on: [
                    {
                        events: '@legendSymbol:mouseout, @legendLabel:mouseout, @genesExpressionsLinesArea:mouseout, @genesExpressionsPoints:mouseout',
                        update: '{}',
                        force: true,
                    },
                ],
            },
        ],
        data: [
            {
                name: 'table',
                values: genesExpressions,
                ...(useNumericAxis
                    ? {
                          transform: [
                              {
                                  type: 'formula',
                                  as: 'numericLabel',
                                  // Parse numeric value from label (e.g., "2h" → 2, "4 hrs" → 4, "12" → 12)
                                  expr: "toNumber(replace(datum.label, /[^0-9.]/g, ''))",
                              },
                          ],
                      }
                    : {}),
            },
            {
                name: 'comparison',
                values: comparisonTimeSeries,
            },
            {
                name: 'hovered',
                on: [
                    { trigger: 'hovered', insert: 'hovered' },
                    { trigger: 'unhovered', remove: true },
                ],
            },
            {
                name: 'highlighted',
                values: highlightedGenesIds,
                on: [
                    { trigger: 'clear', remove: true },
                    { trigger: '!ctrl', remove: true },
                    {
                        trigger: '!ctrl && clicked',
                        insert: 'clicked',
                    },
                    {
                        trigger: 'ctrl && clicked',
                        toggle: '{data: clicked}',
                    },
                ],
            },
            {
                name: 'selectedGenesIds',
                values: selectedGenesIds,
            },
        ],
        legends: showLegend
            ? [
                  {
                      title: colorByTimeSeries ? 'Time series' : 'Genes',
                      stroke: 'colorscale',
                      orient: 'right',
                      labelFontSize: 14,
                      titleFontSize: 14,
                      labelFont: 'FS Joey Web Regular',
                      titleFont: 'FS Joey Web Regular',
                      // 44 = offset of first gene in legend
                      // 15.5 = gene name element height
                      columns:
                          chartHeight == null
                              ? 1
                              : Math.ceil(selectedGenesIds.length / ((chartHeight - 44) / 15.5)),
                      encode: {
                          symbols: {
                              name: 'legendSymbol',
                              interactive: true,
                              update: {
                                  stroke: colorByTimeSeries
                                      ? {
                                            scale: 'colorscale',
                                            field: 'value',
                                        }
                                      : [
                                            {
                                                test: `length(data('selectedGenesIds')) < ${colorScaleLimit}`,
                                                scale: 'colorscale',
                                                field: 'value',
                                            },
                                            {
                                                value: color,
                                            },
                                        ],
                              },
                          },
                          labels: {
                              name: 'legendLabel',
                              interactive: true,
                              update: {
                                  ...(!colorByTimeSeries && {
                                      text: { scale: 'geneLookup', field: 'value' },
                                  }),
                                  fontWeight: colorByTimeSeries
                                      ? { value: 'normal' }
                                      : [
                                            {
                                                test: "indata('highlighted', 'data', datum.value) || indata('hovered', 'geneId', datum.value)",
                                                value: 'bold',
                                            },
                                            { value: 'normal' },
                                        ],
                              },
                          },
                      },
                  },
              ]
            : undefined,
        marks: [
            {
                type: 'group',
                from: {
                    facet: {
                        name: 'series',
                        data: 'table',
                        groupby: ['timeSeriesName', 'geneId'],
                    },
                },
                marks: [
                    {
                        type: 'line',
                        name: 'genesExpressionsLines',
                        from: { data: 'series' },
                        encode: {
                            enter: {
                                x: { scale: 'xscale', field: xField },
                                y: { scale: 'yscale', field: 'value' },
                                strokeWidth: { value: lineStrokeWidth },
                            },
                            update: {
                                stroke: colorByTimeSeries
                                    ? {
                                          scale: 'colorscale',
                                          field: 'timeSeriesName',
                                      }
                                    : [
                                          {
                                              test: `length(data('selectedGenesIds')) < ${colorScaleLimit}`,
                                              scale: 'colorscale',
                                              field: 'geneId',
                                          },
                                          {
                                              test: "indata('highlighted', 'data', datum.geneId)",
                                              value: highlightedColor,
                                          },
                                          {
                                              value: color,
                                          },
                                      ],
                                strokeWidth: [
                                    {
                                        test: "indata('highlighted', 'data', datum.geneId) || (indata('hovered', 'geneId', datum.geneId) && (data('hovered')[0].timeSeriesName == null || indata('hovered', 'timeSeriesName', datum.timeSeriesName)))",
                                        value: highlightedLineStrokeWidth,
                                    },
                                    { value: lineStrokeWidth },
                                ],
                                strokeDash: [
                                    {
                                        test: "indata('comparison', 'timeSeriesName', datum.timeSeriesName)",
                                        value: lineStrokeDash,
                                    },
                                    {
                                        value: [1, 0],
                                    },
                                ],
                            },
                        },
                    },
                    {
                        // Line click/hover area with transparent stroke.
                        type: 'line',
                        name: 'genesExpressionsLinesArea',
                        from: { data: 'series' },
                        encode: {
                            enter: {
                                x: { scale: 'xscale', field: xField },
                                y: { scale: 'yscale', field: 'value' },
                                strokeWidth: { value: 5 },
                                stroke: {
                                    value: '#FFFFFF',
                                },
                                strokeOpacity: { value: 0.0001 },
                                cursor: { value: 'pointer' },
                            },
                        },
                    },
                    {
                        type: 'symbol',
                        name: 'genesExpressionsPoints',
                        from: { data: 'series' },
                        encode: {
                            enter: {
                                x: { scale: 'xscale', field: xField },
                                y: { scale: 'yscale', field: 'value' },
                                tooltip: {
                                    signal: "{'Time series': datum.timeSeriesName, 'Gene': datum.geneName, 'Time': datum.label, 'Score': datum.value}",
                                },
                                cursor: { value: 'pointer' },
                            },
                            update: {
                                fill: colorByTimeSeries
                                    ? {
                                          scale: 'colorscale',
                                          field: 'timeSeriesName',
                                      }
                                    : [
                                          {
                                              test: `length(data('selectedGenesIds')) < ${colorScaleLimit}`,
                                              scale: 'colorscale',
                                              field: 'geneId',
                                          },
                                          {
                                              test: "indata('highlighted', 'data', datum.geneId)",
                                              value: highlightedColor,
                                          },
                                          {
                                              value: color,
                                          },
                                      ],
                                size: [
                                    {
                                        test: "indata('highlighted', 'data', datum.geneId) || (indata('hovered', 'geneId', datum.geneId) && (data('hovered')[0].timeSeriesName == null || indata('hovered', 'timeSeriesName', datum.timeSeriesName)))",
                                        value: 8 ** 2,
                                    },
                                    { value: 5 ** 2 },
                                ],
                            },
                        },
                    },
                ],
            },
        ],
        scales: [
            useNumericAxis
                ? {
                      name: 'xscale',
                      type: 'linear' as const,
                      range: 'width',
                      domain: { data: 'table', field: 'numericLabel' },
                      nice: true,
                      zero: true,
                  }
                : {
                      name: 'xscale',
                      type: 'point' as const,
                      range: 'width',
                      domain: { data: 'table', field: 'label' },
                  },
            {
                name: 'yscale',
                type: 'linear',
                range: 'height',
                nice: true,
                zero: true,
                domain: { data: 'table', field: 'value' },
            },
            {
                name: 'colorscale',
                type: 'ordinal',
                range: 'category',
                domain: { data: 'table', field: colorByTimeSeries ? 'timeSeriesName' : 'geneId' },
            },
            {
                name: 'geneLookup',
                type: 'ordinal',
                range: { data: 'table', field: 'geneName' },
                domain: { data: 'table', field: 'geneId' },
            },
        ],
        axes: [
            {
                scale: 'xscale',
                orient: 'bottom',
                title: 'Time [hrs]',
                tickOffset: 0,
                labelFontSize: 14,
                labelFont: 'FS Joey Web Regular',
                titleFont: 'FS Joey Web Regular',
                titleFontSize: 14,
            },
            {
                title: 'RPKM',
                grid: true,
                orient: 'left',
                scale: 'yscale',
                labelFont: 'FS Joey Web Regular',
                titleFont: 'FS Joey Web Regular',
                labelFontSize: 14,
                titleFontSize: 14,
            },
        ],
    };
};

const GeneExpressionsLineChart = forwardRef<ChartHandle, GeneExpressionsLineChartProps>(
    (
        {
            genesExpressions,
            comparisonTimeSeries,
            selectedGenesIds,
            highlightedGenesIds,
            onHighlight,
            showLegend,
            colorByTimeSeries,
        }: GeneExpressionsLineChartProps,
        forwardedRef,
    ): ReactElement => {
        const theme = useTheme();
        const chartRef = useForwardedRef<ChartHandle>(forwardedRef);
        const [chartHeight, setChartHeight] = useState<number>();

        const updatableDataDefinitions: DataDefinition[] = useStateWithEffect<DataDefinition[]>(
            () => [
                {
                    name: 'highlighted',
                    data: highlightedGenesIds,
                },
                { name: 'table', data: genesExpressions },
                { name: 'comparison', data: comparisonTimeSeries },
                { name: 'selectedGenesIds', data: selectedGenesIds },
            ],
            [genesExpressions, comparisonTimeSeries, highlightedGenesIds, selectedGenesIds],
        );

        // Data handlers that is updated (and reattached) only if highlighted variable changes.
        const dataHandlers = useStateWithEffect<DataHandler[]>(
            () => [
                {
                    name: 'highlighted',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    handler: (_name: string, value: any): void => {
                        if (value != null && value.length > 0) {
                            const chartHighlightedGenesIds = value.map(
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (geneIdObject: { data: any }) => geneIdObject.data,
                            );
                            if (_.xor(chartHighlightedGenesIds, highlightedGenesIds).length > 0) {
                                onHighlight(chartHighlightedGenesIds);
                            }
                        } else if (highlightedGenesIds.length > 0) {
                            onHighlight([]);
                        }
                    },
                },
            ],
            [highlightedGenesIds, onHighlight],
        );

        const renderSpecification = useStateWithEffect<Spec>(
            () =>
                getVegaSpecification(
                    genesExpressions,
                    comparisonTimeSeries,
                    highlightedGenesIds,
                    selectedGenesIds,
                    theme.palette.secondary.main,
                    showLegend,
                    colorByTimeSeries,
                    chartHeight,
                ),
            // eslint-disable-next-line react-hooks/exhaustive-deps
            [showLegend, colorByTimeSeries, chartHeight],
        );

        return (
            <Chart
                updatableDataDefinitions={updatableDataDefinitions}
                dataHandlers={dataHandlers}
                vegaSpecification={renderSpecification}
                onChartResized={(_width, height): void => setChartHeight(height)}
                ref={chartRef}
            />
        );
    },
);

export default GeneExpressionsLineChart;
