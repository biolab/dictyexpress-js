import { ReactElement, ReactNode } from 'react';
import Button from '@mui/material/Button';
import {
    ModalFooter,
    ModalBody,
    ModalHeader,
    ModalContainer,
    CenteredModal,
} from 'components/genexpress/common/dictyModal/dictyModal.styles';

type InfoModalProps = {
    title: string;
    children: ReactNode;
    onClose: () => void;
};

const InfoModal = ({ title, children, onClose }: InfoModalProps): ReactElement => (
    <CenteredModal open aria-labelledby="infoModalTitle" onClose={onClose}>
        <ModalContainer>
            <ModalHeader id="infoModalTitle">{title}</ModalHeader>
            <ModalBody>{children}</ModalBody>
            <ModalFooter>
                <Button onClick={onClose}>Close</Button>
            </ModalFooter>
        </ModalContainer>
    </CenteredModal>
);

export default InfoModal;
