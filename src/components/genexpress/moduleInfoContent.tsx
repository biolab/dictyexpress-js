import { ReactNode } from 'react';

export const timeSeriesInfo: ReactNode = (
    <div>
        <p>
            Select a time-series dataset and build your gene list. Most other modules are disabled
            until a time series is selected.
        </p>
        <p>
            <b>Filter</b> and sort experiments by Project, Details, Strain, Treatment, Growth, or
            Citation. Scroll right to view additional columns in the table. Search genes with{' '}
            <b>autocomplete</b> by name or DDB ID, or <b>paste</b> / <b>drag-and-drop</b> a list to
            bulk-import. <b>Save</b> gene sets to local storage and reload them via <b>History</b>.
        </p>
        <p>
            <b>How to use</b>
        </p>
        <ul>
            <li>Click a row in the table to select a time series.</li>
            <li>Type in the gene search box or paste/drop a gene list.</li>
            <li>Click a gene chip to view details or highlight it.</li>
            <li>Use Copy, Clear all, Save, and History to manage your list.</li>
        </ul>
    </div>
);

export const expressionTimeCoursesInfo: ReactNode = (
    <div>
        <p>
            Visualize gene expression (<b>RPKM</b>) over developmental time for your selected genes.
            Each line represents one gene across time points.
        </p>
        <p>
            Use <b>Find Similar Genes</b> to discover genes with correlated expression (Euclidean,
            Pearson, or Spearman), and <b>Compare To</b> to overlay curves from other datasets.
            Toggle <b>Color by time series</b> and <b>Legend</b> for multi-dataset views.
        </p>
        <p>
            <b>How to use</b>
        </p>
        <ul>
            <li>Hover over a data point to reveal detailed information.</li>
            <li>Click a line to highlight that gene across all modules.</li>
            <li>
                Click Find Similar Genes, pick a query gene and distance, then Select to add
                results.
            </li>
            <li>Click Compare To to overlay additional time series.</li>
        </ul>
        <p>
            <b>Tip:</b> If no plot appears, ensure a time series and at least one gene are selected
            in Time Series and Gene Selection module.
        </p>
    </div>
);

export const differentialExpressionsInfo: ReactNode = (
    <div>
        <p>
            Explore differential gene expression with an interactive volcano plot. The <b>x-axis</b>{' '}
            shows log2(Fold Change) and the <b>y-axis</b> shows −log10(FDR or p-value). In the
            cell-type selections, genes on the right are enriched in prespore cells and genes on the
            left are enriched in prestalk cells.
        </p>
        <p>
            Adjust <b>Fold Change</b> and <b>FDR</b> thresholds to filter significant genes. Toggle{' '}
            <b>Outliers</b> to expand the x-axis range. <b>Brush-select</b> points to add genes to
            your list.
        </p>
        <p>
            <b>How to use</b>
        </p>
        <ul>
            <li>Choose a dataset from the dropdown.</li>
            <li>
                Click and drag on the plot to select genes; a table opens where you can append or
                replace your gene list.
            </li>
            <li>Hover over points to see gene name and exact values.</li>
        </ul>
        <p>
            <b>Tip:</b> Selection is disabled if the organism in the time series doesn't match the
            differential expression dataset.
        </p>
    </div>
);

export const goEnrichmentInfo: ReactNode = (
    <div>
        <p>
            Identify Gene Ontology (GO) terms enriched in your gene list. Enrichment is computed for{' '}
            <b>highlighted genes</b> if any, otherwise for all <b>selected genes</b>.
        </p>
        <p>
            Choose an <b>Aspect</b> (Biological Process, Molecular Function, or Cellular Component)
            and set a <b>p-value</b> threshold. View results as a <b>Hierarchy</b> tree or{' '}
            <b>Flat</b> sortable grid.
        </p>
        <p>
            <b>How to use</b>
        </p>
        <ul>
            <li>Click a term row to collapse/expand children in tree view.</li>
            <li>Click Flat/Hierarchy to toggle between views.</li>
            <li>
                Click the number in the N column to see associated genes and add them to your list.
            </li>
            <li>The associations modal links to AmiGO for details.</li>
        </ul>
        <p>
            <b>Tip:</b> If no terms are found, try selecting more genes, changing the aspect, or
            relaxing the p-value threshold.
        </p>
    </div>
);

export const clusteringInfo: ReactNode = (
    <div>
        <p>
            Cluster genes by expression similarity and visualize as a dendrogram with heatmap.
            Requires <b>at least two genes</b>.
        </p>
        <p>
            Choose a <b>Distance Measure</b> (Euclidean, Pearson, or Spearman) and{' '}
            <b>Clustering Linkage</b> (Single, Average, or Complete). The <b>heatmap</b> shows
            expression values across time points alongside the dendrogram.
        </p>
        <p>
            <b>How to use</b>
        </p>
        <ul>
            <li>Click a branch to highlight genes in that cluster.</li>
            <li>Ctrl/Cmd + click to multi-select; click empty space to clear.</li>
            <li>Hover over heatmap cells to see time point and value.</li>
        </ul>
        <p>
            <b>Tip:</b> Highlighted genes propagate to other modules (e.g., GO Enrichment uses
            highlighted genes).
        </p>
    </div>
);

export const singleCellInfo: ReactNode = (
    <div>
        <p>Explore single-cell RNA-seq data on a UMAP projection.</p>
        <p>
            <b>About the data</b>
        </p>
        <p>
            Data are provided for AX4 (the laboratory wild type) and two mutant strains: <i>acaA</i>
            − and <i>acaA</i>− <i>pkaC</i>OE. Cells were grown axenically, developed on black
            nitrocellulose filters, and collected after 0, 4, 8, 12, 16, and 20 hours of
            development. Samples were processed for scRNA-seq using Chromium Single Cell Gene
            Expression kits (10x Genomics) and embedded using the four-layer Universal Cell
            Embedding (UCE) model{' '}
            <a href="https://doi.org/10.1101/2023.11.28.568918" target="_blank" rel="noreferrer">
                (Rosen et al., 2024)
            </a>
            . The resulting cell embeddings were visualized in two dimensions using UMAP and
            clustered with Leiden. Mutant strains are mapped to the AX4 reference embedding space.
        </p>
        <p>
            <b>How to use</b>
        </p>
        <ul>
            <li>Select a strain from the Strain dropdown.</li>
            <li>Choose Color by: Expression (gene intensity), Time (0–20 hr), or Cell type.</li>
            <li>When a gene is selected, cells expressing it appear at higher color intensity.</li>
            <li>Toggle Legend for color interpretation.</li>
        </ul>
        <p>
            <b>Contact:</b> <a href="mailto:gadi@bcm.edu">gadi@bcm.edu</a> for questions. Additional
            dataset details will be available upon manuscript publication.
        </p>
    </div>
);
