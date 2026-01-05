import styled, { css } from 'styled-components';
import { TextField } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

export const DictyGridContainer = styled.div`
    height: 100%;
    display: flex;
    flex-flow: column nowrap;
`;

type GridWrapperProps = {
    $suppressHorizontalScroll?: boolean;
};

export const GridWrapper = styled.div<GridWrapperProps>`
    height: 100%;
    overflow: hidden;
    font-size: 0.875rem;
    position: relative;

    // sizeColumnsToFit action should set column widths so that horizontal scroll
    // isn't needed. Sometimes this doesn't work because of rounding pixels.
    // That's why we remove horizontal scroll manually with this css.
    && {
        ${(props) =>
            props.$suppressHorizontalScroll
                ? css`
                      .ag-center-cols-viewport {
                          overflow-x: hidden;
                      }
                  `
                : null};
    }
`;

// Scroll shadow - single component for all directions
type ShadowDir = 'top' | 'bottom' | 'left' | 'right';
const gradients: Record<ShadowDir, string> = {
    top: 'to bottom',
    bottom: 'to top',
    left: 'to right',
    right: 'to left',
};

export const ScrollShadow = styled.div<{ $dir: ShadowDir; $visible: boolean; $offset?: number }>`
    position: absolute;
    pointer-events: none;
    z-index: 10;
    transition: opacity 0.2s;
    opacity: ${(p) => (p.$visible ? 1 : 0)};
    background: linear-gradient(
        ${(p) => gradients[p.$dir]},
        rgba(0, 0, 0, 0.08) 0%,
        transparent 100%
    );
    ${(p) =>
        p.$dir === 'top' || p.$dir === 'bottom'
            ? css`
                  left: 0;
                  right: 0;
                  height: 16px;
                  ${p.$dir}: ${p.$dir === 'top' ? (p.$offset ?? 0) : 0}px;
              `
            : css`
                  top: ${p.$offset ?? 0}px;
                  bottom: 0;
                  width: 16px;
                  ${p.$dir}: 0;
              `}
`;

export const FilterTextField = styled(TextField)`
    margin-bottom: 5px;
`;

export const GridRowDeleteIcon = styled(DeleteIcon)`
    font-size: 24px;
    cursor: pointer;
`;
