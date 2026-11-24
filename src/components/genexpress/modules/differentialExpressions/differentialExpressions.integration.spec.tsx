import { screen, fireEvent, waitFor } from '@testing-library/react';
import _ from 'lodash';
import GeneExpressGrid from 'components/genexpress/geneExpressGrid';
import {
    customRender,
    handleCommonRequests,
    hoverOverVegaSymbol,
    resolveStringifiedObjectPromise,
    validateCreateStateRequest,
    validateExportFile,
} from 'tests/test-utils';
import {
    testState,
    generateDifferentialExpressionsById,
    generateDifferentialExpressionJson,
    generateGenesByIdPredefinedIds,
    generateBookmarkQueryParameter,
    generateBackendBookmark,
    generateBasketInfo,
} from 'tests/mock';
import { RootState } from 'redux/rootReducer';
import { getSelectedDifferentialExpression } from 'redux/stores/differentialExpressions';

const differentialExpressionsById = generateDifferentialExpressionsById(2);
const differentialExpressions = _.flatMap(differentialExpressionsById);
differentialExpressions[0].input = { fdr: 'ebays.pval' };
differentialExpressions[1].output.source = 'differentSource';
differentialExpressions[1].output.species = 'differentSpecies';
const numberOfGenes = 5;
const differentialExpressionJson = generateDifferentialExpressionJson(numberOfGenes);
differentialExpressionsById[differentialExpressions[0].id].json = differentialExpressionJson;
const genesById = generateGenesByIdPredefinedIds(differentialExpressionJson.gene_id);

const backendBookmark = generateBackendBookmark(1, [
    differentialExpressionJson.gene_id[0],
    differentialExpressionJson.gene_id[1],
]);
backendBookmark.state.differentialExpressions.selectedId = differentialExpressions[0].id;

describe('differentialExpressions integration', () => {
    let initialState: RootState;
    let container: HTMLElement;

    beforeEach(() => {
        fetchMock.resetMocks();

        fetchMock.mockResponse((req) => {
            if (req.url.includes('differential_expression/list')) {
                return resolveStringifiedObjectPromise(differentialExpressions);
            }

            if (req.url.includes('storage')) {
                return resolveStringifiedObjectPromise({
                    id: differentialExpressions[0].output.de_json,
                    json: generateDifferentialExpressionJson(numberOfGenes),
                });
            }

            if (req.url.includes('feature')) {
                return resolveStringifiedObjectPromise({
                    results: [
                        genesById[differentialExpressionJson.gene_id[0]],
                        genesById[differentialExpressionJson.gene_id[1]],
                    ],
                });
            }

            if (req.url.includes('app-state')) {
                return resolveStringifiedObjectPromise(backendBookmark);
            }

            return handleCommonRequests(req) ?? Promise.reject(new Error(`bad url: ${req.url}`));
        });

        initialState = testState();
        initialState.genes.byId = genesById;
    });

    it('should have differential expressions dropdown disabled without data', async () => {
        fetchMock.resetMocks();

        fetchMock.mockResponse((req) => {
            if (req.url.includes('differential_expression/list')) {
                return resolveStringifiedObjectPromise([]);
            }

            return handleCommonRequests(req) ?? Promise.reject(new Error(`bad url: ${req.url}`));
        });

        customRender(<GeneExpressGrid />, { initialState });

        expect(await screen.findByLabelText('Differential expression')).toHaveClass('Mui-disabled');
    });

    it('should select differential expression if only one is available', async () => {
        fetchMock.resetMocks();

        fetchMock.mockResponse((req) => {
            if (req.url.includes('differential_expression/list')) {
                return resolveStringifiedObjectPromise([differentialExpressions[0]]);
            }

            return handleCommonRequests(req) ?? Promise.reject(new Error(`bad url: ${req.url}`));
        });

        initialState.timeSeries.basketInfo = generateBasketInfo('1');
        customRender(<GeneExpressGrid />, { initialState });

        await screen.findByText(differentialExpressions[0].name);
    });

    it('should select differential expression with the same species as the basketInfo', async () => {
        initialState.timeSeries.basketInfo = {
            ...generateBasketInfo('1'),
            species: differentialExpressions[1].output.species,
        };
        customRender(<GeneExpressGrid />, { initialState });

        await screen.findByText(differentialExpressions[1].name);
    });

    it('should load selected differential expression, genes and highlighted genes from bookmark', async () => {
        ({ container } = customRender(<GeneExpressGrid />, {
            initialState,
            route: generateBookmarkQueryParameter(),
        }));

        await waitFor(
            () => {
                expect(
                    container.querySelectorAll(
                        "g[role='graphics-symbol'].volcanoPointSelected > path",
                    ),
                ).toHaveLength(backendBookmark.state.genes.selectedGenesIds.length);
                expect(
                    container.querySelectorAll(
                        "g[role='graphics-symbol'].volcanoPointHighlighted > path[fill='#00BCD4']",
                    ),
                ).toHaveLength(backendBookmark.state.genes.highlightedGenesIds.length);
            },
            { timeout: 3000 },
        );
    });

    describe('differentialExpression not selected', () => {
        beforeEach(async () => {
            ({ container } = customRender(<GeneExpressGrid />, {
                initialState,
            }));

            await waitFor(
                () => expect(screen.getByLabelText('Differential expression')).toBeEnabled(),
                { timeout: 2000 },
            );
        });

        it('should show volcano plot after differential expression is chosen', async () => {
            // Click on dropdown. MouseDown event has to be used, because material-ui Select component
            // listens to mouseDown event to expand options menu.
            fireEvent.mouseDown(screen.getByLabelText('Differential expression'));

            // Click on dropdown item (first differential expression).
            fireEvent.click(await screen.findByText(differentialExpressions[0].name));

            await waitFor(() => {
                // Volcano Points.
                expect(
                    container.querySelectorAll(
                        "g[role='graphics-symbol'].volcanoPointRemaining > path",
                    ),
                ).toHaveLength(numberOfGenes);

                // X thresholds.
                expect(
                    container.querySelectorAll("g[role='graphics-symbol'].xThresholdsRect"),
                ).toHaveLength(1);

                // Y thresholds.
                expect(
                    container.querySelectorAll("g[role='graphics-symbol'].yThresholdsRect"),
                ).toHaveLength(1);
            });
        });

        it('should export empty Differential Expressions/selected_differential_expression.tsv file', async () => {
            await validateExportFile(
                'Differential Expressions/selected_differential_expression.tsv',
                (exportFile) => {
                    expect(exportFile?.content).toEqual('');
                },
            );
        });

        it('should not export empty Differential Expressions/table.tsv file', async () => {
            await validateExportFile('Differential Expressions/table.tsv', (exportFile) => {
                expect(exportFile).toBeUndefined();
            });
        });

        it('should display a warning that differential expression organism is different', async () => {
            // Click on dropdown. MouseDown event has to be used, because material-ui Select component
            // listens to mouseDown event to expand options menu.
            fireEvent.mouseDown(screen.getByLabelText('Differential expression'));

            // Click on dropdown item (first differential expression).
            fireEvent.click(await screen.findByText(differentialExpressions[1].name));

            screen.getByText(
                'The organism in Time series and Gene Selection does not match the organism in Differential Expression',
            );
        });
    });

    describe('differentialExpression selected, one gene selected and one gene highlighted', () => {
        beforeEach(async () => {
            initialState.differentialExpressions.byId = differentialExpressionsById;
            initialState.differentialExpressions.selectedId = differentialExpressions[0].id;
            initialState.genes.byId = genesById;
            initialState.genes.selectedGenesIds = [differentialExpressionJson.gene_id[0]];
            initialState.genes.highlightedGenesIds = [differentialExpressionJson.gene_id[1]];

            ({ container } = customRender(<GeneExpressGrid />, {
                initialState,
            }));

            // Wait until vega plot is drawn.
            await waitFor(() => {
                expect(
                    container.querySelectorAll(
                        "g[role='graphics-symbol'].volcanoPointRemaining > path",
                    ),
                ).toHaveLength(numberOfGenes);
            });
        });

        it('labels the volcano axis with the empirical-Bayes source statistic', () => {
            expect(
                screen.getByText('−log₁₀(empirical-Bayes P)', { selector: 'svg text' }),
            ).toBeVisible();
        });

        it('should display tooltip on point hover', async () => {
            await hoverOverVegaSymbol(container, 'volcanoPointRemaining');

            await screen.findByText('Gene');
        });

        it('should display selected gene as a bigger dot', async () => {
            await waitFor(() => {
                expect(
                    container.querySelectorAll(
                        "g[role='graphics-symbol'].volcanoPointSelected > path",
                    ),
                ).toHaveLength(1);
            });
        });

        it('should display highlighted gene as a bigger colored dot', async () => {
            await waitFor(() => {
                expect(
                    container.querySelectorAll(
                        "g[role='graphics-symbol'].volcanoPointHighlighted > path[fill='#00BCD4']",
                    ),
                ).toHaveLength(1);
            });
        });

        it('should export Differential Expressions/selected_differential_expression.tsv file', async () => {
            await validateExportFile(
                'Differential Expressions/selected_differential_expression.tsv',
                (exportFile) => {
                    expect(exportFile?.content).toContain(
                        getSelectedDifferentialExpression(initialState.differentialExpressions)
                            ?.name,
                    );
                },
            );
        });

        it('should export visualization Differential Expressions/volcano_image.png file', async () => {
            await validateExportFile('Differential Expressions/volcano_image.png', (exportFile) => {
                expect(exportFile).toBeDefined();
            });
        });

        it('should export visualization Differential Expressions/volcano_image.svg file', async () => {
            await validateExportFile('Differential Expressions/volcano_image.svg', (exportFile) => {
                expect(exportFile).toBeDefined();
            });
        });

        it('should export Differential Expressions/caption.txt file', async () => {
            await validateExportFile('Differential Expressions/caption.txt', (exportFile) => {
                expect(exportFile?.content).toContain('−log₁₀(empirical-Bayes P)');
                expect(exportFile?.content).toContain('a source value of 0.001');
                expect(exportFile?.content).toContain('ebays.pval');
                expect(exportFile?.content).toContain(
                    getSelectedDifferentialExpression(initialState.differentialExpressions)?.name,
                );
            });
        });

        it('should save selected time series, genes, highlighted genes and all component bookmarkable state to app-state api', async () => {
            fireEvent.click(screen.getByLabelText('Bookmark'));

            await validateCreateStateRequest((bookmarkState) => {
                expect(bookmarkState.differentialExpressions.selectedId).toEqual(
                    initialState.differentialExpressions.selectedId,
                );
            });
        });
    });
});
