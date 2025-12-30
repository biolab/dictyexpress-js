import styled from 'styled-components';
import { Modal } from '@mui/material';
import { Theme } from '@mui/material/styles/createTheme';

export const CenteredModal = styled(Modal)`
    display: flex;
    align-items: center;
    justify-content: center;
`;

export const ModalContainer = styled.div`
    background-color: ${(props): string => (props.theme as Theme).palette.background.paper};
    width: 600px;
`;

export const ModalHeader = styled.h3`
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
    border-bottom: 1px solid #e5e5e5;
    min-height: 16px;
    margin: 0;
    padding: 15px;
`;

export const ModalBody = styled.div`
    position: relative;
    padding: 15px;
    overflow-y: auto;
    flex: 1;

    p {
        font-size: 1rem;
        line-height: 1.5;
        margin: 0 0 12px;
        // text-indent: 1.5em;

        // &:first-of-type {
        //     text-indent: 0;
        // }
    }

    ul {
        margin: 0 0 12px;
        padding-left: 22px;
    }

    li {
        font-size: 1rem;
        line-height: 1.5;
        margin: 0 0 6px;
    }
`;

export const ModalFooter = styled.div`
    padding: 15px;
    text-align: right;
    border-top: 1px solid #e5e5e5;
`;

export const FooterControlsContainer = styled.div`
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-between;
    align-items: center;
`;
