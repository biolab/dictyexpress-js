import {
    DataDifferentialExpression,
    GOEnrichmentJson,
    GOEnrichmentNode,
    Relation,
    Storage,
} from '@genialis/resolwe/dist/api/types/rest';
import { Feature } from '@genialis/resolwe/dist/api/types/modules';
import { VariantType, SnackbarKey, SnackbarAction } from 'notistack';
import { Renderers } from 'vega';
import { LayoutBreakpoint, ProcessSlug } from 'components/genexpress/common/constants';

export type Gene = Pick<
    Feature,
    'feature_id' | 'aliases' | 'name' | 'full_name' | 'description' | 'source' | 'species'
>;

export type RelationsById = Record<
    Relation['id'],
    Relation & { genesMappings?: GeneMapping[]; basketInfo?: BasketInfo }
>;

export type GenesById = Record<Gene['feature_id'], Gene>;

export type BasketInfo = {
    id: string;
    source: string;
    species: string;
    type: 'gene';
};

export type GeneExpression = {
    timeSeriesName: string;
    geneId: string;
    geneName: string;
    label: string;
    value: number;
};

export type GenesExpressionById = {
    [geneId: string]: number;
};

export type SamplesGenesExpressionsById = {
    [sampleId: number]: GenesExpressionById;
};

export type BasketExpression = {
    id: number;
    exp_type: string;
};

export type MergedClusteringData = {
    order: Array<{
        nodeIndex: number;
        order: number;
        gene: Gene;
    }>;
    linkage: Array<{
        nodeIndex: number;
        node1: number;
        node2: number;
        distance: number;
    }>;
};

export type Coordinates = {
    x: number;
    y: number;
};

export type ClusterNode = {
    nodeIndex: number;
    parent?: ClusterNode;
    geneName?: Gene['name'];
    geneId?: Gene['feature_id'];
    expressions?: Pick<GeneExpression, 'label' | 'value'>[];
} & Coordinates;

export type GeneSet = {
    dateTime: Date;
    genesNames: Gene['name'][];
};

export type VolcanoPoint = {
    geneId: Gene['feature_id'];
    geneName: Gene['feature_id'];
    logFcValue: number;
    // The plotted y value: -log10(prob), or |Cohen's d| for a marker ranking.
    logProbValue: number;
    logProbFiniteValue: number;
    probValue: number;
    // Marker rankings only: Cohen's d, the pseudobulk test across replicates (null when not
    // tested), and the per-cell test, whose p-values are far below 1e-308 and kept as -log10.
    effectSize?: number;
    replicatePValue?: number | null;
    replicateFdr?: number | null;
    negLog10Prob?: number;
    negLog10Fdr?: number;
};

export type Thresholds = {
    pValue: number;
    pValueLog: number;
    fc: number;
    fcLog: number;
};

export type DifferentialExpression = {
    logfc_threshold: number;
    prob_field: string;
    prob_threshold: number;
    up_regulated: number;
    down_regulated: number;
    // Shown under the selector, e.g. how to read a result computed in the app.
    note?: string;
    // A marker ranking plots |Cohen's d| instead of -log10(prob); see
    // singleCellExpressions/cellSelectionDifferentialExpression.ts.
    kind?: 'markers';
    effect_size_threshold?: number;
} & DataDifferentialExpression &
    Partial<Storage['json']>;

export type DifferentialExpressionsById = {
    [differentialExpressionId: number]: DifferentialExpression;
};

export type Option<T> = {
    value: T;
    label: string;
};

export type EnhancedGOEnrichmentJson = {
    tree: {
        [aspectSlug: string]: GOEnrichmentRow[];
    };
} & Omit<GOEnrichmentJson, 'tree'>;

export type GOEnrichmentRow = {
    path: string[];
    children?: GOEnrichmentRow[];
    score_percentage: number;
    gene_associations: string[];
} & Omit<GOEnrichmentNode, 'children'>;

export type GOEnrichmentTerm = {
    p_value: GOEnrichmentNode['pval'];
    score: GOEnrichmentNode['score'];
    selected_gene_associations_number: GOEnrichmentNode['matched'];
    selected_gene_associations_names?: string[];
    all_gene_associations_number: GOEnrichmentNode['total'];
    term_id: GOEnrichmentNode['term_id'];
    term_name: GOEnrichmentNode['term_name'];
    source: GOEnrichmentNode['source'];
    species: GOEnrichmentNode['species'];
    selected_gene_associations: GOEnrichmentNode['gene_ids'];
};

export type GeneMapping = {
    source_db: string;
    source_id: string;
    target_db: string;
    target_id: string;
};

// If key is undefined, it will be generated in the reducer.
export type SnackbarNotificationContent = {
    key?: SnackbarKey;
    message: string;
    variant?: VariantType;
    action?: SnackbarAction;
};

// TODO, is this the correct way of going about making only one property required?
export type SnackbarNotification = {
    key: SnackbarKey;
} & Pick<SnackbarNotificationContent, 'message' | 'variant' | 'action'>;

export type SnackbarNotifications = SnackbarNotification[];

export type DictyRenderers = Exclude<Renderers, 'none'>;

export type BreakpointsCols = { [key in keyof typeof LayoutBreakpoint]: number };
export type ProcessInfo = { name: string; slug: ProcessSlug };
export type GeneSimilarity = { gene: string; distance: number };

export class ResponseError extends Error {
    response: Response;

    constructor(response: Response) {
        super(`${response.status} - ${response.statusText}`);
        this.response = response;
    }
}

export type BookmarkComponentsState = {
    [componentId: string]: { [field: string]: unknown };
};
