export enum LocalStorageKey {
    geneSets = 'geneSets',
    layouts = 'layouts',
}

export enum ModulesKeys {
    timeSeriesAndGeneSelector = 'timeSeriesAndGeneSelector',
    expressionTimeCourses = 'expressionTimeCourses',
    differentialExpressions = 'differentialExpressions',
    gOEnrichment = 'gOEnrichment',
    clustering = 'clustering',
    singleCellExpressions = 'singleCellExpressions',
}

export enum LayoutBreakpoint {
    large = 'large',
    mid = 'mid',
    small = 'small',
}

export enum ClusteringLinkageFunction {
    average = 'average',
    complete = 'complete',
    single = 'single',
}

export enum DistanceMeasure {
    euclidean = 'euclidean',
    spearman = 'spearman',
    pearson = 'pearson',
}

export enum AspectValue {
    bp = 'BP',
    cc = 'CC',
    mf = 'MF',
}

export enum ProcessSlug {
    goEnrichment = 'goenrichment',
    clustering = 'clustering-hierarchical-etc',
    findSimilar = 'find-similar',
}

export enum ColorGroup {
    timeSeries = 'timeSeries',
    gene = 'gene',
}

export enum DictyUrlQueryParameter {
    appState = '_s',
    genes = 'genes',
}

export enum BookmarkStatePath {
    genesExpressionsShowLegend = 'GenesExpressions.showLegend',
    genesExpressionsColorByTimeSeries = 'GenesExpressions.colorByTimeSeries',
    gOEnrichmentSelectedAspect = 'GOEnrichment.selectedAspect',
    clusteringLinkageFunction = 'Clustering.linkageFunction',
    clusteringDistanceMeasure = 'Clustering.distanceMeasure',
}

export const EMPTY_ARRAY = [];

export enum DescriptorSchemaSlug {
    DictyTimeSeries = 'dicty-time-series',
}
