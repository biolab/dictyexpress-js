import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Button, MenuItem, Tooltip, SelectChangeEvent } from '@mui/material';
import _ from 'lodash';
import { ColDef, SortChangedEvent, ValueFormatterParams } from 'ag-grid-community';
import {
    GOEnrichmentContainer,
    GOEnrichmentControl,
    GOEnrichmentControls,
    GOEnrichmentGridContainer,
} from './gOEnrichment.styles';
import ScoreCell from './scoreCell/scoreCell';
import GOEnrichmentMatchedCell from './matchedCell/matchedCell';
import TermCell from './termCell/termCell';
import GOEnrichmentAssociationsModal from './associationsModal/associationsModal';
import { RootState } from 'redux/rootReducer';
import { getSelectedGenes, getHighlightedGenes } from 'redux/stores/genes';
import {
    getGOEnrichmentJson,
    getIsFetchingGOEnrichmentJson,
    getPValueThreshold,
    pValueThresholdChanged,
    pValueThresholdsOptions,
} from 'redux/stores/gOEnrichment';
import { Option, GOEnrichmentRow } from 'redux/models/internal';
import DictyGrid from 'components/genexpress/common/dictyGrid/dictyGrid';
import DictySelect from 'components/genexpress/common/dictySelect/dictySelect';
import { formatNumber } from 'utils/math';
import useReport from 'components/genexpress/common/reportBuilder/useReport';
import { objectsArrayToTsv } from 'utils/reportUtils';
import { advancedJoin } from 'utils/arrayUtils';
import {
    ontologyJsonToOntologyRows,
    ontologyJsonToTermsTable,
    getRowId,
} from 'utils/gOEnrichmentUtils';
import useStateWithEffect from 'components/genexpress/common/useStateWithEffect';
import { AspectValue, BookmarkStatePath } from 'components/genexpress/common/constants';
import useBookmarkableState from 'components/genexpress/common/useBookmarkableState';
import { pluralize } from 'utils/stringUtils';

const mapStateToProps = (state: RootState) => {
    return {
        pValueThreshold: getPValueThreshold(state.gOEnrichment),
        selectedGenes: getSelectedGenes(state.genes),
        highlightedGenes: getHighlightedGenes(state.genes),
        isFetchingGOEnrichmentJson: getIsFetchingGOEnrichmentJson(state.gOEnrichment),
        gOEnrichmentJson: getGOEnrichmentJson(state.gOEnrichment),
    };
};

const connector = connect(mapStateToProps, {
    connectedPValueThresholdChanged: pValueThresholdChanged,
});

type PropsFromRedux = ConnectedProps<typeof connector>;

export const aspectOptions: Option<AspectValue>[] = [
    { value: AspectValue.bp, label: 'Biological process' },
    { value: AspectValue.cc, label: 'Cellular component' },
    { value: AspectValue.mf, label: 'Molecular function' },
];

const GOEnrichment = ({
    gOEnrichmentJson,
    pValueThreshold,
    selectedGenes,
    highlightedGenes,
    connectedPValueThresholdChanged,
    isFetchingGOEnrichmentJson,
}: PropsFromRedux): ReactElement => {
    // Use highlighted genes for GO enrichment when available, otherwise use selected genes
    const genesForEnrichment = highlightedGenes.length > 0 ? highlightedGenes : selectedGenes;
    const [selectedAspect, setSelectedAspect] = useBookmarkableState(
        aspectOptions[0],
        BookmarkStatePath.gOEnrichmentSelectedAspect,
    );
    const [gOEnrichmentRows, setGOEnrichmentRows] = useState<GOEnrichmentRow[]>([]);
    const [allAspectsEmpty, setAllAspectsEmpty] = useState(true);
    const [treeView, setTreeView] = useState(true);
    const [sortModel, setSortModel] = useState<{ field: string; order: string } | null>(null);
    const [gOEnrichmentAssociationsModalOpened, setGOEnrichmentAssociationsModalOpened] =
        useState(false);
    const [clickedGOEnrichmentRow, setClickedGOEnrichmentRow] = useState<GOEnrichmentRow>(
        {} as GOEnrichmentRow,
    );

    type CollapsedData = Record<string, { hidden: boolean; manuallyCollapsed: boolean }>;
    const [collapsedGOEnrichmentRows, setCollapsedGOEnrichmentRows] = useState<CollapsedData>({});

    useEffect(() => {
        if (gOEnrichmentJson == null) {
            setGOEnrichmentRows([]);
            return;
        }

        let rows = ontologyJsonToOntologyRows(gOEnrichmentJson, selectedAspect.value, true);

        // If user is sorting gene ontology enrichment data, exclude duplicates.
        if (!treeView) {
            rows = _.uniqBy(rows, (row) => row.term_id);
        }

        setGOEnrichmentRows(rows);
    }, [gOEnrichmentJson, selectedAspect, treeView]);

    useEffect(() => {
        if (gOEnrichmentJson == null) {
            setAllAspectsEmpty(true);
            return;
        }

        const valuesInAllAspects = _.flatten(_.values(gOEnrichmentJson.tree));
        setAllAspectsEmpty(_.isEmpty(valuesInAllAspects));
    }, [gOEnrichmentJson]);

    const getCaption = useCallback((): string => {
        const genes = advancedJoin(genesForEnrichment.map(({ name }) => name));
        const termTables = advancedJoin(aspectOptions.map(({ label }) => `${label}.tsv`));
        const geneType = highlightedGenes.length > 0 ? 'highlighted' : 'selected';

        return `
Identified significantly enriched Gene Ontology terms (p-value < ${pValueThreshold})
for ${geneType} genes (${genes}).

Tables ${termTables} are sorted by p-value.
A list of all gene associations for each term is available in a separate file - all_associations.tsv.
    `.trim();
    }, [pValueThreshold, genesForEnrichment, highlightedGenes.length]);

    useReport(
        async (processFile) => {
            if (gOEnrichmentJson == null) {
                return;
            }

            const associationsTable = _.flatten(
                _.map(gOEnrichmentJson.gene_associations, (allAssociations, term) => {
                    return _.map(allAssociations, (association) => {
                        return { term, association };
                    });
                }),
            );

            const allAspectsTermsTablePromises = aspectOptions.map(async (aspectOption) => {
                return {
                    termsTable: await ontologyJsonToTermsTable(
                        gOEnrichmentJson,
                        aspectOption.value,
                    ),
                    aspectOption,
                };
            });

            const termTables = await Promise.all(allAspectsTermsTablePromises);

            termTables.forEach(({ termsTable, aspectOption }) => {
                processFile(
                    `Gene Ontology Enrichment Analysis/${aspectOption.label}.tsv`,
                    objectsArrayToTsv(termsTable),
                    false,
                );
            });
            processFile(
                'Gene Ontology Enrichment Analysis/all_associations.tsv',
                objectsArrayToTsv(associationsTable),
                false,
            );
            processFile('Gene Ontology Enrichment Analysis/caption.txt', getCaption(), false);
        },
        [gOEnrichmentJson, getCaption],
    );

    const handleAspectsOnChange = (event: SelectChangeEvent<unknown>): void => {
        const selectedAspectOption = aspectOptions.find(
            (aspectOption) => aspectOption.value === event.target.value,
        );
        if (selectedAspectOption != null) {
            setSelectedAspect(selectedAspectOption);
        }
    };

    const handlePValueThresholdChange = (event: SelectChangeEvent<unknown>): void => {
        connectedPValueThresholdChanged(event.target.value as number);
    };

    const onSortChangedHandler = (event: SortChangedEvent): void => {
        // If tree view is already displayed, wait until user manually switches back to
        // hierarchical view.
        if (!treeView) {
            return;
        }
        const columnsState = event.api.getColumnState();
        const sortedColumn = columnsState.find((columnState) => columnState.sort != null);
        if (sortedColumn != null && sortedColumn.colId != null && sortedColumn.sort != null) {
            setTreeView(false);
            setSortModel({
                field: sortedColumn.colId,
                order: sortedColumn.sort,
            });
        }
    };

    const getSort = useCallback(
        (field: string): string | undefined => {
            if (treeView) {
                return undefined;
            }
            return sortModel != null && sortModel.field === field ? sortModel.order : undefined;
        },
        [sortModel, treeView],
    );

    const onMatchedGenesClickHandler = (row: GOEnrichmentRow): void => {
        setClickedGOEnrichmentRow(row);
        setGOEnrichmentAssociationsModalOpened(true);
    };

    const onToggleCollapseClickHandler = (row: GOEnrichmentRow): void => {
        setCollapsedGOEnrichmentRows((oldCollapsedRows) => {
            const collapsedRows = { ...oldCollapsedRows };

            const flattenChildrenIds = (
                nodes: GOEnrichmentRow[] | undefined,
                untilCollapsed: boolean,
                path: string[],
            ): string[] => {
                if (!nodes || nodes.length === 0) return [];

                return nodes.reduce((flattened: string[], node: GOEnrichmentRow) => {
                    const newPath = [...path, node.term_name];
                    const isCollapsed = collapsedRows[getRowId(node, newPath)]?.manuallyCollapsed;
                    const subChildren =
                        untilCollapsed && isCollapsed
                            ? []
                            : flattenChildrenIds(node.children, untilCollapsed, newPath);
                    return [...flattened, getRowId(node, newPath), ...subChildren];
                }, []);
            };

            const assureKeyExists = (key: string) => {
                if (!(key in collapsedRows)) {
                    collapsedRows[key] = { hidden: false, manuallyCollapsed: false };
                }
            };

            // get own collapsed status
            const rowId = getRowId(row, row.path);
            assureKeyExists(rowId);
            const isCollapsed = collapsedRows[rowId].manuallyCollapsed;

            // hide children
            if (row.children) {
                const children = flattenChildrenIds(row.children, isCollapsed, row.path);
                children.forEach((childId) => {
                    assureKeyExists(childId);
                    collapsedRows[childId].hidden = !isCollapsed;
                });
            }

            // set own collapsed status
            collapsedRows[rowId].manuallyCollapsed = !isCollapsed;

            return collapsedRows;
        });
    };

    const columnDefs = useStateWithEffect(
        () =>
            [
                {
                    field: 'pval',
                    headerName: 'p-value',
                    width: 85,
                    sort: getSort('pval'),
                    valueFormatter: ({ value }: ValueFormatterParams): string =>
                        formatNumber(value, 'long'),
                },
                {
                    field: 'score',
                    headerName: 'Score',
                    sort: getSort('score'),
                    cellRenderer: ScoreCell,
                    minWidth: 85,
                },
                {
                    field: 'matched',
                    headerName: 'N',
                    width: 100,
                    sort: getSort('matched'),
                    cellRenderer: GOEnrichmentMatchedCell,
                    cellRendererParams: {
                        onMatchedGenesClick: onMatchedGenesClickHandler,
                    },
                },
                {
                    field: 'term_name',
                    headerName: 'Term',
                    width: 400,
                    sortable: !treeView,
                    cellRenderer: treeView ? TermCell : null,
                    cellRendererParams: {
                        onToggleCollapseClick: onToggleCollapseClickHandler,
                    },
                    // Ag-grid will compare old and new values to determine if a re-render is needed.
                    // By default, the value is just the term_name, so cells' icons wouldn't update on collapse.
                    valueGetter: treeView
                        ? (row) => String(row.data.term_name) + String(row.data.collapsed)
                        : null,
                },
            ] as ColDef[],
        [getSort, treeView],
    );

    const displayedRows = useStateWithEffect(
        () =>
            gOEnrichmentRows
                .filter((el) => !collapsedGOEnrichmentRows[getRowId(el, el.path)]?.hidden)
                .map((el) => ({
                    ...el,
                    collapsed: collapsedGOEnrichmentRows[getRowId(el, el.path)]?.manuallyCollapsed,
                })),
        [gOEnrichmentRows, collapsedGOEnrichmentRows],
    );

    return (
        <>
            <GOEnrichmentContainer>
                <Tooltip
                    title={
                        selectedGenes.length === 0
                            ? "Gene Ontology Enrichment can't be enabled until at least one gene is selected."
                            : ''
                    }
                >
                    <GOEnrichmentControls>
                        <GOEnrichmentControl>
                            <DictySelect
                                disabled={allAspectsEmpty}
                                label="Aspect"
                                value={selectedAspect?.value}
                                handleOnChange={handleAspectsOnChange}
                            >
                                {aspectOptions.map((aspectOption) => (
                                    <MenuItem value={aspectOption.value} key={aspectOption.value}>
                                        {aspectOption.label}
                                    </MenuItem>
                                ))}
                            </DictySelect>
                        </GOEnrichmentControl>
                        <GOEnrichmentControl>
                            <DictySelect
                                disabled={selectedGenes.length === 0 || isFetchingGOEnrichmentJson}
                                label="p-value"
                                value={pValueThreshold}
                                handleOnChange={handlePValueThresholdChange}
                            >
                                {pValueThresholdsOptions.map((pValueThresholdOption) => (
                                    <MenuItem
                                        value={pValueThresholdOption}
                                        key={pValueThresholdOption}
                                    >
                                        {pValueThresholdOption}
                                    </MenuItem>
                                ))}
                            </DictySelect>
                        </GOEnrichmentControl>
                        {gOEnrichmentRows.length > 0 && (
                            <GOEnrichmentControl>
                                {treeView && (
                                    <Tooltip title="View terms in a sortable grid (instead of hierarchical tree)">
                                        <Button onClick={(): void => setTreeView(false)}>
                                            Flat
                                        </Button>
                                    </Tooltip>
                                )}
                                {!treeView && (
                                    <Tooltip title="View terms in a hierarchical tree">
                                        <Button onClick={(): void => setTreeView(true)}>
                                            Hierarchy
                                        </Button>
                                    </Tooltip>
                                )}
                            </GOEnrichmentControl>
                        )}
                    </GOEnrichmentControls>
                </Tooltip>
                <GOEnrichmentGridContainer>
                    {gOEnrichmentRows.length > 0 && (
                        <DictyGrid
                            isFetching={isFetchingGOEnrichmentJson}
                            data={displayedRows}
                            hideFilter
                            disableSizeColumnsToFit
                            columnDefs={columnDefs}
                            onSortChanged={onSortChangedHandler}
                            getRowId={(data) => getRowId(data, data.path)}
                        />
                    )}
                    {(isFetchingGOEnrichmentJson ||
                        (gOEnrichmentJson == null && genesForEnrichment.length > 0)) &&
                        `Computing Gene Ontology Enrichment for ${genesForEnrichment.length} ${highlightedGenes.length > 0 ? 'highlighted ' : ''}${pluralize('gene', genesForEnrichment.length)}.`}
                    {/* Only display info's about enriched terms when fetching data is complete. */}
                    {isFetchingGOEnrichmentJson === false &&
                        ((gOEnrichmentJson != null && allAspectsEmpty) ||
                            (gOEnrichmentJson == null && genesForEnrichment.length === 0)) &&
                        'Enriched terms not found.'}
                    {isFetchingGOEnrichmentJson === false &&
                        gOEnrichmentJson != null &&
                        !allAspectsEmpty &&
                        gOEnrichmentRows.length === 0 &&
                        'Enriched terms not found within selected aspect.'}
                </GOEnrichmentGridContainer>
            </GOEnrichmentContainer>
            {gOEnrichmentAssociationsModalOpened && (
                <GOEnrichmentAssociationsModal
                    gOEnrichmentRow={clickedGOEnrichmentRow}
                    handleOnClose={(): void => setGOEnrichmentAssociationsModalOpened(false)}
                />
            )}
        </>
    );
};

export default connector(GOEnrichment);
