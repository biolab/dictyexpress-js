import { Data } from '@genialis/resolwe/dist/api/types/rest';

export type BasketAddSamplesResponse = {
    id: string;
    modified: string;
    ignored: number[];
    permitted_organisms: string[];
    permitted_sources: string[];
    conflict_organisms: string[];
    conflict_sources: string[];
};

export type BackendAppState<T> = {
    contributor: number;
    uuid: string;
    state: T;
};

export type BasketUpdateResponse = {
    id: string;
    modified: string;
};

export type ClusteringData = {
    output: {
        cluster: number;
    };
} & Omit<Data, 'output'>;

export type FindSimilarGenesData = {
    output: {
        similar_genes: number;
    };
} & Omit<Data, 'output'>;

export type FastFindSimilarGenesResponse = {
    'search gene'?: string;
    search_gene?: string;
    'similar genes'?: Array<{ gene: string; distance: number }>;
    similar_genes?: Array<{ gene: string; distance: number }>;
};

export type BasketExpressionRequest = {
    basket: string;
    tags?: string[];
};

export type BasketExpression = {
    id: number;
    exp_type: string;
};

export type BasketExpressionsResponse = BasketExpression[];
