import styled, { css } from 'styled-components';
import { Switch } from '@mui/material';

export const GOEnrichmentGridContainer = styled.div`
    flex-grow: 1;
    overflow: hidden;
`;

export const GOEnrichmentContainer = styled.div`
    display: flex;
    flex-flow: column nowrap;
    height: 100%;
`;

export const GOEnrichmentControls = styled.div`
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    margin-bottom: 10px;
`;

export const GOEnrichmentControl = styled.div`
    margin-right: 10px;
`;

export const ViewToggleContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`;

export const ViewToggleLabels = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    width: 100%;
    font-size: 0.9rem;
`;

export const ViewToggleLabel = styled.span<{ $isActive: boolean }>`
    text-align: center;
    font-size: inherit;
    ${({ $isActive }) => css`
        opacity: ${$isActive ? 1 : 0.5};
        font-weight: ${$isActive ? 600 : 400};
    `}
`;

export const DarkSwitch = styled(Switch)`
    & .MuiSwitch-switchBase {
        color: #212121;

        &.Mui-checked {
            color: #212121;
        }

        &.Mui-checked + .MuiSwitch-track {
            background-color: #212121;
        }
    }

    & .MuiSwitch-track {
        background-color: #212121;
    }
`;
