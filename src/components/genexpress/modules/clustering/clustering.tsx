import { ReactElement, useEffect, useState, useRef, useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import _ from 'lodash';
import { MenuItem, SelectChangeEvent, Tooltip } from '@mui/material';
import {
    ClusteringChartContainer,
    ClusteringContainer,
    ClusteringControl,
    ClusteringControls,
} from './clustering.styles';
import ClusteringChart from './clusteringChart';
import { clusterByGenes } from './utils';
import { getSelectedGenesExpressions, RootState } from 'redux/rootReducer';
import { genesHighlighted, getHighlightedGenesIds, getSelectedGenes } from 'redux/stores/genes';
import { ClusterNode, Option } from 'redux/models/internal';
import DictySelect from 'components/genexpress/common/dictySelect/dictySelect';
import useReport from 'components/genexpress/common/reportBuilder/useReport';
import { advancedJoin } from 'utils/arrayUtils';
import { ChartHandle } from 'components/genexpress/common/chart/chart';
import {
    DistanceMeasure,
    ClusteringLinkageFunction,
    BookmarkStatePath,
} from 'components/genexpress/common/constants';
import useBookmarkableState from 'components/genexpress/common/useBookmarkableState';

const mapStateToProps = (state: RootState) => {
    return {
        highlightedGenesIds: getHighlightedGenesIds(state.genes),
        selectedGenes: getSelectedGenes(state.genes),
        genesExpressions: getSelectedGenesExpressions(state),
    };
};

const connector = connect(mapStateToProps, {
    connectedGenesHighlighted: genesHighlighted,
});

type PropsFromRedux = ConnectedProps<typeof connector>;

export const distanceMeasureOptions: Option<DistanceMeasure>[] = [
    { value: DistanceMeasure.euclidean, label: 'Euclidean' },
    { value: DistanceMeasure.pearson, label: 'Pearson' },
    { value: DistanceMeasure.spearman, label: 'Spearman' },
];

export const linkageFunctionOptions: Option<ClusteringLinkageFunction>[] = [
    { value: ClusteringLinkageFunction.single, label: 'Single' },
    { value: ClusteringLinkageFunction.average, label: 'Average' },
    { value: ClusteringLinkageFunction.complete, label: 'Complete' },
];

const Clustering = ({
    genesExpressions,
    selectedGenes,
    highlightedGenesIds,
    connectedGenesHighlighted,
}: PropsFromRedux): ReactElement => {
    const chartRef = useRef<ChartHandle>(null);

    const [distanceMeasure, setDistanceMeasure] = useBookmarkableState<DistanceMeasure>(
        DistanceMeasure.euclidean,
        BookmarkStatePath.clusteringDistanceMeasure,
    );
    const [linkageFunction, setLinkageFunction] = useBookmarkableState<ClusteringLinkageFunction>(
        ClusteringLinkageFunction.average,
        BookmarkStatePath.clusteringLinkageFunction,
    );
    const [clusterByGenesResult, setClusterByGenesResult] =
        useState<ReturnType<typeof clusterByGenes>>();
    const [highlightedClusterNodesIds, setHighlightedClusterNodesIds] = useState<number[]>([]);

    useEffect(() => {
        const mergedData = clusterByGenes(genesExpressions, distanceMeasure, linkageFunction);

        setClusterByGenesResult(mergedData);
    }, [distanceMeasure, genesExpressions, linkageFunction]);

    useEffect(() => {
        /* ClusterNode is highlighted if:
         * - all it's children lead to leafs with highlighted genes.
         * - it's gene is among highlighted genes (if node has a gene, it's a leaf node).
         */
        if (
            clusterByGenesResult != null &&
            clusterByGenesResult.clusterNodes != null &&
            !_.isEmpty(clusterByGenesResult.clusterNodes)
        ) {
            const getAllHighlighted = (
                highlightedNodes: ClusterNode[],
                allHighlightedNodes = [...highlightedNodes],
            ): ClusterNode[] => {
                const highlightedParentNodes = [] as ClusterNode[];
                const groupedByParent = _.groupBy(
                    // Exclude nodes without a parent.
                    highlightedNodes.filter((node) => node.parent),
                    (node) => node.parent?.nodeIndex,
                );
                // For each highlighted node, check if all it's siblings are also highlighted
                // and mark parent.
                _.map(groupedByParent, (highlightedSiblings, highlightedParentNodeIndex) => {
                    const siblings = clusterByGenesResult.clusterNodes.filter(
                        (clusterNode) =>
                            clusterNode.parent?.nodeIndex.toString() === highlightedParentNodeIndex,
                    );
                    if (_.every(siblings, (sibling) => allHighlightedNodes.includes(sibling))) {
                        allHighlightedNodes.push(highlightedSiblings[0].parent as ClusterNode);
                        highlightedParentNodes.push(highlightedSiblings[0].parent as ClusterNode);
                    }
                });

                if (highlightedParentNodes.length > 0) {
                    getAllHighlighted(highlightedParentNodes, allHighlightedNodes);
                }
                return allHighlightedNodes;
            };

            // Get highlighted leaf cluster nodes (with gene).
            const leafHighlightedClusterNodes = clusterByGenesResult.clusterNodes.filter(
                (clusterNode) =>
                    clusterNode.geneId != null && highlightedGenesIds.includes(clusterNode.geneId),
            );

            // Get all highlighted ancestor nodes.
            const allHighlightedNodes = getAllHighlighted(leafHighlightedClusterNodes);
            setHighlightedClusterNodesIds(
                allHighlightedNodes.map((clusterNode) => clusterNode.nodeIndex),
            );
        }
    }, [clusterByGenesResult, highlightedGenesIds]);

    const getClusterNodeChildren = (parentClusterNode: ClusterNode): ClusterNode[] => {
        if (clusterByGenesResult?.clusterNodes == null) {
            return [];
        }
        const childrenNodes = clusterByGenesResult.clusterNodes.filter(
            (clusterNode) => clusterNode.parent === parentClusterNode,
        );

        return [
            ...childrenNodes,
            ...childrenNodes.flatMap((childNode) => getClusterNodeChildren(childNode)),
        ];
    };

    const getClusterNodesChildren = (parentClusterNodes: ClusterNode[]): ClusterNode[] => {
        return parentClusterNodes.reduce((childNodes, clusterNode) => {
            return [...childNodes, ...getClusterNodeChildren(clusterNode)];
        }, [] as ClusterNode[]);
    };

    const handleOnHighlightedChanged = (chartHighlightedClusterNodesIds: number[]): void => {
        if (clusterByGenesResult?.clusterNodes == null) {
            return;
        }
        const chartHighlightedClusterNodes = clusterByGenesResult.clusterNodes.filter(
            (clusterNode) => chartHighlightedClusterNodesIds.includes(clusterNode.nodeIndex),
        );

        const highlightedClusterNodes = [
            ...chartHighlightedClusterNodes,
            ...getClusterNodesChildren(chartHighlightedClusterNodes),
        ];
        setHighlightedClusterNodesIds(
            highlightedClusterNodes.map((clusterNode) => clusterNode.nodeIndex),
        );

        connectedGenesHighlighted(
            highlightedClusterNodes
                .filter((clusterNode) => clusterNode.geneId != null)
                .map((clusterNode) => clusterNode.geneId) as string[],
        );
    };

    const getCaption = useCallback((): string => {
        const distanceNames = {
            spearman: "Spearman's rank correlation coefficient",
            pearson: "Pearson's correlation coefficient",
            euclidean: 'Euclidean distance',
        };
        const distance = distanceNames[distanceMeasure];
        const linkage = linkageFunction;

        const genes = advancedJoin(_.map(selectedGenes, ({ name }) => name));

        return `
Hierarchical Clustering plotted as a dendrogram is showing clusters of samples.
Distance between samples was measured with ${distance} (distance metric) and ${linkage}-linkage clustering (linkage criterion).

Clustering was done on ${selectedGenes.length === 0 ? 'all genes' : `selected genes (${genes})`}.
    `.trim();
    }, [distanceMeasure, linkageFunction, selectedGenes]);

    useReport(
        async (processFile) => {
            if (clusterByGenesResult?.clusterNodes?.length === 0) {
                return;
            }

            if (chartRef.current != null) {
                processFile(
                    'Sample Hierarchical Clustering/image.png',
                    await chartRef.current.getPngImage(),
                    true,
                );
                processFile(
                    'Sample Hierarchical Clustering/image.svg',
                    await chartRef.current.getSvgImage(),
                    true,
                );
                processFile('Sample Hierarchical Clustering/caption.txt', getCaption(), false);
            }
        },
        [clusterByGenesResult?.clusterNodes?.length, getCaption],
    );

    return (
        <>
            <ClusteringContainer>
                <ClusteringControls>
                    <Tooltip
                        title={
                            selectedGenes.length < 2
                                ? "The {Pearson/Spearman}  Hierarchical clustering can't be enabled until at least two genes are selected."
                                : ''
                        }
                    >
                        <ClusteringControls>
                            <ClusteringControl>
                                <DictySelect
                                    disabled={selectedGenes.length < 2}
                                    label="Distance Measure"
                                    value={distanceMeasure}
                                    handleOnChange={(event: SelectChangeEvent<unknown>): void => {
                                        setDistanceMeasure(event.target.value as DistanceMeasure);
                                    }}
                                    data-tutorial="clustering-distance-measure-dropdown"
                                >
                                    {distanceMeasureOptions.map((distanceMeasureOption) => (
                                        <MenuItem
                                            value={distanceMeasureOption.value}
                                            key={distanceMeasureOption.value}
                                        >
                                            {distanceMeasureOption.label}
                                        </MenuItem>
                                    ))}
                                </DictySelect>
                            </ClusteringControl>
                            <ClusteringControl>
                                <DictySelect
                                    disabled={selectedGenes.length < 2}
                                    label="Clustering Linkage"
                                    value={linkageFunction}
                                    handleOnChange={(event: SelectChangeEvent<unknown>): void => {
                                        setLinkageFunction(
                                            event.target.value as ClusteringLinkageFunction,
                                        );
                                    }}
                                >
                                    {linkageFunctionOptions.map((linkageFunctionOption) => (
                                        <MenuItem
                                            value={linkageFunctionOption.value}
                                            key={linkageFunctionOption.value}
                                        >
                                            {linkageFunctionOption.label}
                                        </MenuItem>
                                    ))}
                                </DictySelect>
                            </ClusteringControl>
                        </ClusteringControls>
                    </Tooltip>
                </ClusteringControls>
                {clusterByGenesResult != null &&
                    clusterByGenesResult.clusterNodes != null &&
                    clusterByGenesResult.clusterNodes.length > 0 && (
                        <ClusteringChartContainer>
                            <ClusteringChart
                                clusterNodes={clusterByGenesResult?.clusterNodes}
                                genesExpressions={genesExpressions}
                                highlightedClusterNodesIds={highlightedClusterNodesIds}
                                onHighlightedChanged={handleOnHighlightedChanged}
                                ref={chartRef}
                            />
                        </ClusteringChartContainer>
                    )}
                {selectedGenes.length === 0 && `Select two or more genes.`}
                {selectedGenes.length === 1 &&
                    `Correlation between samples cannot be computed on a single gene.
                    Select more genes.`}
                {clusterByGenesResult?.withoutValues != null &&
                    clusterByGenesResult.withoutValues.length > 0 && (
                        <>
                            ({clusterByGenesResult.withoutValues.length} of the selected genes (
                            {advancedJoin(
                                clusterByGenesResult.withoutValues
                                    .slice(0, 3)
                                    .map(
                                        (geneId) =>
                                            selectedGenes.find((gene) => gene.feature_id === geneId)
                                                ?.name,
                                    ),
                            )}
                            ) are missing in at least one of the selected samples. Those genes are
                            excluded from the computation of hierarchical clustering of genes.)
                        </>
                    )}
                {clusterByGenesResult?.allConstantValues != null &&
                    clusterByGenesResult.allConstantValues.length > 0 && (
                        <>
                            {clusterByGenesResult.allConstantValues.length} of the selected genes (
                            {advancedJoin(
                                clusterByGenesResult.allConstantValues
                                    .slice(0, 3)
                                    .map(
                                        (geneId) =>
                                            selectedGenes.find((gene) => gene.feature_id === geneId)
                                                ?.name,
                                    ),
                            )}
                            ) have constant expression across samples. Those genes are excluded from
                            the computation of hierarchical clustering of genes with correlation
                            distance metric.
                        </>
                    )}
            </ClusteringContainer>
        </>
    );
};

export default connector(Clustering);
