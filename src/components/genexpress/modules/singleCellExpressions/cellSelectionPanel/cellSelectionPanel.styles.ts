import styled from 'styled-components';
import { Button } from '@mui/material';
import { LegendBase, LegendTitle } from '../umapPlot/umapPlot.styles';

// The slate of the expression scale, which is also what selected cells are drawn in.
const SLATE = '#4a688d';
const SLATE_DARK = '#375068';

// Sits in the plot's free top-left corner and reads as one of its legends. Stacked, so it
// stays narrow enough to leave room for the expression legend on the right.
export const SelectionPanel = styled(LegendBase)`
    top: 5px;
    left: 8px;
    right: auto;
    max-width: calc(100% - 16px);
    padding: 0 6px 7px 10px;
`;

export const PanelHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 3px;
`;

export const SelectionTitle = styled(LegendTitle)`
    font-weight: 500;
    color: rgba(0, 0, 0, 0.75);
`;

export const CompareLabel = styled.span`
    font-size: 11px;
    color: rgba(0, 0, 0, 0.6);
    white-space: nowrap;
`;

export const CompareButtons = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
`;

export const CompareButton = styled(Button)<{ $primary?: boolean }>`
    && {
        font-size: 11px;
        line-height: 1.4;
        padding: 2px 8px;
        min-width: 0;
        text-transform: none;
        white-space: nowrap;
        border: 1px solid ${({ $primary }) => ($primary ? SLATE : 'rgba(0, 0, 0, 0.23)')};
        color: ${({ $primary }) => ($primary ? SLATE_DARK : 'rgba(0, 0, 0, 0.75)')};
        background: ${({ $primary }) => ($primary ? 'rgba(74, 104, 141, 0.1)' : 'transparent')};
    }

    &&:hover {
        border-color: ${({ $primary }) => ($primary ? SLATE_DARK : 'rgba(0, 0, 0, 0.5)')};
        background: ${({ $primary }) =>
            $primary ? 'rgba(74, 104, 141, 0.18)' : 'rgba(0, 0, 0, 0.04)'};
    }

    &&:focus-visible {
        outline: 2px solid ${SLATE};
        outline-offset: 1px;
    }

    &&.Mui-disabled {
        opacity: 0.5;
    }
`;

export const SelectionHint = styled.div`
    position: absolute;
    top: 10px;
    left: 10px;
    font-size: 11px;
    color: rgba(0, 0, 0, 0.45);
    pointer-events: none;
`;
