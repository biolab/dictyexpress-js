import styled from 'styled-components';

export const ScatterPlotContainer = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 200px;
    min-width: 200px;
    overflow: hidden;
    touch-action: none;
    overscroll-behavior: contain;
`;

export const CappedWarning = styled.div`
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(255, 243, 205, 0.95);
    color: #664d03;
    border: 1px solid #ffecb5;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 12px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    z-index: 1000;
`;

export const ControlsContainer = styled.div`
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 1000;
`;

export const ControlButton = styled.button`
    padding: 4px 8px;
    font-size: 12px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
        background: rgba(255, 255, 255, 1);
    }
`;

export const ZoomDisplay = styled.div`
    padding: 4px 8px;
    font-size: 12px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #ccc;
    border-radius: 4px;
    text-align: center;
`;

export const ControlGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

export const ControlLabel = styled.label`
    font-size: 10px;
    font-weight: bold;
    color: #666;
    margin-bottom: 2px;
`;

export const ControlSelect = styled.select`
    padding: 4px 6px;
    font-size: 12px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #ccc;
    border-radius: 4px;
    min-width: 80px;
`;

export const Canvas = styled.canvas<{ $isDragging: boolean; $isHovering: boolean }>`
    display: block;
    cursor: ${({ $isDragging, $isHovering }) =>
        $isDragging ? 'grabbing' : $isHovering ? 'pointer' : 'grab'};
    border-radius: 4px;
    box-sizing: border-box;
`;

export const Legend = styled.div`
    position: absolute;
    bottom: 10px;
    right: 10px;
    background: rgba(255, 255, 255, 0.9);
    padding: 6px 8px;
    border-radius: 4px;
    border: 1px solid #ccc;
    width: 160px;
`;

export const LegendGradient = styled.div`
    height: 10px;
    background: linear-gradient(to right, #e8e8e8 0%, #4a688d 80%, #375068 100%);
    border-radius: 2px;
`;

export const LegendLabels = styled.div`
    display: flex;
    justify-content: space-between;
    margin-top: 4px;
    font-size: 12px;
`;

export const AxisIndicator = styled.div`
    position: absolute;
    bottom: 10px;
    left: 10px;
    pointer-events: none;
    color: #666;
`;

export const Tooltip = styled.div`
    position: absolute;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 8px 10px;
    border-radius: 4px;
    font-size: 12px;
    pointer-events: none;
    z-index: 1001;
    max-height: 400px;
    overflow-y: auto;
    min-width: 200px;
    width: max-content;
    max-width: 300px;
`;

export const TooltipHeader = styled.div`
    font-weight: 600;
    margin-bottom: 4px;
`;

export const TooltipGeneItem = styled.div`
    margin-bottom: 2px;
    font-size: 11px;
`;

export const TooltipGeneSymbol = styled.span`
    font-weight: 500;
`;

export const TimeLegend = styled.div`
    position: absolute;
    bottom: 10px;
    right: 10px;
    background: rgba(255, 255, 255, 0.95);
    padding: 8px 10px;
    border-radius: 4px;
    border: 1px solid #ccc;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

export const TimeLegendItems = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export const TimeLegendItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #555;
`;

export const TimeLegendDot = styled.div<{ $color: string }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${({ $color }) => $color};
    flex-shrink: 0;
`;

