import { ReactElement, useState } from 'react';
import { Checkbox, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { Close } from '@mui/icons-material';
import { CellSelectionReference, CellSelectionScope } from '../cellSelectionDifferentialExpression';
import {
    PanelHeader,
    CompareButton,
    CompareButtons,
    CompareLabel,
    GoButton,
    GoRow,
    ScopeOption,
    SelectionPanel,
    SelectionTitle,
} from './cellSelectionPanel.styles';

type CellSelectionPanelProps = {
    selectedCount: number;
    // Undefined when comparing isn't available (no service configured).
    onCompare?: (reference: CellSelectionReference) => void;
    onClear: () => void;
    isComparing: boolean;
    // False when the selection holds every cell of its time points, leaving no reference.
    hasSameTimeReference?: boolean;
    // Cells per region, when the selection has several regions that can be compared one by one.
    regionSizes?: number[];
    scope?: CellSelectionScope;
    onScopeChange?: (scope: CellSelectionScope) => void;
};

const CellSelectionPanel = ({
    selectedCount,
    onCompare,
    onClear,
    isComparing,
    hasSameTimeReference = true,
    regionSizes,
    scope = 'combined',
    onScopeChange,
}: CellSelectionPanelProps): ReactElement | null => {
    const [reference, setReference] = useState<CellSelectionReference>('sameTime');
    const chosenReference = hasSameTimeReference ? reference : 'rest';

    if (selectedCount === 0) {
        return null;
    }

    const clearButton = (
        <Tooltip title="Clear selection">
            <IconButton
                size="small"
                onClick={onClear}
                aria-label="Clear selection"
                sx={{ padding: '2px' }}
            >
                <Close fontSize="inherit" />
            </IconButton>
        </Tooltip>
    );

    return (
        <SelectionPanel aria-label="Cell selection">
            <PanelHeader>
                <SelectionTitle>
                    {selectedCount.toLocaleString('en-US')} cell{selectedCount !== 1 ? 's' : ''}{' '}
                    selected
                    {regionSizes != null && ` · ${regionSizes.length} regions`}
                </SelectionTitle>
                {clearButton}
            </PanelHeader>
            {onCompare != null && (
                <>
                    <CompareLabel>Compare with</CompareLabel>
                    <CompareButtons>
                        <Tooltip
                            title={
                                hasSameTimeReference
                                    ? "Other cells from the time points of the selected cells, so developmental time doesn't dominate the ranking"
                                    : 'The selection holds every cell of its time points, so no other cells are left to compare with'
                            }
                        >
                            <span>
                                <CompareButton
                                    size="small"
                                    $primary={chosenReference === 'sameTime'}
                                    aria-pressed={chosenReference === 'sameTime'}
                                    disabled={isComparing || !hasSameTimeReference}
                                    onClick={() => setReference('sameTime')}
                                >
                                    Same time points
                                </CompareButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="All other cells of this strain, from every time point">
                            <span>
                                <CompareButton
                                    size="small"
                                    $primary={chosenReference === 'rest'}
                                    aria-pressed={chosenReference === 'rest'}
                                    disabled={isComparing}
                                    onClick={() => setReference('rest')}
                                >
                                    All other cells
                                </CompareButton>
                            </span>
                        </Tooltip>
                    </CompareButtons>
                </>
            )}
            {onCompare != null && regionSizes != null && onScopeChange != null && (
                <Tooltip
                    title={`Only genes that change the same way in each region on its own (${regionSizes
                        .map((size) => size.toLocaleString('en-US'))
                        .join(
                            ' + ',
                        )} cells), so the larger region can't dominate. Unticked: all selected cells as one group.`}
                >
                    <ScopeOption
                        control={
                            <Checkbox
                                size="small"
                                checked={scope === 'shared'}
                                disabled={isComparing}
                                onChange={(event) =>
                                    onScopeChange(event.target.checked ? 'shared' : 'combined')
                                }
                            />
                        }
                        label={`Only genes shared by ${regionSizes.length === 2 ? 'both regions' : `all ${regionSizes.length} regions`}`}
                    />
                </Tooltip>
            )}
            {onCompare != null && (
                <GoRow>
                    <GoButton
                        size="small"
                        variant="contained"
                        disableElevation
                        disabled={isComparing}
                        onClick={() => onCompare(chosenReference)}
                    >
                        Go
                    </GoButton>
                    {isComparing && <CircularProgress size={10} aria-label="Ranking markers" />}
                </GoRow>
            )}
        </SelectionPanel>
    );
};

export default CellSelectionPanel;
