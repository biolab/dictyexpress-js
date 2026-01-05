import { Step, Placement } from 'react-joyride';
import HCGif from 'images/clustering-demo.gif';

export const TUTORIAL_TARGETS = {
    allModules: '[data-tutorial="all-modules"]',
    timeSeriesModule: '[data-tutorial="time-series-module"]',
    geneSearchInput: '[data-tutorial="gene-search-input"]',
    expressionModule: '[data-tutorial="expression-module"]',
    differentialModule: '[data-tutorial="differential-module"]',
    volcanoSelectionModal: '[aria-labelledby="modalTitle"]',
    goEnrichmentModule: '[data-tutorial="go-enrichment-module"]',
    singleCellModule: '[data-tutorial="single-cell-module"]',
    singleCellColorDropdown: '[data-tutorial="single-cell-color-dropdown"]',
    singleCellStrainDropdown: '[data-tutorial="single-cell-strain-dropdown"]',
    clusteringModule: '[data-tutorial="clustering-module"]',
    clusteringDistanceMeasureDropdown: '[data-tutorial="clustering-distance-measure-dropdown"]',
    bookmarkButton: '[data-tutorial="bookmark-button"]',
    exportButton: '[data-tutorial="export-button"]',
    defaultLayoutButton: '[data-tutorial="default-layout-button"]',
} as const;

export type LayoutMode = 'large' | 'mid' | 'small';

// Placement config: { large, mid, small } - defaults to 'bottom' if not specified
const placements: Record<string, Partial<Record<LayoutMode, Placement>>> = {
    body: {
        large: 'center' as Placement,
        mid: 'center' as Placement,
        small: 'center' as Placement,
    },
    [TUTORIAL_TARGETS.timeSeriesModule]: { large: 'right-start', mid: 'right-start' },
    [`${TUTORIAL_TARGETS.timeSeriesModule}:gene-search`]: { large: 'right-end', mid: 'right-end' },
    [TUTORIAL_TARGETS.expressionModule]: { large: 'left', mid: 'bottom' },
    [TUTORIAL_TARGETS.singleCellModule]: { large: 'left', mid: 'left' },
    [TUTORIAL_TARGETS.differentialModule]: { large: 'right', mid: 'right' },
    [TUTORIAL_TARGETS.goEnrichmentModule]: { large: 'left', mid: 'left', small: 'top' },
    [TUTORIAL_TARGETS.clusteringModule]: { large: 'left', mid: 'top' },
    [TUTORIAL_TARGETS.volcanoSelectionModal]: {
        large: 'right',
        mid: 'right',
        small: 'right',
    },
    [`${TUTORIAL_TARGETS.volcanoSelectionModal}:select-all`]: {
        large: 'left',
        mid: 'left',
        small: 'left',
    },
};

export const getPlacement = (target: string, mode: LayoutMode, key?: string): Placement =>
    placements[key || target]?.[mode] || 'bottom';

export const tutorialSteps: Step[] = [
    // Step 0: Welcome
    {
        target: 'body',
        content: (
            <>
                Welcome to dictyExpress! This tutorial will guide you through the main features of
                the application. Let's explore how to analyze gene expression data in{' '}
                <i>Dictyostelium</i>.
            </>
        ),
        placement: 'center',
        disableBeacon: true,
        title: 'Welcome to dictyExpress',
    },
    // Step 1: Select time series (interactive)
    {
        target: TUTORIAL_TARGETS.timeSeriesModule,
        content: (
            <>
                Start by selecting a dataset. Find <b>"02. Filter Development vs. cAMP Pulsing"</b>{' '}
                with <b>"Filter development"</b> details.
                <br />
                <br />
                This dataset (Rosengarten et al., 2015) tracks gene expression over 24 hours as
                starved amoebae aggregate via cAMP signaling, form a migrating slug, and
                differentiate into a fruiting body with spores and stalk cells.
                <br />
                <br />
                <b>Click the highlighted row to continue.</b>
            </>
        ),
        title: 'Select a Time Series',
        spotlightClicks: true,
    },
    // Step 2: Search gene (interactive)
    {
        target: TUTORIAL_TARGETS.timeSeriesModule,
        content: (
            <>
                Now search for{' '}
                <b>
                    <i>ecmA</i>
                </b>
                , a classic prestalk marker that encodes an extracellular matrix protein.
                <br />
                <br />
                <b>Type "ecmA"</b> in the search box and <b>select it</b> from the dropdown above
                the search box.
            </>
        ),
        title: (
            <>
                Search for <i>ecmA</i>
            </>
        ),
        spotlightClicks: true,
        data: { placementKey: `${TUTORIAL_TARGETS.timeSeriesModule}:gene-search` },
    },
    // Step 3: Expression module
    {
        target: TUTORIAL_TARGETS.expressionModule,
        content: (
            <>
                This module shows the mRNA abundance (gene expression) over time.
                <br />
                <br />
                Notice that <i>ecmA</i> expression rises sharply during development, reflecting
                prestalk cell differentiation. Hover over the line to see exact mRNA abundance
                values.
            </>
        ),
        title: 'Expression Time Courses',
    },
    // Step 4: Single cell intro
    {
        target: TUTORIAL_TARGETS.singleCellModule,
        content: (
            <>
                Unlike other modules which are gene-centric, this one is <b>cell-centric</b>: each
                dot represents a single cell, positioned by UMAP based on its expression profile.
                <br />
                <br />
                Currently it is showing wild-type AX4 cells. Notice how <i>ecmA</i> expressing cells
                cluster together. These are committed prestalk cells. Hover over a cell to see its
                cell type and the mRNA abundance of the selected gene.
            </>
        ),
        title: 'Single-Cell Expression',
    },
    // Step 5: Color by time (interactive)
    {
        target: TUTORIAL_TARGETS.singleCellModule,
        content: (
            <>
                Let's see when differentiation begins by coloring cells by collection time.
                <br />
                <br />
                <b>Click the "Color by" dropdown and select "Time".</b>
            </>
        ),
        title: 'Color by Time',
        spotlightClicks: true,
    },
    // Step 6: Timing observation
    {
        target: TUTORIAL_TARGETS.singleCellModule,
        content: (
            <>
                The UMAP now reveals developmental timing: differentiation initiates around 12 hours
                post-starvation.
                <br />
                <br />
                Hover over cells to see their timepoints, cell fates, and expression levels. Cells
                that express <i>ecmA</i> appear brighter than cells that do not express it.
            </>
        ),
        title: 'Developmental Timing',
    },
    // Step 7: Color by Cell type (interactive)
    {
        target: TUTORIAL_TARGETS.singleCellModule,
        content: (
            <>
                Now let's explore the different cell types in this dataset.
                <br />
                <br />
                <b>Click the "Color by" dropdown and select "Cell type".</b>
            </>
        ),
        title: 'Color by Cell Type',
        spotlightClicks: true,
    },
    // Step 8: Compare strains (interactive)
    {
        target: TUTORIAL_TARGETS.singleCellModule,
        content: (
            <>
                Notice how the prestalk cells shine brighter—they express <i>ecmA</i> strongly.
                <br />
                <br />
                Let's examine the expression of <i>ecmA</i> in a knockout strain. In <i>acaA-</i>{' '}
                cells, the gene encoding adenylyl cyclase A has been deleted, disrupting cAMP
                signaling during aggregation.
                <br />
                <br />
                <b>Click the "Strain" dropdown and select "acaA-".</b>
            </>
        ),
        title: 'Compare Strains',
        spotlightClicks: true,
    },
    // Step 9: Mutant effect (interactive)
    {
        target: TUTORIAL_TARGETS.singleCellModule,
        content: (
            <>
                See the difference? The <i>acaA-</i> cells remain stuck on the right. Without cAMP
                relay, they can't aggregate or differentiate into prestalk/prespore fates.
                <br />
                <br />
                <b>Change the strain back to "AX4" to continue.</b>
            </>
        ),
        title: 'Mutant Phenotype',
        spotlightClicks: true,
    },
    // Step 10: Differential expression intro
    {
        target: TUTORIAL_TARGETS.differentialModule,
        content: (
            <>
                This volcano plot compares gene expression between cell types. We're viewing{' '}
                <b>prespore vs. prestalk</b> cells and the dots on the plot now represent the genes.
                <br />
                <br />
                Find <i>ecmA</i> on the left: it's preferentially expressed in prestalk cells, as
                expected for a prestalk marker.
            </>
        ),
        title: 'Differential Expression',
    },
    // Step 11: Select genes (interactive)
    {
        target: TUTORIAL_TARGETS.differentialModule,
        content: (
            <>
                Now let's find genes upregulated in prespore cells (the <b>upper right</b> region).
                <br />
                <br />
                <b>Click and drag</b> to select genes in that region.
            </>
        ),
        title: 'Select Prespore Genes',
        spotlightClicks: true,
    },
    // Step 12: Review modal (interactive)
    {
        target: TUTORIAL_TARGETS.volcanoSelectionModal,
        content: (
            <>
                Here you can review your selection.
                <br />
                <br />
                To focus only on these new genes (instead of adding them to <i>ecmA</i>),{' '}
                <b>uncheck</b> "Append selected genes to Genes module".
            </>
        ),
        title: 'Review Selection',
        spotlightClicks: true,
    },
    // Step 13: Select all (interactive)
    {
        target: TUTORIAL_TARGETS.volcanoSelectionModal,
        content: (
            <>
                <b>Click "Select all"</b> to add these genes to your analysis.
            </>
        ),
        title: 'Confirm Selection',
        spotlightClicks: true,
        data: { placementKey: `${TUTORIAL_TARGETS.volcanoSelectionModal}:select-all` },
    },
    // Step 14: Clustering (interactive)
    {
        target: TUTORIAL_TARGETS.clusteringModule,
        content: (
            <>
                Hierarchical Clustering groups genes with similar expression patterns. Currently,
                Euclidean distance is selected, which compares absolute expression levels.
                <br />
                <br />
                For developmental data, Spearman correlation is often more useful because it focuses
                on whether genes rise or fall together over time, regardless of their magnitude.
                <br />
                <br />
                <b>Click the "Distance Measure" dropdown and select "Spearman".</b>
            </>
        ),
        title: 'Hierarchical Clustering',
        spotlightClicks: true,
    },
    // Step 15: Select cluster
    {
        target: TUTORIAL_TARGETS.clusteringModule,
        content: (
            <>
                Click anywhere on the dendrogram to highlight a cluster of co-expressed genes.
                <br />
                <br />
                <div style={{ textAlign: 'center' }}>
                    <img src={HCGif} alt="Hierarchical clustering demo" style={{ width: '40%' }} />
                </div>
                <br />
                <b>Select a cluster, then click Next.</b>
            </>
        ),
        title: 'Select a Cluster',
    },
    // Step 16: Cross-module analysis
    {
        target: 'body',
        content: (
            <>
                Notice how selecting a cluster updates all modules simultaneously. This is the power
                of dictyExpress: you can explore the same genes from multiple perspectives.
                <br />
                <br />
                Check the <b>Expression Time Courses</b> to see how these co-clustered genes share
                temporal dynamics. Look at the <b>Single Cell view</b> to see which cells express
                them. Click on the genes in the <b>Time series and Gene selection module</b> to
                learn more about them.
            </>
        ),
        title: 'Cross-Module Analysis',
        placement: 'left',
        disableBeacon: true,
        disableOverlay: true,
        spotlightClicks: false,
        styles: {
            tooltip: {
                position: 'fixed',
                right: 'calc(-49vw)',
                bottom: 'calc(-49vh + 10px)',
                width: '400px',
                maxWidth: '400px',
            },
        },
        data: { customOverlay: true },
    },
    // Step 17: GO Enrichment
    {
        target: TUTORIAL_TARGETS.goEnrichmentModule,
        content: (
            <>
                Gene Ontology Enrichment reveals biological themes in your gene set. Each row is a
                GO term; the <b>Score</b> reflects how many genes belong to that term and how
                unlikely that overlap is by chance.
                <br />
                <br />
                Use enriched terms to understand your genes: Biological Processes show pathways,
                Cellular Components show subcellular locations, and Molecular Functions show
                biochemical roles. Click the <b>N column</b> to see which genes drive each
                enrichment. Switch between aspects using the dropdown.
            </>
        ),
        title: 'Gene Ontology Enrichment',
    },
    // Step 18: Closing
    {
        target: 'body',
        content: (
            <>
                You're ready to explore on your own!
                <br />
                <br />
                <ul style={{ margin: '0 0 0 16px', padding: 0 }}>
                    <li>Drag module headers to rearrange the layout</li>
                    <li>Resize modules by dragging their edges</li>
                    <li>Bookmark to save and share your analysis</li>
                    <li>Export results as a ZIP with charts and data</li>
                </ul>
            </>
        ),
        placement: 'center',
        title: 'Happy Exploring!',
    },
];
