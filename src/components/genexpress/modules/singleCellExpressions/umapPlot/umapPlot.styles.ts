import styled from 'styled-components';

export const ScatterPlotContainer = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 200px;
    min-width: 200px;
    touch-action: none;
    overscroll-behavior: contain;
`;

export const ZoomHint = styled.div<{ $visible: boolean }>`
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.7);
    color: rgb(0, 0, 0, 0.6);
    border-radius: 5px;
    padding: 4px 8px;
    font-size: 11px;
    pointer-events: none;
    opacity: ${({ $visible }) => ($visible ? 1 : 0)};
    transition: opacity 0.15s ease;
`;

export const Canvas = styled.canvas<{
    $isDragging: boolean;
    $isBrushing: boolean;
    $isHovering: boolean;
}>`
    display: block;
    cursor: ${({ $isDragging, $isBrushing, $isHovering }) =>
        $isBrushing ? 'crosshair' : $isDragging ? 'grabbing' : $isHovering ? 'pointer' : 'grab'};
    border-radius: 4px;
    box-sizing: border-box;
`;

// Width the pan/select tools take up at the plot's left edge, gap included; the cell
// selection panel starts after it.
export const SELECTION_TOOLS_OFFSET = 34;

export const SelectionTools = styled.div`
    position: absolute;
    top: 8px;
    left: 8px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 4px;

    .MuiToggleButton-root {
        padding: 4px;
        font-size: 16px;
    }
`;

export const AxisIndicator = styled.div`
    position: absolute;
    bottom: 0px;
    left: 10px;
    pointer-events: none;
    color: #666;
`;

// Shared legend fieldset base styles
export const LegendBase = styled.fieldset`
    position: absolute;
    right: 8px;
    background: rgba(255, 255, 255, 0.95);
    padding: 1px 5px 5px 5px;
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.23);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

// Shared legend title styles
export const LegendTitle = styled.legend`
    font-size: 11px;
    color: rgba(0, 0, 0, 0.6);
    font-weight: 400;
`;

export const TimeLegend = styled(LegendBase)`
    bottom: 5px;
    padding: 0px 10px 5px 10px;
`;

export const TimeLegendTitle = LegendTitle;

export const TimeLegendItems = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0px;
`;

export const TimeLegendItem = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: #555;
`;

// A legend entry that selects its group's cells; tinted while the whole group is selected.
export const LegendItemButton = styled.button<{ $isSelected: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    margin: 0 -4px;
    padding: 0 4px;
    border: none;
    border-radius: 3px;
    background: ${({ $isSelected }) => ($isSelected ? 'rgba(255, 152, 0, 0.18)' : 'none')};
    font: inherit;
    font-size: 12px;
    color: #555;
    text-align: left;
    cursor: pointer;

    &:hover {
        background: ${({ $isSelected }) =>
            $isSelected ? 'rgba(255, 152, 0, 0.28)' : 'rgba(0, 0, 0, 0.06)'};
    }

    &:focus-visible {
        outline: 2px solid rgba(255, 152, 0, 0.6);
    }
`;

export const TimeLegendDot = styled.div<{ $color: string }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${({ $color }) => $color};
    flex-shrink: 0;
`;

export const ExpressionAlphaLegend = styled(LegendBase)`
    top: 5px;
`;

export const AlphaLegendTitle = styled(LegendTitle)`
    margin-left: 5px;
`;

export const AlphaGradientContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
`;

export const AlphaGradientBar = styled.div<{ $isExpression?: boolean }>`
    height: 8px;
    width: 80px;
    background: ${({ $isExpression }) =>
        $isExpression
            ? 'linear-gradient(to right, #e8e8e8 0%, #4a688d 80%, #375068 100%)'
            : 'linear-gradient(to right, rgba(100, 100, 100, 0.1) 0%, rgba(100, 100, 100, 0.4) 40%, rgba(100, 100, 100, 0.7) 70%, rgba(100, 100, 100, 1.0) 100%)'};
    border-radius: 2px;
    border: 1px solid #ddd;
`;

export const AlphaLabel = styled.span`
    font-size: 10px;
    color: #666;
    min-width: 20px;
    text-align: center;
`;
