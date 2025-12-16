import { combineReducers, createSelector } from '@reduxjs/toolkit';
import _ from 'lodash';
import { Relation } from '@genialis/resolwe/dist/api/types/rest';
import { Gene, GeneExpression, GeneMapping, SamplesGenesExpressionsById } from './models/internal';
import timeSeries, {
    getComparisonTimeSeries,
    getSelectedTimeSeries,
    getSelectedTimeSeriesLabels,
} from 'redux/stores/timeSeries';
import genes, { getGenesById, getSelectedGenes } from 'redux/stores/genes';
import genesSimilarities, { getGenesSimilaritiesQueryGeneId } from 'redux/stores/genesSimilarities';
import samplesExpressions, {
    getSamplesExpressionsById,
    getSamplesExpressionsSamplesIds,
} from 'redux/stores/samplesExpressions';
import notifications from 'redux/stores/notifications';
import authentication from 'redux/stores/authentication';
import differentialExpressions from 'redux/stores/differentialExpressions';
import layouts from 'redux/stores/layouts';
import gOEnrichment from 'redux/stores/gOEnrichment';
import singleCellExpressions from 'redux/stores/singleCellExpressions';
import { EMPTY_ARRAY } from 'components/genexpress/common/constants';

const rootReducer = combineReducers({
    layouts,
    authentication,
    timeSeries,
    genes,
    genesSimilarities,
    samplesExpressions,
    differentialExpressions,
    gOEnrichment,
    singleCellExpressions,
    notifications,
});

export type RootState = ReturnType<typeof rootReducer>;

export type BookmarkReduxState = {
    timeSeries: Pick<RootState['timeSeries'], 'selectedId' | 'comparisonIds'>;
    genes: Pick<RootState['genes'], 'selectedGenesIds' | 'highlightedGenesIds'> & {
        source: string;
        species: string;
    };
    gOEnrichment: Pick<RootState['gOEnrichment'], 'pValueThreshold'>;
    genesSimilarities: Pick<RootState['genesSimilarities'], 'distanceMeasure' | 'queryGeneId'>;
    differentialExpressions: Pick<RootState['differentialExpressions'], 'selectedId'>;
};

export default rootReducer;

const getTimeSeriesGenesExpressions = (
    singleTimeSeries: Relation | null,
    labels: string[],
    selectedGenes: Gene[],
    samplesExpressionsById: SamplesGenesExpressionsById,
    samplesExpressionsSamplesIds: number[],
    genesMappings?: GeneMapping[],
): GeneExpression[] => {
    if (
        singleTimeSeries == null ||
        _.isEmpty(samplesExpressionsById) ||
        selectedGenes.length === 0
    ) {
        return EMPTY_ARRAY;
    }

    const newGenesExpressionsData = [] as GeneExpression[];

    labels.forEach((label) => {
        const timePointPartitions = _.flatten(
            singleTimeSeries.partitions.filter(
                (partition) => partition.label?.toLowerCase() === label.toLowerCase(),
            ),
        );

        if (
            timePointPartitions.some(
                (partition) => !samplesExpressionsSamplesIds.includes(partition.entity),
            )
        ) {
            return;
        }

        selectedGenes.forEach((gene) => {
            const values: number[] = [];

            // Gene expressions in different samples must be averaged out (mean).
            timePointPartitions.forEach((partition) => {
                if (samplesExpressionsById[partition.entity][gene.feature_id] != null) {
                    values.push(samplesExpressionsById[partition.entity][gene.feature_id]);
                } else {
                    const mappedGene = genesMappings?.find(
                        (geneMapping) => geneMapping.source_id === gene.feature_id,
                    );

                    if (
                        mappedGene != null &&
                        samplesExpressionsById[partition.entity][mappedGene.target_id] != null
                    ) {
                        values.push(samplesExpressionsById[partition.entity][mappedGene.target_id]);
                    }
                }
            });

            if (values.length > 0) {
                newGenesExpressionsData.push({
                    timeSeriesName: singleTimeSeries.collection.name,
                    label,
                    value: _.mean(values),
                    geneId: gene.feature_id,
                    geneName: gene.name,
                });
            }
        });
    });

    return newGenesExpressionsData;
};

export const getSelectedGenesExpressions = createSelector(
    (state: RootState) => getSelectedTimeSeries(state.timeSeries),
    (state: RootState) => getSelectedTimeSeriesLabels(state.timeSeries),
    (state: RootState) => getSelectedGenes(state.genes),
    (state: RootState) => getSamplesExpressionsById(state.samplesExpressions),
    (state: RootState) => getSamplesExpressionsSamplesIds(state.samplesExpressions),
    getTimeSeriesGenesExpressions,
);

export const getSelectedGenesComparisonExpressions = createSelector(
    (state: RootState) => getComparisonTimeSeries(state.timeSeries),
    (state: RootState) => getSelectedTimeSeriesLabels(state.timeSeries),
    (state: RootState) => getSelectedGenes(state.genes),
    (state: RootState) => getSamplesExpressionsById(state.samplesExpressions),
    (state: RootState) => getSamplesExpressionsSamplesIds(state.samplesExpressions),
    (
        comparisonTimeSeries,
        timeSeriesLabels,
        selectedGenes,
        samplesExpressionsById,
        samplesExpressionsSamplesIds,
    ) => {
        if (comparisonTimeSeries.length === 0) {
            return [];
        }

        return comparisonTimeSeries.flatMap((comparisonSingleTimeSeries) =>
            getTimeSeriesGenesExpressions(
                comparisonSingleTimeSeries,
                timeSeriesLabels,
                selectedGenes,
                samplesExpressionsById,
                samplesExpressionsSamplesIds,
                comparisonSingleTimeSeries.genesMappings,
            ),
        );
    },
);

export const getGenesSimilaritiesQueryGene = createSelector(
    (state: RootState) => getGenesById(state.genes),
    (state: RootState) => getGenesSimilaritiesQueryGeneId(state.genesSimilarities),
    (genesById, genesSimilaritiesQueryGeneId) => {
        if (_.isEmpty(genesById) || genesSimilaritiesQueryGeneId == null) {
            return null;
        }

        return genesById[genesSimilaritiesQueryGeneId];
    },
);
