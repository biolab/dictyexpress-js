import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import _ from 'lodash';
import { MockStoreEnhanced } from 'redux-mock-store';
import GOEnrichment, { aspectOptions } from './gOEnrichment';
import {
    customRender,
    handleCommonRequests,
    resolveStringifiedObjectPromise,
    validateExportFile,
} from 'tests/test-utils';
import {
    testState,
    mockStore,
    generateGenesById,
    generateGeneOntologyStorageJson,
    generateGOEnrichmentRow,
} from 'tests/mock';
import { RootState } from 'redux/rootReducer';
import { EnhancedGOEnrichmentJson } from 'redux/models/internal';
import * as reportBuilder from 'components/genexpress/common/reportBuilder/reportBuilder';
import { AppDispatch } from 'redux/appStore';
import { appendMissingAttributesToJson } from 'utils/gOEnrichmentUtils';

const genesById = generateGenesById(2);
const genes = _.flatMap(genesById);

describe('gOEnrichment', () => {
    let initialState: RootState;

    describe('gOEnrichmentJson and genes empty', () => {
        beforeEach(() => {
            initialState = testState();
            initialState.gOEnrichment.json = null;

            customRender(<GOEnrichment />, {
                initialState,
            });
        });

        it('should have aspect disabled and p-value disabled', () => {
            expect(screen.getByLabelText('Aspect')).toHaveClass('Mui-disabled');
            expect(screen.getByLabelText('p-value')).toHaveClass('Mui-disabled');
        });

        it('should display a message that enriched terms were not found', () => {
            screen.getByText('Enriched terms not found.');
        });

        it('should not export anything', async () => {
            const files = await reportBuilder.getRegisteredComponentsExportFiles();
            expect(files).toHaveLength(0);
        });
    });

    describe('gOEnrichmentJson is in store', () => {
        let mockedStore: MockStoreEnhanced<RootState, AppDispatch>;
        let container: HTMLElement;
        let gOEnrichmentJson: EnhancedGOEnrichmentJson;

        beforeAll(() => {
            fetchMock.resetMocks();

            fetchMock.mockResponse((req) => {
                if (req.url.includes('list_by_ids')) {
                    return resolveStringifiedObjectPromise({
                        results: genes,
                    });
                }

                return (
                    handleCommonRequests(req) ?? Promise.reject(new Error(`bad url: ${req.url}`))
                );
            });
        });

        beforeEach(async () => {
            initialState = testState();
            gOEnrichmentJson = generateGeneOntologyStorageJson(
                genes.map((gene) => gene.feature_id),
            );

            gOEnrichmentJson.tree.MF = [];
            gOEnrichmentJson.tree.BB = [generateGOEnrichmentRow(10), generateGOEnrichmentRow(11)];
            appendMissingAttributesToJson(gOEnrichmentJson, genes[0].source, genes[0].species);

            initialState.gOEnrichment.json = gOEnrichmentJson;

            initialState.genes.byId = genesById;
            initialState.genes.selectedGenesIds = [genes[0].feature_id];

            mockedStore = mockStore(initialState);

            ({ container } = customRender(<GOEnrichment />, {
                mockedStore,
            }));

            // Wait for first aspect (Biological process) rows to render.
            await screen.findByText(initialState.gOEnrichment.json.tree.BP[0].term_name);
        });

        it('should display a message that enriched terms for selected aspect were not found', async () => {
            // Click on dropdown. MouseDown event has to be used, because material-ui Select component
            // listens to mouseDown event to expand options menu.
            fireEvent.mouseDown(screen.getByLabelText('Aspect'));

            fireEvent.click(await screen.findByText('Molecular function'));

            await screen.findByText('Enriched terms not found within selected aspect.');
        });

        it('should display score in a custom cell', () => {
            screen.getAllByRole('progressbar');
        });

        it('should display matched in a custom cell', () => {
            const rowToCheck = gOEnrichmentJson.tree.BB[0];
            screen.getAllByText(`${rowToCheck.matched}/${rowToCheck.total}`);
        });

        it('should display term in a custom cell', () => {
            expect(container.querySelector('.ag-cell svg')).toBeInTheDocument();
        });

        it('should switch between flat and tree view when user toggles the view switch', async () => {
            const viewToggle = screen.getByLabelText('Toggle between Hierarchy and Flat view', {
                selector: 'input[type="checkbox"]',
            }) as HTMLInputElement;

            // Initially unchecked (tree view / Hierarchy is default, switch to right = Flat)
            expect(viewToggle).not.toBeChecked();

            // Check to switch to flat view
            fireEvent.click(viewToggle);

            await waitFor(() => {
                expect(container.querySelector('.ag-cell svg')).not.toBeInTheDocument();
            });
            expect(viewToggle).toBeChecked();

            // Uncheck to switch back to tree view
            fireEvent.click(viewToggle);

            await waitFor(() => {
                expect(container.querySelector('.ag-cell svg')).toBeInTheDocument();
            });
            expect(viewToggle).not.toBeChecked();
        });

        it('should switch to flat view when user clicks any sort button (except term)', async () => {
            // If user clicks on "Term" header, nothing should change.
            fireEvent.click(screen.getByText('Term'));

            await waitFor(() => {
                expect(container.querySelector('.ag-cell svg')).toBeInTheDocument();
            });

            // If user clicks on "Score" header, view should change -> flat grid with sorting.
            fireEvent.click(screen.getByText('Score'));

            await waitFor(() => {
                expect(container.querySelector('.ag-cell svg')).not.toBeInTheDocument();
            });
        });

        it('should export a tsv file for each aspect option', async () => {
            const files = await reportBuilder.getRegisteredComponentsExportFiles();
            aspectOptions.forEach((aspectOption) => {
                const exportedFile = _.find(
                    files,
                    ({ path }) =>
                        path === `Gene Ontology Enrichment Analysis/${aspectOption.label}.tsv`,
                );
                expect(exportedFile).toBeDefined();

                if (gOEnrichmentJson.tree[aspectOption.value][0] != null) {
                    expect(exportedFile?.content).toContain(
                        gOEnrichmentJson.tree[aspectOption.value][0].term_name,
                    );
                }
            });
        });

        it('should export Gene Ontology Enrichment Analysis/all_associations.tsv file', async () => {
            await validateExportFile(
                'Gene Ontology Enrichment Analysis/all_associations.tsv',
                (exportFile) => {
                    expect(exportFile).toBeDefined();
                    expect(exportFile?.content).toContain(
                        _.keys(gOEnrichmentJson.gene_associations)[0],
                    );
                },
            );
        });

        it('should export Gene Ontology Enrichment Analysis/caption.txt file', async () => {
            await validateExportFile(
                'Gene Ontology Enrichment Analysis/caption.txt',
                (exportFile) => {
                    expect(exportFile?.content).toContain(
                        'Identified significantly enriched Gene Ontology terms',
                    );
                },
            );
        });
    });
});
