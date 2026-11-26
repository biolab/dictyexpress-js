import styled from 'styled-components';
import { FormControl } from '@mui/material';

export const DifferentialExpressionsContainer = styled.div`
    display: flex;
    flex-flow: column nowrap;
    height: 100%;
    gap: ${({ theme }) => theme.spacing(1)};
`;

export const DifferentialExpressionsControls = styled.div`
    position: relative;
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
`;

export const ThresholdFormControlsContainer = styled.div`
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: flex-start;
    flex-grow: 1;
`;

export const ThresholdFormControl = styled(FormControl)`
    width: 115px;
    margin: 0 10px;
`;

export const VolcanoPlotContainer = styled.div`
    flex-grow: 1;
    overflow: hidden;
`;

export const MarkerFilterControls = styled.div`
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(1.5)};
    padding: 6px ${({ theme }) => theme.spacing(1)} 0;
    white-space: nowrap;

    .MuiFormControlLabel-root {
        margin: 0;
    }

    .MuiFormControlLabel-label {
        font-size: 0.8rem;
    }

    .MuiCheckbox-root {
        padding: 2px 4px;
    }
`;

export const DetectionControl = styled(FormControl)`
    width: 120px;

    .MuiInputBase-input,
    .MuiInputLabel-root {
        font-size: 0.8rem;
    }

    .MuiInputBase-input {
        padding: 4px 8px;
    }
`;

export const MarkerCount = styled.span`
    font-size: 0.8rem;
    color: rgba(0, 0, 0, 0.6);
`;
