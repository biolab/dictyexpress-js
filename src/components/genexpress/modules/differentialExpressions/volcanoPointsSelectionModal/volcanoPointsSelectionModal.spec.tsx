import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { MockStoreEnhanced } from 'redux-mock-store';
import _ from 'lodash';
import { vi } from 'vitest';
import VolcanoPointsSelectionModal from './volcanoPointsSelectionModal';
import { customRender } from 'tests/test-utils';
import { testState, mockStore, generateGenesById, generateVolcanoPoints } from 'tests/mock';
import { allGenesDeselected, genesSelected } from 'redux/stores/genes';
import { RootState } from 'redux/rootReducer';
import { AppDispatch } from 'redux/appStore';

const genesById = generateGenesById(5);
const genes = _.flatMap(genesById);
const volcanoPoints = generateVolcanoPoints(5);

// Update volcanoPoints geneIds with the ones in store.
for (let i = 0; i < volcanoPoints.length - 2; i += 1) {
    volcanoPoints[i].geneId = genes[i].feature_id;
}
volcanoPoints[4].geneId = 'asdf';

const selectRow = (geneId: string) => {
    fireEvent.click(screen.getByText(geneId).parentElement?.querySelector('input') as HTMLElement);
};

describe('volcanoPointsSelectionModal', () => {
    let initialState: RootState;
    let mockedStore: MockStoreEnhanced<RootState, AppDispatch>;
    const mockedOnClose = vi.fn();

    describe('genes selected', () => {
        beforeEach(() => {
            initialState = testState();
            initialState.genes.byId = genesById;
            initialState.genes.selectedGenesIds = genes.map((gene) => gene.feature_id);
            mockedStore = mockStore(initialState);
            mockedStore.clearActions();
            mockedOnClose.mockClear();

            customRender(
                <VolcanoPointsSelectionModal
                    volcanoPoints={volcanoPoints}
                    differentialExpressionName="testDifferentialExpression"
                    handleOnClose={mockedOnClose}
                    probFieldLabel="Prob field"
                />,
                {
                    mockedStore,
                },
            );
        });

        it('should mark already selected genes as selected', async () => {
            await waitFor(() => expect(screen.getByText('Select')).toBeEnabled());

            fireEvent.click(screen.getByText('Select'));

            await waitFor(() => {
                expect(mockedStore.getActions()).toEqual([
                    genesSelected(initialState.genes.selectedGenesIds.slice(0, -1)),
                ]);
            });

            await waitFor(() => {
                expect(mockedOnClose.mock.calls.length).toBe(1);
            });
        });
    });

    describe('no genes selected', () => {
        beforeEach(() => {
            initialState = testState();
            initialState.genes.byId = genesById;
            initialState.genes.selectedGenesIds = [];

            mockedStore = mockStore(initialState);
            mockedStore.clearActions();
            mockedOnClose.mockClear();

            customRender(
                <VolcanoPointsSelectionModal
                    volcanoPoints={volcanoPoints}
                    differentialExpressionName="testDifferentialExpression"
                    handleOnClose={mockedOnClose}
                    probFieldLabel="Prob field"
                />,
                {
                    mockedStore,
                },
            );
        });

        it('should call onClose when user clicks close button', () => {
            // Simulate click on first gene set.
            fireEvent.click(screen.getByText('Close'));

            expect(mockedOnClose.mock.calls.length).toBe(1);
        });

        it('should display volcano points in a grid', () => {
            volcanoPoints.slice(0, -1).forEach((volcanoPoint) => {
                expect(screen.getByText(genesById[volcanoPoint.geneId].name));
            });

            expect(screen.getByText(`Select all ${volcanoPoints.length - 1}`));
        });

        it('should not dispatch genesSelected action for genes without name', () => {
            selectRow(volcanoPoints[volcanoPoints.length - 1].geneId);

            expect(screen.getByText('Select')).toBeDisabled();
        });

        it('should dispatch genesSelected action after user selects volcano points anc clicks select', async () => {
            selectRow(volcanoPoints[1].geneId);

            selectRow(volcanoPoints[2].geneId);

            await waitFor(() => expect(screen.getByText('Select')).toBeEnabled());
            fireEvent.click(screen.getByText('Select'));

            expect(mockedStore.getActions()).toEqual([
                genesSelected([volcanoPoints[1].geneId, volcanoPoints[2].geneId]),
            ]);
        });

        it('should first dispatch allGenesDeselected action and then should dispatch genesSelected action after user selects volcano points anc clicks select', async () => {
            selectRow(volcanoPoints[1].geneId);

            selectRow(volcanoPoints[2].geneId);

            await waitFor(() => expect(screen.getByText('Select')).toBeEnabled());
            fireEvent.click(screen.getByText('Append selected genes to Genes module'));
            fireEvent.click(screen.getByText('Select'));

            expect(mockedStore.getActions()).toEqual([
                allGenesDeselected(),
                genesSelected([volcanoPoints[1].geneId, volcanoPoints[2].geneId]),
            ]);
        });

        it('should dispatch genesSelected with all genes ids after user clicks select all', () => {
            fireEvent.click(screen.getByText('Select all', { exact: false }));

            expect(mockedStore.getActions()).toEqual([
                genesSelected(
                    volcanoPoints.slice(0, -1).map((volcanoPoint) => volcanoPoint.geneId),
                ),
            ]);
        });

        it('should first dispatch allGenesDeselected action and then dispatch genesSelected with all genes ids after user clicks select all', () => {
            fireEvent.click(screen.getByText('Append selected genes to Genes module'));
            fireEvent.click(screen.getByText('Select all', { exact: false }));

            expect(mockedStore.getActions()).toEqual([
                allGenesDeselected(),
                genesSelected(
                    volcanoPoints.slice(0, -1).map((volcanoPoint) => volcanoPoint.geneId),
                ),
            ]);
        });
    });

    describe('marker ranking', () => {
        it('shows effect sizes and replicate p-values instead of the probability column', async () => {
            initialState = testState();
            initialState.genes.byId = genesById;
            mockedStore = mockStore(initialState);
            const markerPoints = volcanoPoints.slice(0, 2).map((point, index) => ({
                ...point,
                logProbValue: 1.9,
                probValue: 0,
                effectSize: index === 0 ? -1.9 : 0.4,
                replicatePValue: index === 0 ? 0.000123456 : null,
                replicateFdr: index === 0 ? 0.00456789 : null,
                negLog10Prob: 8661.5,
                negLog10Fdr: 8661.2,
            }));

            customRender(
                <VolcanoPointsSelectionModal
                    volcanoPoints={markerPoints}
                    differentialExpressionName="Markers"
                    handleOnClose={mockedOnClose}
                    probFieldLabel="P VALUE"
                    isMarkerRanking
                />,
                { mockedStore },
            );

            expect(await screen.findByText("Cohen's d")).toBeInTheDocument();
            expect(screen.getByText('P value (replicates)')).toBeInTheDocument();
            expect(screen.getByText('FDR (replicates)')).toBeInTheDocument();
            expect(screen.queryByText('P VALUE')).toBeNull();
            expect(screen.getByText('-1.9')).toBeInTheDocument();
            expect(screen.getByText('0.000123')).toBeInTheDocument();
            expect(screen.getByText('0.00457')).toBeInTheDocument();
            // An untested gene has no p-value.
            expect(screen.getAllByText('–')).toHaveLength(2);
        });
    });
});
