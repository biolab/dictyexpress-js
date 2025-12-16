import React, { ReactElement, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import _, { debounce } from 'lodash';
import { connect, ConnectedProps, useDispatch } from 'react-redux';
import TextField from '@mui/material/TextField';
import { Autocomplete, Box, CircularProgress, ListItem, Tooltip } from '@mui/material';
import { useSnackbar } from 'notistack';
import { TitleSection } from './geneSelector.styles';
import {
    getSelectedGenes,
    getHighlightedGenesIds,
    genesSelected,
    genesFetchSucceeded,
    allGenesDeselected,
} from 'redux/stores/genes';
import { Gene } from 'redux/models/internal';
import SelectedGenes from 'components/genexpress/modules/timeSeriesAndGeneSelector/geneSelector/selectedGenes/selectedGenes';
import { getBasketInfo, getSelectedTimeSeries } from 'redux/stores/timeSeries';
import { RootState } from 'redux/rootReducer';
import { splitAndCleanGenesString } from 'utils/stringUtils';
import GeneSetSelector from 'components/genexpress/modules/timeSeriesAndGeneSelector/geneSelector/geneSets/geneSetSelector';
import { handleError } from 'utils/errorUtils';
import { getGenes, getPastedGenes } from 'api';
import { objectsArrayToTsv } from 'utils/reportUtils';
import useReport from 'components/genexpress/common/reportBuilder/useReport';

const mapStateToProps = (state: RootState) => {
    return {
        selectedGenes: getSelectedGenes(state.genes),
        basketInfo: getBasketInfo(state.timeSeries),
        highlightedGenesIds: getHighlightedGenesIds(state.genes),
        selectedTimeSeries: getSelectedTimeSeries(state.timeSeries),
    };
};

const connector = connect(mapStateToProps, {
    connectedGenesFetchSucceeded: genesFetchSucceeded,
    connectedGenesSelected: genesSelected,
    connectedAllGenesDeselected: allGenesDeselected,
});

type PropsFromRedux = ConnectedProps<typeof connector>;

const GeneSelector = ({
    basketInfo,
    selectedGenes,
    highlightedGenesIds,
    selectedTimeSeries,
    connectedGenesFetchSucceeded,
    connectedGenesSelected,
    connectedAllGenesDeselected,
}: PropsFromRedux): ReactElement => {
    const {
        source: autocompleteSource,
        species: autocompleteSpecies,
        type: autocompleteType,
    } = basketInfo ?? {};
    const [autocompleteOpen, setAutocompleteOpen] = useState(false);
    const [value, setValue] = useState<Gene[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [genes, setGenes] = useState<Gene[]>([]);
    const selectedGenesRef = useRef<Gene[]>([]);
    const selectedTimeSeriesRef = useRef(selectedTimeSeries);
    const { enqueueSnackbar } = useSnackbar();
    const dispatch = useDispatch();

    const isDisabled = _.isEmpty(basketInfo);

    // TODO: Latest version of eslint (7.19.0) has a problem inferring dependencies from non-wrapped
    // functions. Enable this eslint rule once it's fixed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const fetchGenes = useCallback(
        debounce(async (queryValue: string): Promise<void> => {
            if (autocompleteSource == null || autocompleteType == null) {
                return;
            }
            setIsFetching(true);
            const genesResults = await getGenes({
                source: autocompleteSource,
                species: autocompleteSpecies,
                type: autocompleteType,
                value: queryValue,
                limit: 20,
                orderBy: 'name',
            });

            if (genesResults != null) {
                setGenes(genesResults);
            } else {
                enqueueSnackbar('Error fetching genes.', { variant: 'error' });
            }

            setAutocompleteOpen(true);
            setIsFetching(false);
        }, 500),
        [autocompleteSource, autocompleteSpecies, autocompleteType, enqueueSnackbar],
    );

    useEffect(() => {
        // Fetching genes is done with debounced function so that request is only sent after user is done typing.
        if (inputValue !== '') {
            void fetchGenes(inputValue);
        } else {
            setAutocompleteOpen(false);
        }

        /* When component is unmounted, fetchGenes async function has to be cancelled.
         * Otherwise React state update on an unmounted component error is thrown.
         */
        return (): void => {
            fetchGenes.cancel();
        };
    }, [fetchGenes, inputValue]);

    useReport(
        (processFile) => {
            processFile(
                'Genes/selected_genes.tsv',
                objectsArrayToTsv(
                    selectedGenes.map(
                        ({
                            aliases,
                            feature_id,
                            description,
                            full_name,
                            name,
                            source,
                            species,
                        }) => ({
                            feature_id,
                            full_name,
                            name,
                            aliases,
                            description,
                            source,
                            species,
                        }),
                    ),
                ),
                false,
            );
            processFile(
                'Genes/highlighted_genes.tsv',
                objectsArrayToTsv(
                    selectedGenes
                        .filter((gene) => highlightedGenesIds.includes(gene.feature_id))
                        .map(
                            ({
                                aliases,
                                feature_id,
                                description,
                                full_name,
                                name,
                                source,
                                species,
                            }) => ({
                                feature_id,
                                full_name,
                                name,
                                aliases,
                                description,
                                source,
                                species,
                            }),
                        ),
                ),
                false,
            );
        },
        [highlightedGenesIds, selectedGenes],
    );

    const openDropDown = (): void => {
        if (inputValue !== '') {
            setAutocompleteOpen(true);
        }
    };

    const handleOnInputChange = (
        _event: unknown,
        newValue: string | null,
        reason: 'input' | 'reset' | 'clear',
    ): void => {
        if (reason === 'reset') {
            return;
        }
        setInputValue(newValue != null ? newValue : '');
    };

    const handleOnChange = (_event: unknown, newValue: Gene[]): void => {
        setValue(newValue);
        connectedGenesFetchSucceeded(newValue);
        connectedGenesSelected(newValue.map((gene) => gene.feature_id));
    };

    /**
     * Set entered genes names into selected state.
     * All remaining (not existing genes names) are printed into autocomplete input.
     * User has to manually do something with them (fix them).
     * @param genesNames - Array of genes names.
     */
    const handleImportedGenesNames = useCallback(
        async (genesNames: string[]): Promise<void> => {
            try {
                if (autocompleteSource == null || autocompleteType == null) {
                    return;
                }

                setIsFetching(true);
                const pastedGenes = await getPastedGenes(
                    autocompleteSource,
                    autocompleteType,
                    genesNames,
                    autocompleteSpecies,
                );

                connectedGenesFetchSucceeded(pastedGenes);
                connectedAllGenesDeselected();
                connectedGenesSelected(pastedGenes.map((gene) => gene.feature_id));

                // Get and display not found genes.
                const notFoundGenesNames = genesNames.filter(
                    (geneName) =>
                        (_.find(pastedGenes, { name: geneName }) ||
                            _.find(pastedGenes, { feature_id: geneName })) == null,
                );
                setInputValue(notFoundGenesNames.join());
            } catch (error) {
                dispatch(handleError('Error searching for pasted genes.', error));
            } finally {
                setIsFetching(false);
            }
        },
        [
            autocompleteSource,
            autocompleteSpecies,
            autocompleteType,
            connectedAllGenesDeselected,
            connectedGenesFetchSucceeded,
            connectedGenesSelected,
            dispatch,
        ],
    );

    useEffect(() => {
        // If selectedGenes store data is changed (e.g. gene(s) were removed), autocomplete data also needs to get refreshed.
        setValue(selectedGenes);
        selectedGenesRef.current = selectedGenes;
    }, [selectedGenes]);

    useEffect(() => {
        if (
            selectedTimeSeriesRef.current !== selectedTimeSeries &&
            autocompleteSource != null &&
            autocompleteType != null
        ) {
            if (selectedGenesRef.current.length > 0 || inputValue !== '') {
                void handleImportedGenesNames([
                    ...selectedGenesRef.current.map((gene) => gene.name),
                    ...splitAndCleanGenesString(inputValue),
                ]);
            }

            selectedTimeSeriesRef.current = selectedTimeSeries;
        }
    }, [
        autocompleteSource,
        autocompleteType,
        handleImportedGenesNames,
        inputValue,
        selectedTimeSeries,
    ]);

    /**
     * Clean/retrieve entered genes names and push them into selected state.
     * All remaining (not existing genes names) are printed into autocomplete input.
     * User has to manually do something with them (fix them).
     * @param genesNamesString - Original input that the user pasted or imported with file drag.
     */
    const handleImportedGenesNamesString = (genesNamesString: string): void => {
        const enteredGenesNames = splitAndCleanGenesString(genesNamesString);

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        handleImportedGenesNames(enteredGenesNames);
    };

    const handleOnPaste = (event: React.ClipboardEvent<HTMLDivElement>): void => {
        event.preventDefault();
        const clipboardData = event.clipboardData.getData('text');
        setInputValue(clipboardData);
        handleImportedGenesNamesString(clipboardData);
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
        event.stopPropagation();

        event.dataTransfer.dropEffect = 'copy';
    };

    const handleFileDrop = (event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        const middle = event.dataTransfer || event.target;
        const file = middle.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = (readerEvent: ProgressEvent<FileReader>): void => {
            if (readerEvent.target?.readyState === FileReader.DONE) {
                handleImportedGenesNamesString(readerEvent.target.result as string);
            }
        };
        reader.readAsText(file.slice(0, file.size));
    };

    return (
        <>
            <TitleSection>
                <h3>Genes</h3>
                <GeneSetSelector
                    onSelect={(genesNames: string[]) => {
                        void handleImportedGenesNames(genesNames);
                    }}
                    selectedGenes={selectedGenes}
                    disabled={isDisabled}
                />
            </TitleSection>
            <Tooltip title={selectedTimeSeries == null ? 'First select a time series.' : ''}>
                <Autocomplete
                    data-tutorial="gene-search-input"
                    open={autocompleteOpen}
                    autoHighlight
                    filterOptions={(x) => x}
                    noOptionsText="No genes were found"
                    renderOption={(props, option) => (
                        // eslint-disable-next-line react/jsx-props-no-spreading
                        <ListItem {...props} key={option.feature_id}>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 2fr',
                                    gridGap: 3,
                                    width: 1,
                                }}
                            >
                                <span>{option.name}</span>
                                <span>{option.feature_id}</span>
                                <span>{option.description}</span>
                            </Box>
                        </ListItem>
                    )}
                    size="small"
                    loading={isFetching}
                    fullWidth
                    renderTags={(): ReactNode => undefined}
                    loadingText="Loading"
                    multiple
                    clearOnBlur={false}
                    onOpen={openDropDown}
                    onClose={(_event, reason): void => {
                        // Keep autocomplete open, unless user clicks outside of it or presses escape.
                        if (reason === 'escape' || reason === 'blur') {
                            setAutocompleteOpen(false);
                        }
                    }}
                    filterSelectedOptions
                    forcePopupIcon={false}
                    disableClearable
                    disabled={isDisabled}
                    slotProps={{
                        popper: {
                            placement: 'top',
                        },
                    }}
                    ListboxProps={{
                        style: {
                            maxHeight: '300px',
                            overflow: 'auto',
                        },
                    }}
                    renderInput={(params): ReactElement => (
                        <TextField
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            {...params}
                            variant="outlined"
                            color="secondary"
                            placeholder="Search for a gene"
                            onPaste={handleOnPaste}
                            onDragEnter={handleDragOver}
                            onDragOver={handleDragOver}
                            onDrop={handleFileDrop}
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {isFetching ? (
                                            <CircularProgress color="inherit" size={20} />
                                        ) : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                                inputProps: {
                                    ...params.inputProps,
                                    'aria-label': 'Search for a gene',
                                },
                            }}
                        />
                    )}
                    options={genes}
                    getOptionLabel={(option): string => option.name}
                    isOptionEqualToValue={(option: Gene, itemValue: Gene): boolean => {
                        return option.feature_id === itemValue.feature_id;
                    }}
                    value={value}
                    onChange={handleOnChange}
                    inputValue={inputValue}
                    onInputChange={handleOnInputChange}
                />
            </Tooltip>
            <SelectedGenes
                selectedGenes={selectedGenes}
                highlightedGenesIds={highlightedGenesIds}
            />
        </>
    );
};

export default connector(GeneSelector);
