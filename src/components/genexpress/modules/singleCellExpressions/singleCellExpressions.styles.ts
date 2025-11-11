import styled from 'styled-components';

export const SingleCellExpressionsContainer = styled.div`
    display: flex;
    flex-flow: column nowrap;
    height: 100%;
    gap: ${({ theme }) => theme.spacing(1)};
`;

export const ControlsRow = styled.div<{ $toggleCount?: number }>`
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: flex-end;
    padding-right: ${({ $toggleCount = 1 }) => $toggleCount * 80}px; /* Dynamic space for legend toggles */
`;

export const LegendToggleContainer = styled.div`
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    gap: 0px;
`;

export const InfoRow = styled.div`
    display: flex;
    justify-content: center;
    text-align: center;
    align-items: center;
    padding: ${({ theme }) => theme.spacing(1)};
    font-size: 14px;
    font-family: 'FS Joey Web Regular', sans-serif;
    color: #000;
    gap: 5px;
`;

export const LoadingMessage = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

export const ErrorMessage = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: ${({ theme }) => theme.palette.error.main};
`;

