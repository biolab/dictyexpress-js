import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { MockStoreEnhanced } from 'redux-mock-store';
import { vi } from 'vitest';
import GeneDataStatusModal from './geneDataStatusModal';
import { customRender } from 'tests/test-utils';
import { mockStore, generateGene, testState } from 'tests/mock';
import { geneDeselected } from 'redux/stores/genes';
import { RootState } from 'redux/rootReducer';
import { AppDispatch } from 'redux/appStore';
import { Gene } from 'redux/models/internal';

const genesWithData: Gene[] = [
    generateGene('DDB_G0001', 'dictyBase', 'Dictyostelium discoideum'),
    generateGene('DDB_G0002', 'dictyBase', 'Dictyostelium discoideum'),
    generateGene('DDB_G0003', 'dictyBase', 'Dictyostelium discoideum'),
];

const genesWithoutData: Gene[] = [
    generateGene('DDB_G0004', 'dictyBase', 'Dictyostelium discoideum'),
    generateGene('DDB_G0005', 'dictyBase', 'Dictyostelium discoideum'),
];

describe('GeneDataStatusModal', () => {
    let initialState: RootState;
    let mockedStore: MockStoreEnhanced<RootState, AppDispatch>;
    const mockedOnClose = vi.fn();

    beforeEach(() => {
        initialState = testState();
        mockedStore = mockStore(initialState);
        mockedStore.clearActions();
        mockedOnClose.mockClear();
    });

    describe('rendering', () => {
        it('should render modal with title', () => {
            customRender(
                <GeneDataStatusModal
                    genesWithData={genesWithData}
                    genesWithoutData={genesWithoutData}
                    onClose={mockedOnClose}
                />,
                { mockedStore },
            );

            expect(screen.getByText('Single-cell Expression Data Status')).toBeInTheDocument();
        });

        it('should display genes with data in the grid', () => {
            customRender(
                <GeneDataStatusModal
                    genesWithData={genesWithData}
                    genesWithoutData={genesWithoutData}
                    onClose={mockedOnClose}
                />,
                { mockedStore },
            );

            expect(
                screen.getByText(
                    `Genes with single-cell expression data (${genesWithData.length})`,
                ),
            ).toBeInTheDocument();
            genesWithData.forEach((gene) => {
                expect(screen.getByText(gene.name)).toBeInTheDocument();
            });
        });

        it('should display genes without data in the grid', () => {
            customRender(
                <GeneDataStatusModal
                    genesWithData={genesWithData}
                    genesWithoutData={genesWithoutData}
                    onClose={mockedOnClose}
                />,
                { mockedStore },
            );

            expect(
                screen.getByText(
                    `Genes without single-cell expression data (${genesWithoutData.length})`,
                ),
            ).toBeInTheDocument();
            genesWithoutData.forEach((gene) => {
                expect(screen.getByText(gene.name)).toBeInTheDocument();
            });
        });

        it('should not display genes with data section when empty', () => {
            customRender(
                <GeneDataStatusModal
                    genesWithData={[]}
                    genesWithoutData={genesWithoutData}
                    onClose={mockedOnClose}
                />,
                { mockedStore },
            );

            expect(
                screen.queryByText(/Genes with single-cell expression data/),
            ).not.toBeInTheDocument();
        });

        it('should not display genes without data section when empty', () => {
            customRender(
                <GeneDataStatusModal
                    genesWithData={genesWithData}
                    genesWithoutData={[]}
                    onClose={mockedOnClose}
                />,
                { mockedStore },
            );

            expect(
                screen.queryByText(/Genes without single-cell expression data/),
            ).not.toBeInTheDocument();
        });
    });

    describe('buttons', () => {
        it('should have Close button that calls onClose', () => {
            customRender(
                <GeneDataStatusModal
                    genesWithData={genesWithData}
                    genesWithoutData={genesWithoutData}
                    onClose={mockedOnClose}
                />,
                { mockedStore },
            );

            fireEvent.click(screen.getByText('Close'));
            expect(mockedOnClose).toHaveBeenCalledTimes(1);
        });

        it('should have Remove selected button disabled when no genes selected', () => {
            customRender(
                <GeneDataStatusModal
                    genesWithData={genesWithData}
                    genesWithoutData={genesWithoutData}
                    onClose={mockedOnClose}
                />,
                { mockedStore },
            );

            const removeSelectedButton = screen.getByText(/Remove selected/);
            expect(removeSelectedButton).toBeDisabled();
        });

        it('should have Remove all button enabled when genes exist', () => {
            customRender(
                <GeneDataStatusModal
                    genesWithData={genesWithData}
                    genesWithoutData={genesWithoutData}
                    onClose={mockedOnClose}
                />,
                { mockedStore },
            );

            const removeAllButton = screen.getByText(/Remove all/);
            expect(removeAllButton).not.toBeDisabled();
            expect(removeAllButton).toHaveTextContent(
                `Remove all (${genesWithData.length + genesWithoutData.length})`,
            );
        });

        it('should have Remove all button disabled when no genes exist', () => {
            customRender(
                <GeneDataStatusModal
                    genesWithData={[]}
                    genesWithoutData={[]}
                    onClose={mockedOnClose}
                />,
                { mockedStore },
            );

            const removeAllButton = screen.getByText(/Remove all/);
            expect(removeAllButton).toBeDisabled();
        });
    });

    describe('gene selection', () => {
        it('should enable Remove selected button after selecting genes from with data section', async () => {
            customRender(
                <GeneDataStatusModal
                    genesWithData={genesWithData}
                    genesWithoutData={genesWithoutData}
                    onClose={mockedOnClose}
                />,
                { mockedStore },
            );

            // Find checkboxes in the genes with data grid
            const checkboxes = screen.getAllByRole('checkbox');
            // Click first gene checkbox (skip header checkbox)
            fireEvent.click(checkboxes[1]);

            await waitFor(() => {
                const removeSelectedButton = screen.getByText(/Remove selected/);
                expect(removeSelectedButton).not.toBeDisabled();
                expect(removeSelectedButton).toHaveTextContent('Remove selected (1)');
            });
        });

        it('should update Remove selected count when selecting multiple genes', async () => {
            customRender(
                <GeneDataStatusModal
                    genesWithData={genesWithData}
                    genesWithoutData={genesWithoutData}
                    onClose={mockedOnClose}
                />,
                { mockedStore },
            );

            const checkboxes = screen.getAllByRole('checkbox');
            // Select multiple genes
            fireEvent.click(checkboxes[1]); // First gene
            fireEvent.click(checkboxes[2]); // Second gene

            await waitFor(() => {
                const removeSelectedButton = screen.getByText(/Remove selected/);
                expect(removeSelectedButton).toHaveTextContent('Remove selected (2)');
            });
        });
    });

    describe('gene removal', () => {
        it('should dispatch geneDeselected action for all genes when clicking Remove all', async () => {
            customRender(
                <GeneDataStatusModal
                    genesWithData={genesWithData}
                    genesWithoutData={genesWithoutData}
                    onClose={mockedOnClose}
                />,
                { mockedStore },
            );

            fireEvent.click(screen.getByText(/Remove all/));

            await waitFor(() => {
                const actions = mockedStore.getActions();
                // Should dispatch geneDeselected for each gene
                expect(actions).toHaveLength(genesWithData.length + genesWithoutData.length);
                [...genesWithData, ...genesWithoutData].forEach((gene, index) => {
                    expect(actions[index]).toEqual(geneDeselected(gene.feature_id));
                });
            });

            expect(mockedOnClose).toHaveBeenCalledTimes(1);
        });

        it('should dispatch geneDeselected action for selected genes when clicking Remove selected', async () => {
            customRender(
                <GeneDataStatusModal
                    genesWithData={genesWithData}
                    genesWithoutData={genesWithoutData}
                    onClose={mockedOnClose}
                />,
                { mockedStore },
            );

            // Select first gene
            const checkboxes = screen.getAllByRole('checkbox');
            fireEvent.click(checkboxes[1]);

            await waitFor(() => {
                expect(screen.getByText(/Remove selected \(1\)/)).not.toBeDisabled();
            });

            fireEvent.click(screen.getByText(/Remove selected/));

            await waitFor(() => {
                const actions = mockedStore.getActions();
                expect(actions.length).toBeGreaterThan(0);
                // Should contain geneDeselected action
                expect(actions.some((action) => action.type === geneDeselected.type)).toBe(true);
            });

            expect(mockedOnClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('edge cases', () => {
        it('should handle empty genes lists', () => {
            customRender(
                <GeneDataStatusModal
                    genesWithData={[]}
                    genesWithoutData={[]}
                    onClose={mockedOnClose}
                />,
                { mockedStore },
            );

            expect(screen.getByText('Single-cell Expression Data Status')).toBeInTheDocument();
            expect(screen.getByText('Close')).toBeInTheDocument();
        });

        it('should handle only genes with data', () => {
            customRender(
                <GeneDataStatusModal
                    genesWithData={genesWithData}
                    genesWithoutData={[]}
                    onClose={mockedOnClose}
                />,
                { mockedStore },
            );

            expect(
                screen.getByText(
                    `Genes with single-cell expression data (${genesWithData.length})`,
                ),
            ).toBeInTheDocument();
            expect(
                screen.queryByText(/Genes without single-cell expression data/),
            ).not.toBeInTheDocument();
        });

        it('should handle only genes without data', () => {
            customRender(
                <GeneDataStatusModal
                    genesWithData={[]}
                    genesWithoutData={genesWithoutData}
                    onClose={mockedOnClose}
                />,
                { mockedStore },
            );

            expect(
                screen.getByText(
                    `Genes without single-cell expression data (${genesWithoutData.length})`,
                ),
            ).toBeInTheDocument();
            expect(
                screen.queryByText(/Genes with single-cell expression data/),
            ).not.toBeInTheDocument();
        });
    });
});
