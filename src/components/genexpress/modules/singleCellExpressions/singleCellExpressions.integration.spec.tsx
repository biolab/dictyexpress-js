import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import SingleCellExpressions from './singleCellExpressions';
import * as dataLoader from './dataLoader';
import { customRender, handleCommonRequests } from 'tests/test-utils';
import { testState, generateGene, mockStore } from 'tests/mock';
import { RootState } from 'redux/rootReducer';
import * as errorUtils from 'utils/errorUtils';
import * as singleCellExpressionsStore from 'redux/stores/singleCellExpressions';

// Mock the dataLoader module
vi.mock('./dataLoader', async () => {
    const actual = await vi.importActual('./dataLoader');
    return {
        ...actual,
        loadUMAPCoordinates: vi.fn(),
        loadGeneNames: vi.fn(),
        loadGeneSymbols: vi.fn(),
        loadCellTags: vi.fn(),
        loadCellTimes: vi.fn(),
        loadCellTypes: vi.fn(),
        loadDatasetInfo: vi.fn(),
        loadMultipleGenesExpression: vi.fn(),
        listAvailableStrains: vi.fn(),
    };
});

// Mock Vega-lite for canvas rendering
vi.mock('vega-embed', () => ({
    default: vi.fn(() => Promise.resolve({ view: { toCanvas: () => ({}) } })),
}));

// Mock zarr
vi.mock('zarr', () => ({
    openArray: vi.fn(),
    HTTPStore: vi.fn(),
}));

const generateMockUMAPCoordinates = (nCells: number) => ({
    x: Array.from({ length: nCells }, () => Math.random() * 10 - 5),
    y: Array.from({ length: nCells }, () => Math.random() * 10 - 5),
});

const generateMockGeneExpression = (nCells: number): Float32Array => {
    return new Float32Array(Array.from({ length: nCells }, () => Math.random() * 10));
};

describe('SingleCellExpressions integration', () => {
    let initialState: RootState;
    let boundingRectSpy: ReturnType<typeof vi.spyOn>;
    const nCells = 100;
    const mockGeneNames = ['DDB_G0267412', 'DDB_G0276939', 'DDB_G0277379', 'DDB_G0269172'];
    const mockGeneSymbols = ['pspA', 'pspB', 'pspD', 'pspC'];
    const mockCellTags = Array.from({ length: nCells }, (_, i) => `cell_${i}`);
    const mockCellTimes = Array.from({ length: nCells }, (_, i) => `${i % 4}h`);
    const mockCellTypes = Array.from({ length: nCells }, (_, i) =>
        i % 2 === 0 ? 'Type A' : 'Type B',
    );

    beforeAll(() => {
        // Mock getBoundingClientRect to return a large width so all controls are visible
        boundingRectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            width: 600,
            height: 400,
            top: 0,
            left: 0,
            bottom: 400,
            right: 600,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        });

        // Setup fetch mock for common requests
        fetchMock.resetMocks();
        fetchMock.mockResponse((req) => {
            return handleCommonRequests(req) ?? Promise.reject(new Error(`bad url: ${req.url}`));
        });
    });

    afterAll(() => {
        boundingRectSpy.mockRestore();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        fetchMock.mockClear();

        // Setup initial state
        initialState = testState();

        // Mock dataLoader functions
        (dataLoader.loadUMAPCoordinates as ReturnType<typeof vi.fn>).mockResolvedValue(
            generateMockUMAPCoordinates(nCells),
        );
        (dataLoader.loadGeneNames as ReturnType<typeof vi.fn>).mockResolvedValue(mockGeneNames);
        (dataLoader.loadGeneSymbols as ReturnType<typeof vi.fn>).mockResolvedValue(mockGeneSymbols);
        (dataLoader.loadCellTags as ReturnType<typeof vi.fn>).mockResolvedValue(mockCellTags);
        (dataLoader.loadCellTimes as ReturnType<typeof vi.fn>).mockResolvedValue(mockCellTimes);
        (dataLoader.loadCellTypes as ReturnType<typeof vi.fn>).mockResolvedValue(mockCellTypes);
        (dataLoader.loadDatasetInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
            strain: 'AX4',
            n_genes: mockGeneNames.length,
            n_cells: nCells,
        });
        (dataLoader.listAvailableStrains as ReturnType<typeof vi.fn>).mockResolvedValue(['AX4']);
        (dataLoader.loadMultipleGenesExpression as ReturnType<typeof vi.fn>).mockResolvedValue({
            data: new Map([[0, generateMockGeneExpression(nCells)]]),
            failedIndices: [],
        });
    });

    describe('initial load', () => {
        it('should display loading message initially', () => {
            customRender(<SingleCellExpressions />, { initialState });

            expect(screen.getByText('Loading single-cell data...')).toBeInTheDocument();
        });

        it('should load and display UMAP plot after data loads', async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(
                () => {
                    expect(
                        screen.queryByText('Loading single-cell data...'),
                    ).not.toBeInTheDocument();
                },
                { timeout: 5000 },
            );

            // Should display controls
            expect(screen.getByLabelText('Strain')).toBeInTheDocument();
            expect(screen.getByLabelText('Color by')).toBeInTheDocument();

            // Check that data loader functions were called
            expect(dataLoader.loadUMAPCoordinates).toHaveBeenCalled();
            expect(dataLoader.loadGeneNames).toHaveBeenCalled();
            expect(dataLoader.loadGeneSymbols).toHaveBeenCalled();
            expect(dataLoader.loadCellTags).toHaveBeenCalled();
            expect(dataLoader.loadCellTimes).toHaveBeenCalled();
            expect(dataLoader.loadCellTypes).toHaveBeenCalled();
            expect(dataLoader.loadDatasetInfo).toHaveBeenCalled();
        });

        it('should display error message when data loading fails', async () => {
            (dataLoader.loadUMAPCoordinates as ReturnType<typeof vi.fn>).mockRejectedValue(
                new Error('Network error'),
            );

            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(
                    screen.getByText(
                        'Failed to load single-cell data. Please check the data files.',
                    ),
                ).toBeInTheDocument();
            });
        });

        it('should display cell count after loading', async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(screen.getByText(`${nCells} cells`)).toBeInTheDocument();
            });
        });
    });

    describe('strain selection', () => {
        it('should display strain selector with AX4 selected by default', async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(screen.queryByText('Loading single-cell data...')).not.toBeInTheDocument();
            });

            // Check that AX4 is displayed in the strain selector
            expect(await screen.findByLabelText('Strain')).toBeInTheDocument();
            // The selected value appears as text in the select component
            const strainSelects = screen.getAllByText('AX4');
            expect(strainSelects.length).toBeGreaterThan(0);
        });

        it('should change strain when user selects different option', async () => {
            (dataLoader.listAvailableStrains as ReturnType<typeof vi.fn>).mockResolvedValue([
                'AX4',
                'DH1',
            ]);

            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(screen.queryByText('Loading single-cell data...')).not.toBeInTheDocument();
            });

            const strainSelect = screen.getByLabelText('Strain');
            expect(strainSelect).not.toHaveClass('Mui-disabled');

            // Get current call count after initial load
            const callsBeforeChange = (dataLoader.loadUMAPCoordinates as ReturnType<typeof vi.fn>)
                .mock.calls.length;

            // Open dropdown
            fireEvent.mouseDown(strainSelect);

            // Wait for DH1 option to appear and click it
            const dh1Options = await screen.findAllByText('DH1');
            fireEvent.click(dh1Options[dh1Options.length - 1]); // Click the menu option

            // Check that data is reloaded with new strain
            await waitFor(() => {
                expect(
                    (dataLoader.loadUMAPCoordinates as ReturnType<typeof vi.fn>).mock.calls.length,
                ).toBeGreaterThan(callsBeforeChange);
            });
        });

        it('should disable strain selector when only one strain available', async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(screen.queryByText('Loading single-cell data...')).not.toBeInTheDocument();
            });

            const strainSelect = await screen.findByLabelText('Strain');
            expect(strainSelect).toHaveClass('Mui-disabled');
        });
    });

    describe('color mode selection', () => {
        beforeEach(async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(screen.queryByText('Loading single-cell data...')).not.toBeInTheDocument();
            });
        });

        it('should default to expression color mode', async () => {
            // Check that "Expression" option is displayed as selected
            expect(await screen.findByLabelText('Color by')).toBeInTheDocument();
            // The selected value "Expression" should be visible
            const expressionTexts = screen.getAllByText('Expression');
            expect(expressionTexts.length).toBeGreaterThan(0);
        });

        it('should switch to cell type color mode', async () => {
            const colorBySelect = screen.getByLabelText('Color by');

            fireEvent.mouseDown(colorBySelect);
            const cellTypeOptions = await screen.findAllByText('Cell Type');
            fireEvent.click(cellTypeOptions[cellTypeOptions.length - 1]); // Click menu option

            await waitFor(() => {
                // "Cell Type" should now be displayed as the selected value
                const cellTypeTexts = screen.getAllByText('Cell Type');
                expect(cellTypeTexts.length).toBeGreaterThan(0);
            });
        });
    });

    describe('gene selection and expression', () => {
        beforeEach(() => {
            // Create genes that match our mock gene names
            const gene1 = generateGene(mockGeneNames[0], 'dictyBase', 'Dictyostelium discoideum');
            gene1.name = mockGeneSymbols[0];

            initialState.genes.byId = { [gene1.feature_id]: gene1 };
            initialState.genes.selectedGenesIds = [gene1.feature_id];

            // Mock expression data for this gene (index 0 in mockGeneNames)
            (dataLoader.loadMultipleGenesExpression as ReturnType<typeof vi.fn>).mockResolvedValue({
                data: new Map([[0, generateMockGeneExpression(nCells)]]),
                failedIndices: [],
            });
        });

        it('should load and display gene expression when gene is selected', async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(screen.queryByText('Loading single-cell data...')).not.toBeInTheDocument();
            });

            await waitFor(() => {
                expect(dataLoader.loadMultipleGenesExpression).toHaveBeenCalled();
            });

            // Should show gene count with data
            await waitFor(() => {
                expect(screen.getByText(/1 \/ 1 gene with data/)).toBeInTheDocument();
            });
        });

        it('should enable expression color mode when gene has data', async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(screen.queryByText('Loading single-cell data...')).not.toBeInTheDocument();
            });

            await waitFor(() => {
                expect(dataLoader.loadMultipleGenesExpression).toHaveBeenCalled();
            });

            const colorBySelect = screen.getByLabelText('Color by');
            fireEvent.mouseDown(colorBySelect);

            const expressionOption = screen
                .getAllByRole('option')
                .find((el) => el.textContent === 'Expression');
            expect(expressionOption).not.toHaveAttribute('aria-disabled', 'true');
        });

        it('should display transform and aggregation controls when gene is selected', async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(dataLoader.loadMultipleGenesExpression).toHaveBeenCalled();
            });

            expect(screen.getByLabelText('Transform')).toBeInTheDocument();
        });

        it('should show gene data status modal when clicking gene count button', async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(dataLoader.loadMultipleGenesExpression).toHaveBeenCalled();
            });

            const geneCountButton = await screen.findByText(/1 \/ 1 gene with data/);
            fireEvent.click(geneCountButton);

            await waitFor(() => {
                expect(screen.getByText('Single-cell Expression Data Status')).toBeInTheDocument();
            });
        });

        it('should surface an error and reset expression controls when loading fails', async () => {
            const loadError = new Error('load failed');
            (
                dataLoader.loadMultipleGenesExpression as ReturnType<typeof vi.fn>
            ).mockRejectedValueOnce(loadError);
            const handleErrorSpy = vi.spyOn(errorUtils, 'handleError').mockReturnValue({
                type: 'notifications/addSnackbar',
                payload: {
                    message: 'Error loading single cell gene expression data.',
                    variant: 'error',
                },
            } as never);
            const mockedStore = mockStore(initialState);

            try {
                customRender(<SingleCellExpressions />, { initialState, mockedStore });

                await waitFor(() => {
                    expect(dataLoader.loadMultipleGenesExpression).toHaveBeenCalled();
                });

                await waitFor(() => {
                    expect(handleErrorSpy).toHaveBeenCalledWith(
                        'Error loading single cell gene expression data.',
                        loadError,
                    );
                });
            } finally {
                handleErrorSpy.mockRestore();
            }

            const actions = mockedStore.getActions();
            const endedActions = actions.filter(
                (action) =>
                    action.type === singleCellExpressionsStore.singleCellExpressionsFetchEnded.type,
            );
            expect(endedActions.length).toBeGreaterThanOrEqual(2);

            const geneCountButton = await screen.findByText(/0 \/ 1 gene with data/);
            expect(geneCountButton).toHaveTextContent('0 / 1 gene with data');

            await waitFor(() => {
                expect(
                    screen.queryByLabelText('Expression', {
                        selector: 'input[type="checkbox"]',
                    }),
                ).not.toBeInTheDocument();
            });
        });

        it('should handle genes without expression data', async () => {
            // Use a gene ID that's NOT in our mock gene names
            const geneWithoutData = generateGene(
                'DDB_G9999999',
                'dictyBase',
                'Dictyostelium discoideum',
            );
            geneWithoutData.name = 'unknownGene';

            initialState.genes.byId = { [geneWithoutData.feature_id]: geneWithoutData };
            initialState.genes.selectedGenesIds = [geneWithoutData.feature_id];

            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(screen.queryByText('Loading single-cell data...')).not.toBeInTheDocument();
            });

            // Should show 0 genes with data (gene not found in dataset)
            await waitFor(() => {
                expect(screen.getByText(/0 \/ 1 gene with data/)).toBeInTheDocument();
            });
        });
    });

    describe('transform mode', () => {
        beforeEach(() => {
            // Create gene that matches our mock gene names
            const gene1 = generateGene(mockGeneNames[0], 'dictyBase', 'Dictyostelium discoideum');
            gene1.name = mockGeneSymbols[0];

            initialState.genes.byId = { [gene1.feature_id]: gene1 };
            initialState.genes.selectedGenesIds = [gene1.feature_id];

            // Mock expression data
            (dataLoader.loadMultipleGenesExpression as ReturnType<typeof vi.fn>).mockResolvedValue({
                data: new Map([[0, generateMockGeneExpression(nCells)]]),
                failedIndices: [],
            });
        });

        it('should change transform mode', async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(dataLoader.loadMultipleGenesExpression).toHaveBeenCalled();
            });

            const transformSelect = screen.getByLabelText('Transform');
            // Log1p is default - check it's displayed
            expect(screen.getAllByText('Log1p').length).toBeGreaterThan(0);

            fireEvent.mouseDown(transformSelect);
            const linearOptions = await screen.findAllByText('Linear');
            fireEvent.click(linearOptions[linearOptions.length - 1]); // Click menu option

            await waitFor(() => {
                // Linear should now be displayed
                expect(screen.getAllByText('Linear').length).toBeGreaterThan(0);
            });
        });

        it('should support all transform modes', async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(dataLoader.loadMultipleGenesExpression).toHaveBeenCalled();
            });

            const transformSelect = screen.getByLabelText('Transform');

            // Test Log1p (default)
            expect(screen.getAllByText('Log1p').length).toBeGreaterThan(0);

            // Test Linear
            fireEvent.mouseDown(transformSelect);
            const linearOptions = await screen.findAllByText('Linear');
            fireEvent.click(linearOptions[linearOptions.length - 1]);
            await waitFor(() => expect(screen.getAllByText('Linear').length).toBeGreaterThan(0));
        });
    });

    describe('aggregation mode', () => {
        beforeEach(() => {
            // Create genes that match our mock gene names
            const gene1 = generateGene(mockGeneNames[0], 'dictyBase', 'Dictyostelium discoideum');
            gene1.name = mockGeneSymbols[0];
            const gene2 = generateGene(mockGeneNames[1], 'dictyBase', 'Dictyostelium discoideum');
            gene2.name = mockGeneSymbols[1];

            initialState.genes.byId = {
                [gene1.feature_id]: gene1,
                [gene2.feature_id]: gene2,
            };
            initialState.genes.selectedGenesIds = [gene1.feature_id, gene2.feature_id];

            // Mock expression data for both genes (indices 0 and 1 in mockGeneNames)
            (dataLoader.loadMultipleGenesExpression as ReturnType<typeof vi.fn>).mockResolvedValue({
                data: new Map([
                    [0, generateMockGeneExpression(nCells)],
                    [1, generateMockGeneExpression(nCells)],
                ]),
                failedIndices: [],
            });
        });

        it('should display aggregation control when multiple genes selected', async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(dataLoader.loadMultipleGenesExpression).toHaveBeenCalled();
            });

            expect(screen.getByLabelText('Aggregation')).toBeInTheDocument();
        });

        it('should change aggregation mode', async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(dataLoader.loadMultipleGenesExpression).toHaveBeenCalled();
            });

            const aggregationSelect = screen.getByLabelText('Aggregation');
            // Average is default - check it's displayed
            expect(screen.getAllByText('Average').length).toBeGreaterThan(0);

            fireEvent.mouseDown(aggregationSelect);
            const sumOptions = await screen.findAllByText('Sum');
            fireEvent.click(sumOptions[sumOptions.length - 1]); // Click menu option

            await waitFor(() => {
                // Sum should now be displayed
                expect(screen.getAllByText('Sum').length).toBeGreaterThan(0);
            });
        });

        it('should support all aggregation modes', async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(dataLoader.loadMultipleGenesExpression).toHaveBeenCalled();
            });

            const aggregationSelect = screen.getByLabelText('Aggregation');

            // Test Average (default)
            expect(screen.getAllByText('Average').length).toBeGreaterThan(0);

            // Test Sum
            fireEvent.mouseDown(aggregationSelect);
            const sumOptions = await screen.findAllByText('Sum');
            fireEvent.click(sumOptions[sumOptions.length - 1]);
            await waitFor(() => expect(screen.getAllByText('Sum').length).toBeGreaterThan(0));

            // Test Min
            fireEvent.mouseDown(aggregationSelect);
            const minOptions = await screen.findAllByText('Min');
            fireEvent.click(minOptions[minOptions.length - 1]);
            await waitFor(() => expect(screen.getAllByText('Min').length).toBeGreaterThan(0));

            // Test Max
            fireEvent.mouseDown(aggregationSelect);
            const maxOptions = await screen.findAllByText('Max');
            fireEvent.click(maxOptions[maxOptions.length - 1]);
            await waitFor(() => expect(screen.getAllByText('Max').length).toBeGreaterThan(0));
        });
    });

    describe('legend toggle', () => {
        it('should display legend toggle on inital load but disabled when no genes', async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(screen.queryByText('Loading single-cell data...')).not.toBeInTheDocument();
            });

            expect(screen.getByText('Legend')).toBeInTheDocument();
            const legendLabel = screen.getByText('Legend').closest('label');
            expect(legendLabel).toHaveClass('Mui-disabled');
        });

        it('should enable legend toggle when genes are selected', async () => {
            const gene1 = generateGene(mockGeneNames[0], 'dictyBase', 'Dictyostelium discoideum');
            gene1.name = mockGeneSymbols[0];

            initialState.genes.byId = {
                [gene1.feature_id]: gene1,
            };
            initialState.genes.selectedGenesIds = [gene1.feature_id];

            (dataLoader.loadMultipleGenesExpression as ReturnType<typeof vi.fn>).mockResolvedValue({
                data: new Map([[0, generateMockGeneExpression(nCells)]]),
                failedIndices: [],
            });

            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(screen.queryByText('Loading single-cell data...')).not.toBeInTheDocument();
            });

            await waitFor(() => {
                expect(dataLoader.loadMultipleGenesExpression).toHaveBeenCalled();
            });

            const legendLabel = screen.getByText('Legend').closest('label');
            expect(legendLabel).not.toHaveClass('Mui-disabled');

            const legendSwitch = legendLabel?.querySelector('input[type="checkbox"]');
            expect(legendSwitch).toBeChecked();
        });

        it('should toggle legend visibility', async () => {
            const gene1 = generateGene(mockGeneNames[0], 'dictyBase', 'Dictyostelium discoideum');
            gene1.name = mockGeneSymbols[0];

            initialState.genes.byId = {
                [gene1.feature_id]: gene1,
            };
            initialState.genes.selectedGenesIds = [gene1.feature_id];

            (dataLoader.loadMultipleGenesExpression as ReturnType<typeof vi.fn>).mockResolvedValue({
                data: new Map([[0, generateMockGeneExpression(nCells)]]),
                failedIndices: [],
            });

            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(screen.queryByText('Loading single-cell data...')).not.toBeInTheDocument();
            });

            await waitFor(() => {
                expect(dataLoader.loadMultipleGenesExpression).toHaveBeenCalled();
            });

            const legendSwitch = screen
                .getByText('Legend')
                .closest('label')
                ?.querySelector('input[type="checkbox"]');
            expect(legendSwitch).toBeChecked();

            // Toggle off
            if (legendSwitch) {
                fireEvent.click(legendSwitch);
                await waitFor(() => {
                    expect(legendSwitch).not.toBeChecked();
                });
            }
        });
    });

    describe('expression alpha toggle', () => {
        beforeEach(() => {
            // Create gene that matches our mock gene names
            const gene1 = generateGene(mockGeneNames[0], 'dictyBase', 'Dictyostelium discoideum');
            gene1.name = mockGeneSymbols[0];

            initialState.genes.byId = { [gene1.feature_id]: gene1 };
            initialState.genes.selectedGenesIds = [gene1.feature_id];

            // Mock expression data
            (dataLoader.loadMultipleGenesExpression as ReturnType<typeof vi.fn>).mockResolvedValue({
                data: new Map([[0, generateMockGeneExpression(nCells)]]),
                failedIndices: [],
            });
        });

        it('should display expression toggle when gene is selected', async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(dataLoader.loadMultipleGenesExpression).toHaveBeenCalled();
            });

            const colorBySelect = screen.getByLabelText('Color by');
            fireEvent.mouseDown(colorBySelect);
            const timeOptions = await screen.findAllByText('Time');
            fireEvent.click(timeOptions[timeOptions.length - 1]);

            const expressionToggle = screen.getByLabelText('Expression', {
                selector: 'input[type="checkbox"]',
            });
            expect(expressionToggle).toBeInTheDocument();
        });

        it('should toggle expression alpha', async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(dataLoader.loadMultipleGenesExpression).toHaveBeenCalled();
            });

            const colorBySelect = screen.getByLabelText('Color by');
            fireEvent.mouseDown(colorBySelect);
            const timeOptions = await screen.findAllByText('Time');
            fireEvent.click(timeOptions[timeOptions.length - 1]);

            const expressionSwitch = screen.getByLabelText('Expression', {
                selector: 'input[type="checkbox"]',
            }) as HTMLInputElement;

            expect(expressionSwitch).toBeChecked();

            fireEvent.click(expressionSwitch);
            await waitFor(() => {
                expect(expressionSwitch).not.toBeChecked();
            });
        });

        it('should not display expression toggle when in expression color mode', async () => {
            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(dataLoader.loadMultipleGenesExpression).toHaveBeenCalled();
            });

            const colorBySelect = screen.getByLabelText('Color by');
            fireEvent.mouseDown(colorBySelect);
            const timeOptions = await screen.findAllByText('Time');
            fireEvent.click(timeOptions[timeOptions.length - 1]);

            // Count expression toggles before switching mode
            const legendLabel = screen.getByText('Legend');
            const controlsContainerBefore = legendLabel.closest('div');
            const togglesBefore = controlsContainerBefore?.querySelectorAll(
                '[class*="MuiFormControlLabel"]',
            );
            const hasExpressionToggleBefore = Array.from(togglesBefore || []).some((el) =>
                el.textContent?.includes('Expression'),
            );
            expect(hasExpressionToggleBefore).toBe(true);

            // Switch to expression mode
            fireEvent.mouseDown(colorBySelect);
            const expressionOptions = await screen.findAllByText('Expression');
            // Click the dropdown option (not the toggle)
            fireEvent.click(expressionOptions[expressionOptions.length - 1]);

            await waitFor(() => {
                expect(
                    screen.queryByLabelText('Expression', {
                        selector: 'input[type="checkbox"]',
                    }),
                ).not.toBeInTheDocument();
            });
        });
    });

    describe('edge cases', () => {
        it('should handle empty gene list', async () => {
            initialState.genes.selectedGenesIds = [];

            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(screen.queryByText('Loading single-cell data...')).not.toBeInTheDocument();
            });

            // Should not show gene count
            expect(screen.queryByText(/gene with data/)).not.toBeInTheDocument();

            // Should not call loadMultipleGenesExpression
            expect(dataLoader.loadMultipleGenesExpression).not.toHaveBeenCalled();
        });

        it('should support multiple strains and allow switching between them', async () => {
            (dataLoader.listAvailableStrains as ReturnType<typeof vi.fn>).mockResolvedValue([
                'AX4',
                'DH1',
                'AX2',
            ]);

            customRender(<SingleCellExpressions />, { initialState });

            await waitFor(() => {
                expect(screen.queryByText('Loading single-cell data...')).not.toBeInTheDocument();
            });

            expect(dataLoader.loadUMAPCoordinates).toHaveBeenCalled();
            expect(dataLoader.loadGeneNames).toHaveBeenCalled();
            expect(dataLoader.loadDatasetInfo).toHaveBeenCalled();

            const strainSelect = screen.getByLabelText('Strain');
            expect(strainSelect).not.toHaveClass('Mui-disabled');

            const initialCalls = (dataLoader.loadUMAPCoordinates as ReturnType<typeof vi.fn>).mock
                .calls.length;

            fireEvent.mouseDown(strainSelect);
            await screen.findAllByText('DH1');
            const ax2Options = await screen.findAllByText('AX2');
            fireEvent.click(ax2Options[ax2Options.length - 1]);

            await waitFor(() => {
                const callsAfter = (dataLoader.loadUMAPCoordinates as ReturnType<typeof vi.fn>).mock
                    .calls.length;
                expect(callsAfter).toBeGreaterThan(initialCalls);
            });

            await waitFor(() => {
                expect(screen.getAllByText('AX2').length).toBeGreaterThan(0);
            });
        });
    });
});
