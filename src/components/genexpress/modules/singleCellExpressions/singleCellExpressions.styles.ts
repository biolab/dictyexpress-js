import styled from 'styled-components';

export const SingleCellExpressionsContainer = styled.div`
    display: flex;
    flex-flow: column nowrap;
    height: 100%;
    gap: ${({ theme }) => theme.spacing(1)};
`;

export const SingleCellExpressionsHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${({ theme }) => theme.spacing(1)};
    font-size: 12px;
    color: #666;
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

export const StrainSelectorContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

export const StrainLabel = styled.span`
    font-size: 13px;
    color: #666;
`;

export const StrainSelect = styled.select`
    padding: 2px 6px;
    padding-right: 20px;
    border-radius: 3px;
    border: 1px solid #d0d0d0;
    font-size: 13px;
    background-color: white;
    cursor: pointer;
    outline: none;
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3e%3cpath fill='%23666' d='M6 9L1.5 4.5h9z'/%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 4px center;

    &:hover {
        border-color: #999;
    }

    &:focus {
        border-color: #4a90e2;
        box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
    }
`;

export const StrainText = styled.span`
    font-size: 13px;
    font-weight: 500;
`;

