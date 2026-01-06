import styled from 'styled-components';
import { LinearProgress } from '@mui/material';

export const ModuleContainer = styled.div`
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-flow: column nowrap;
    height: 100%;
`;

export const ModuleHeader = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    font-size: 1rem;
    background-color: #eee;
    white-space: nowrap;
    text-overflow: ellipsis;
    cursor: pointer;
    text-align: center;
    padding: 5px 0;
`;

export const InfoButtonWrapper = styled.div`
    position: absolute;
    right: 8px;
    top: 45%;
    transform: translateY(-50%);
`;

export const LoadingBar = styled(LinearProgress)`
    width: 100%;
    position: absolute;
    bottom: -1px;
    left: 0;
`;

export const ModuleContent = styled.div`
    flex-grow: 1;
    overflow: hidden;
    padding: 10px 10px 10px;
    box-sizing: border-box;
`;
