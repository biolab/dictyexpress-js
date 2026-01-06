import styled from 'styled-components';

export const SingleCellExpressionsContainer = styled.div`
    display: flex;
    flex-flow: column nowrap;
    height: 100%;
    gap: ${({ theme }) => theme.spacing(1)};
`;

export const SingleCellExpressionsControls = styled.div`
    position: relative;
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    gap: 10px;
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
