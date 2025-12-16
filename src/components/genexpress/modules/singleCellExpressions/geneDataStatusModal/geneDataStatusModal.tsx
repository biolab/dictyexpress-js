import { ReactElement, useState, useRef } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { ColDef } from 'ag-grid-community';
import { Button } from '@mui/material';
import { GeneGridWrapper, SectionTitle } from './geneDataStatusModal.styles';
import {
    ModalBody,
    ModalHeader,
    ModalContainer,
    CenteredModal,
    ModalFooter,
    FooterControlsContainer,
} from 'components/genexpress/common/dictyModal/dictyModal.styles';
import DictyGrid from 'components/genexpress/common/dictyGrid/dictyGrid';
import { Gene } from 'redux/models/internal';
import { geneDeselected } from 'redux/stores/genes';

const connector = connect(null, {
    connectedGeneDeselected: geneDeselected,
});

type PropsFromRedux = ConnectedProps<typeof connector>;

type GeneDataStatusModalProps = {
    genesWithData: Gene[];
    genesWithoutData: Gene[];
    onClose: () => void;
} & PropsFromRedux;

const GeneDataStatusModal = ({
    genesWithData,
    genesWithoutData,
    onClose,
    connectedGeneDeselected,
}: GeneDataStatusModalProps): ReactElement => {
    const [selectedGenesWithData, setSelectedGenesWithData] = useState<Gene[]>([]);
    const [selectedGenesWithoutData, setSelectedGenesWithoutData] = useState<Gene[]>([]);

    const columnDefs = useRef<ColDef[]>([
        {
            headerCheckboxSelection: true,
            checkboxSelection: true,
            width: 40,
        },
        {
            field: 'feature_id',
            headerName: 'Gene ID',
            width: 120,
        },
        {
            field: 'name',
            headerName: 'Gene Name',
            width: 120,
            sort: 'asc',
        },
    ]);

    const handleRemoveSelected = () => {
        const allSelected = [...selectedGenesWithData, ...selectedGenesWithoutData];
        allSelected.forEach((gene) => connectedGeneDeselected(gene.feature_id));
        onClose();
    };

    const handleRemoveAll = () => {
        const allGenes = [...genesWithData, ...genesWithoutData];
        allGenes.forEach((gene) => connectedGeneDeselected(gene.feature_id));
        onClose();
    };

    const totalSelected = selectedGenesWithData.length + selectedGenesWithoutData.length;
    const totalGenes = genesWithData.length + genesWithoutData.length;

    return (
        <CenteredModal
            open
            aria-labelledby="modalTitle"
            aria-describedby="modalDescription"
            onClose={onClose}
        >
            <ModalContainer>
                <ModalHeader id="modalTitle">Single-cell Expression Data Status</ModalHeader>
                <ModalBody>
                    {genesWithData.length > 0 && (
                        <>
                            <SectionTitle>
                                Genes with single-cell expression data ({genesWithData.length})
                            </SectionTitle>
                            <GeneGridWrapper>
                                <DictyGrid
                                    data={genesWithData}
                                    getRowId={(data): string => data.feature_id}
                                    columnDefs={columnDefs.current}
                                    selectionMode="multiple"
                                    selectedData={selectedGenesWithData}
                                    onSelectionChanged={setSelectedGenesWithData}
                                    suppressRowClickSelection
                                    hideFilter
                                />
                            </GeneGridWrapper>
                        </>
                    )}

                    {genesWithoutData.length > 0 && (
                        <>
                            <SectionTitle>
                                Genes without single-cell expression data ({genesWithoutData.length}
                                )
                            </SectionTitle>
                            <GeneGridWrapper>
                                <DictyGrid
                                    data={genesWithoutData}
                                    getRowId={(data): string => data.feature_id}
                                    columnDefs={columnDefs.current}
                                    selectionMode="multiple"
                                    selectedData={selectedGenesWithoutData}
                                    onSelectionChanged={setSelectedGenesWithoutData}
                                    suppressRowClickSelection
                                    hideFilter
                                />
                            </GeneGridWrapper>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <FooterControlsContainer>
                        <div></div>
                        <div>
                            <Button onClick={handleRemoveSelected} disabled={totalSelected === 0}>
                                Remove selected ({totalSelected})
                            </Button>
                            <Button onClick={handleRemoveAll} disabled={totalGenes === 0}>
                                Remove all ({totalGenes})
                            </Button>
                            <Button onClick={onClose}>Close</Button>
                        </div>
                    </FooterControlsContainer>
                </ModalFooter>
            </ModalContainer>
        </CenteredModal>
    );
};

export default connector(GeneDataStatusModal);
