import { ReactElement } from 'react';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import { Close } from '@mui/icons-material';
import { CellSelectionReference } from '../cellSelectionDifferentialExpression';
import {
    PanelHeader,
    CompareButton,
    CompareButtons,
    CompareLabel,
    SelectionHint,
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
};

const CellSelectionPanel = ({
    selectedCount,
    onCompare,
    onClear,
    isComparing,
    hasSameTimeReference = true,
}: CellSelectionPanelProps): ReactElement => {
    if (selectedCount === 0) {
        return (
            <SelectionHint>Shift + drag, or click a legend entry, to select cells</SelectionHint>
        );
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
            <SelectionTitle>
                {selectedCount.toLocaleString('en-US')} cell{selectedCount !== 1 ? 's' : ''}{' '}
                selected
            </SelectionTitle>
            <PanelHeader>
                <CompareLabel>
                    {onCompare != null && 'Find markers vs'}
                    {isComparing && (
                        <CircularProgress
                            size={10}
                            aria-label="Ranking markers"
                            sx={{ marginLeft: '6px', verticalAlign: 'middle' }}
                        />
                    )}
                </CompareLabel>
                {clearButton}
            </PanelHeader>
            {onCompare != null && (
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
                                $primary
                                disabled={isComparing || !hasSameTimeReference}
                                onClick={() => onCompare('sameTime')}
                            >
                                Same time points
                            </CompareButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="All other cells of this strain, from every time point">
                        <span>
                            <CompareButton
                                size="small"
                                disabled={isComparing}
                                onClick={() => onCompare('rest')}
                            >
                                All other cells
                            </CompareButton>
                        </span>
                    </Tooltip>
                </CompareButtons>
            )}
        </SelectionPanel>
    );
};

export default CellSelectionPanel;
