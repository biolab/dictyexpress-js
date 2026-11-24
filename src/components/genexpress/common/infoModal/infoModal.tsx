import { ReactElement, ReactNode } from 'react';
import Button from '@mui/material/Button';
import styled from 'styled-components';
import {
    ModalFooter,
    ModalBody,
    ModalHeader,
    ModalContainer,
    CenteredModal,
} from 'components/genexpress/common/dictyModal/dictyModal.styles';

// Long help scrolls in the body; the title and Close stay visible.
const InfoModalContainer = styled(ModalContainer)`
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 64px);
    max-width: calc(100vw - 32px);
`;

type InfoModalProps = {
    title: string;
    children: ReactNode;
    onClose: () => void;
};

const InfoModal = ({ title, children, onClose }: InfoModalProps): ReactElement => (
    <CenteredModal open aria-labelledby="infoModalTitle" onClose={onClose}>
        <InfoModalContainer>
            <ModalHeader id="infoModalTitle">{title}</ModalHeader>
            <ModalBody>{children}</ModalBody>
            <ModalFooter>
                <Button onClick={onClose}>Close</Button>
            </ModalFooter>
        </InfoModalContainer>
    </CenteredModal>
);

export default InfoModal;
