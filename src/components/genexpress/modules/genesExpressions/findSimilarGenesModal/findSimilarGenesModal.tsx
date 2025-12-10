import React, { ReactElement, useEffect, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { ColDef, ValueFormatterParams, ValueGetterParams } from 'ag-grid-community';
import { Box, Button, MenuItem, SelectChangeEvent } from '@mui/material';
import {
    QueryGeneSelectFormControl,
    SimilarGenesGridWrapper,
    DistanceMeasureFormControl,
} from './findSimilarGenesModal.styles';
import ToDictybaseCell from './toDictybaseCell/toDictybaseCell';
import {
    ModalBody,
    ModalHeader,
    ModalContainer,
    CenteredModal,
} from 'components/genexpress/common/dictyModal/dictyModal.styles';
import DictyGrid from 'components/genexpress/common/dictyGrid/dictyGrid';
import GeneSelectorModalControls from 'components/genexpress/common/geneSelectorModalControls/geneSelectorModalControls';
import { Gene, Option } from 'redux/models/internal';
import { getGenesById, getIsFetchingSimilarGenes, getSelectedGenes } from 'redux/stores/genes';
import { RootState } from 'redux/rootReducer';
import DictySelect from 'components/genexpress/common/dictySelect/dictySelect';
import { fetchGenesSimilarities } from 'redux/epics/epicsActions';
import {
    genesSimilaritiesDistanceMeasureChanged,
    genesSimilaritiesQueryGeneSelected,
    getGenesSimilarities,
    getGenesSimilaritiesDistanceMeasure,
    getGenesSimilaritiesQueryGeneId,
    getGenesSimilaritiesStatus,
    getIsFetchingGenesSimilarities,
} from 'redux/stores/genesSimilarities';
import { formatNumber } from 'utils/math';
import { DistanceMeasure } from 'components/genexpress/common/constants';
import { LoadingBar } from 'components/genexpress/common/dictyModule/dictyModule.styles';
import { StatusIcon } from 'components/genexpress/common/statusIcon';

export const distanceMeasureOptions: Option<DistanceMeasure>[] = [
    { value: DistanceMeasure.euclidean, label: 'Euclidean' },
    { value: DistanceMeasure.spearman, label: 'Spearman' },
    { value: DistanceMeasure.pearson, label: 'Pearson' },
];

const mapStateToProps = (state: RootState) => {
    return {
        genesById: getGenesById(state.genes),
        selectedGenes: getSelectedGenes(state.genes),
        queryGeneId: getGenesSimilaritiesQueryGeneId(state.genesSimilarities),
        distanceMeasure: getGenesSimilaritiesDistanceMeasure(state.genesSimilarities),
        genesSimilarities: getGenesSimilarities(state.genesSimilarities),
        isFetchingGenesSimilarities: getIsFetchingGenesSimilarities(state.genesSimilarities),
        isFetchingSimilarGenes: getIsFetchingSimilarGenes(state.genes),
        genesSimilaritiesStatus: getGenesSimilaritiesStatus(state.genesSimilarities),
    };
};

const connector = connect(mapStateToProps, {
    connectedFetchGenesSimilarities: fetchGenesSimilarities,
    connectedGenesSimilaritiesQueryGeneSelected: genesSimilaritiesQueryGeneSelected,
    connectedGenesSimilaritiesDistanceMeasureChanged: genesSimilaritiesDistanceMeasureChanged,
});

type PropsFromRedux = ConnectedProps<typeof connector>;

type FindSimilarGenesModalProps = {
    handleOnClose: () => void;
    open: boolean;
} & PropsFromRedux;

type SimilarGene = { distance: number } & Pick<Gene, 'feature_id' | 'name' | 'description'>;

const columnDefs = [
    {
        headerCheckboxSelection: true,
        checkboxSelection: true,
        width: 35,
    },
    {
        field: 'distance',
        valueFormatter: (params: ValueFormatterParams): string => {
            return formatNumber(params.value, 'long');
        },
        headerName: 'Score',
        width: 90,
        sort: 'desc',
    },
    {
        valueGetter: (params: ValueGetterParams): string => {
            return params.data.name;
        },
        headerName: 'Name',
        width: 90,
    },
    {
        valueGetter: (params: ValueGetterParams): string => {
            return params.data.description;
        },
        headerName: 'Description',
    },
    {
        field: 'feature_id',
        headerName: 'Gene ID',
        cellRenderer: ToDictybaseCell,
    },
] as ColDef[];

const FindSimilarGenesModal = ({
    open,
    genesById,
    selectedGenes,
    genesSimilarities,
    queryGeneId,
    distanceMeasure,
    handleOnClose,
    isFetchingGenesSimilarities,
    isFetchingSimilarGenes,
    genesSimilaritiesStatus,
    connectedFetchGenesSimilarities,
    connectedGenesSimilaritiesQueryGeneSelected,
    connectedGenesSimilaritiesDistanceMeasureChanged,
}: FindSimilarGenesModalProps): ReactElement => {
    const [similarGenes, setSimilarGenes] = useState<SimilarGene[] | null>(null);
    const [selectedSimilarGenes, setSelectedSimilarGenes] = useState<SimilarGene[]>([]);

    useEffect(() => {
        setSimilarGenes(
            genesSimilarities?.flatMap((geneSimilarity) => ({
                feature_id: geneSimilarity.gene,
                name: genesById[geneSimilarity.gene]?.name,
                description: genesById[geneSimilarity.gene]?.description,
                distance: geneSimilarity.distance,
            })) ?? null,
        );
    }, [genesById, genesSimilarities]);

    useEffect(() => {
        setSelectedSimilarGenes(
            similarGenes?.filter((similarGene) =>
                selectedGenes
                    .map((selectedGene) => selectedGene.feature_id)
                    .includes(similarGene.feature_id),
            ) ?? [],
        );
    }, [selectedGenes, similarGenes]);

    const handleGeneOnChange = (event: SelectChangeEvent<unknown>): void => {
        connectedGenesSimilaritiesQueryGeneSelected(event.target.value as string);

        document.body.focus();
    };

    const isLoading = isFetchingGenesSimilarities || isFetchingSimilarGenes;

    return (
        <CenteredModal
            open={open}
            aria-labelledby="modalTitle"
            aria-describedby="modalDescription"
            onClose={handleOnClose}
        >
            <ModalContainer>
                <ModalHeader id="modalTitle">
                    Find Similar Genes
                    {genesSimilaritiesStatus != null && (
                        <StatusIcon status={genesSimilaritiesStatus} />
                    )}
                    {isLoading && <LoadingBar color="secondary" />}
                </ModalHeader>
                <ModalBody>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <QueryGeneSelectFormControl>
                                <DictySelect
                                    label="Gene"
                                    value={queryGeneId}
                                    handleOnChange={handleGeneOnChange}
                                    disabled={selectedGenes.length === 0}
                                >
                                    {selectedGenes.map((gene) => (
                                        <MenuItem value={gene.feature_id} key={gene.feature_id}>
                                            {gene.name}
                                        </MenuItem>
                                    ))}
                                </DictySelect>
                            </QueryGeneSelectFormControl>
                            <DistanceMeasureFormControl>
                                <DictySelect
                                    disabled={selectedGenes.length === 0}
                                    label="Distance Measure"
                                    value={distanceMeasure}
                                    handleOnChange={(event: SelectChangeEvent<unknown>): void => {
                                        connectedGenesSimilaritiesDistanceMeasureChanged(
                                            event.target.value as DistanceMeasure,
                                        );
                                    }}
                                >
                                    {distanceMeasureOptions.map((distanceMeasureOption) => (
                                        <MenuItem
                                            value={distanceMeasureOption.value}
                                            key={distanceMeasureOption.value}
                                        >
                                            {distanceMeasureOption.label}
                                        </MenuItem>
                                    ))}
                                </DictySelect>
                            </DistanceMeasureFormControl>
                        </div>
                        {similarGenes == null && (
                            <Button
                                onClick={() => {
                                    connectedFetchGenesSimilarities();
                                }}
                            >
                                Find
                            </Button>
                        )}
                    </Box>

                    <SimilarGenesGridWrapper>
                        <DictyGrid
                            data={similarGenes ?? []}
                            isFetching={isLoading}
                            getRowId={(data): string => data.feature_id}
                            filterLabel="Filter"
                            selectedData={selectedSimilarGenes}
                            columnDefs={columnDefs}
                            selectionMode="multiple"
                            onSelectionChanged={setSelectedSimilarGenes}
                        />
                    </SimilarGenesGridWrapper>
                </ModalBody>
                <GeneSelectorModalControls
                    allGenesIds={similarGenes?.map((gene) => gene.feature_id) ?? []}
                    selectedGenesIds={selectedSimilarGenes.map((gene) => gene.feature_id)}
                    onClose={handleOnClose}
                />
            </ModalContainer>
        </CenteredModal>
    );
};

export default connector(FindSimilarGenesModal);
