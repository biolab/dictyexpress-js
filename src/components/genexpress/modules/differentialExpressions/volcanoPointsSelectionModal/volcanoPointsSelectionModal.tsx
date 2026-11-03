import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { ColDef, ValueGetterParams } from 'ag-grid-community';
import {
    DifferentialExpressionInfo,
    GeneVolcanoPointsGridWrapper,
} from './volcanoPointsSelectionModal.styles';
import {
    ModalBody,
    ModalHeader,
    ModalContainer,
    CenteredModal,
} from 'components/genexpress/common/dictyModal/dictyModal.styles';
import DictyGrid from 'components/genexpress/common/dictyGrid/dictyGrid';
import GeneSelectorModalControls from 'components/genexpress/common/geneSelectorModalControls/geneSelectorModalControls';
import { Gene, VolcanoPoint } from 'redux/models/internal';
import { getGenes, getSelectedGenesIds } from 'redux/stores/genes';
import { RootState } from 'redux/rootReducer';

const mapStateToProps = (state: RootState) => {
    return {
        genes: getGenes(state.genes),
        selectedGenesIds: getSelectedGenesIds(state.genes),
    };
};

const connector = connect(mapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

type GeneVolcanoPoint = {
    gene?: Gene;
    point: VolcanoPoint;
};

type VolcanoPointSelectionModalProps = {
    differentialExpressionName: string;
    probFieldLabel: string;
    isMarkerRanking?: boolean;
    volcanoPoints: VolcanoPoint[];
    handleOnClose: () => void;
} & PropsFromRedux;

const VolcanoPointSelectionModal = ({
    differentialExpressionName,
    probFieldLabel,
    isMarkerRanking = false,
    volcanoPoints,
    selectedGenesIds,
    genes,
    handleOnClose,
}: VolcanoPointSelectionModalProps): ReactElement => {
    const [geneVolcanoPoints, setGeneVolcanoPoints] = useState<GeneVolcanoPoint[]>([]);
    const [selectedGeneVolcanoPoints, setSelectedGeneVolcanoPoints] = useState<GeneVolcanoPoint[]>(
        [],
    );

    // Prepare data -> attach Gene to each volcano point.
    useEffect(() => {
        const newGeneVolcanoPoints: GeneVolcanoPoint[] = [];
        volcanoPoints.forEach((volcanoPoint) => {
            newGeneVolcanoPoints.push({
                gene: genes.find((gene) => gene.feature_id === volcanoPoint.geneId),
                point: volcanoPoint,
            });
        });

        setGeneVolcanoPoints(newGeneVolcanoPoints);
    }, [genes, volcanoPoints]);

    // Propagate already selected genes to selected volcano points.
    useEffect(() => {
        setSelectedGeneVolcanoPoints(
            geneVolcanoPoints.filter((geneVolcanoPoint) =>
                selectedGenesIds.includes(geneVolcanoPoint.point.geneId),
            ),
        );
    }, [geneVolcanoPoints, selectedGenesIds]);

    const columnDefs = useRef([
        {
            headerCheckboxSelection: true,
            checkboxSelection: (params) => {
                return params.data.gene != null;
            },
            width: 25,
        },
        {
            valueGetter: (params: ValueGetterParams): string => {
                return params.data.point.geneId;
            },
            headerName: 'ID',
            width: 90,
        },
        {
            valueGetter: (params: ValueGetterParams): string => {
                return params.data.gene?.name;
            },
            headerName: 'Name',
            width: 90,
            sort: 'asc',
        },
        {
            valueGetter: (params: ValueGetterParams): number => {
                return params.data.point.logFcValue;
            },
            headerName: 'log2(Fold Change)',
            width: 90,
        },
        ...(isMarkerRanking
            ? [
                  {
                      valueGetter: (params: ValueGetterParams): number | undefined =>
                          params.data.point.effectSize,
                      headerName: "Cohen's d",
                      width: 90,
                  },
                  // Pseudobulk test across biological replicates; empty for untested genes.
                  {
                      valueGetter: (params: ValueGetterParams): number | null =>
                          params.data.point.replicatePValue ?? null,
                      valueFormatter: ({ value }: { value: number | null }): string =>
                          value == null ? '–' : value.toPrecision(3),
                      headerName: 'P value (replicates)',
                      width: 110,
                  },
                  {
                      valueGetter: (params: ValueGetterParams): number | null =>
                          params.data.point.replicateFdr ?? null,
                      valueFormatter: ({ value }: { value: number | null }): string =>
                          value == null ? '–' : value.toPrecision(3),
                      headerName: 'FDR (replicates)',
                      width: 110,
                  },
              ]
            : [
                  {
                      valueGetter: (params: ValueGetterParams): number => {
                          return params.data.point.probValue;
                      },
                      headerName: probFieldLabel,
                      width: 90,
                  },
              ]),
    ] as ColDef[]);

    return (
        <CenteredModal
            open
            aria-labelledby="modalTitle"
            aria-describedby="modalDescription"
            onClose={handleOnClose}
        >
            <ModalContainer>
                <ModalHeader id="modalTitle">Selected Differential Expression Genes</ModalHeader>
                <ModalBody>
                    <DifferentialExpressionInfo id="modalDescription">
                        Differential Expression: {differentialExpressionName}
                    </DifferentialExpressionInfo>
                    <GeneVolcanoPointsGridWrapper>
                        <DictyGrid
                            data={geneVolcanoPoints}
                            getRowId={(data): string => data.point.geneId}
                            filterLabel="Filter"
                            selectedData={selectedGeneVolcanoPoints}
                            columnDefs={columnDefs.current}
                            suppressRowClickSelection
                            selectionMode="multiple"
                            onSelectionChanged={setSelectedGeneVolcanoPoints}
                        />
                    </GeneVolcanoPointsGridWrapper>
                </ModalBody>
                <GeneSelectorModalControls
                    allGenesIds={geneVolcanoPoints
                        .filter((volcanoPoint) => volcanoPoint.gene != null)
                        .map((volcanoPoint) => (volcanoPoint.gene as Gene).feature_id)}
                    selectedGenesIds={selectedGeneVolcanoPoints.map(
                        (volcanoPoint) => volcanoPoint.point.geneId,
                    )}
                    onClose={handleOnClose}
                />
            </ModalContainer>
        </CenteredModal>
    );
};

export default connector(VolcanoPointSelectionModal);
