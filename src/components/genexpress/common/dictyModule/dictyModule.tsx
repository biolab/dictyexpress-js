import { DataStatus } from '@genialis/resolwe/dist/api/types/rest';
import React, { ReactElement, ReactNode, useState } from 'react';
import { Info as InfoIcon } from '@mui/icons-material';
import { StatusIcon } from '../statusIcon';
import IconButtonWithTooltip from '../iconButtonWithTooltip/iconButtonWithTooltip';
import InfoModal from '../infoModal/infoModal';
import {
    ModuleHeader,
    ModuleContent,
    ModuleContainer,
    LoadingBar,
    InfoButtonWrapper,
} from './dictyModule.styles';

type DictyModuleProps = {
    children: ReactNode;
    title: string;
    isLoading: boolean;
    status?: DataStatus | null;
    infoContent?: ReactNode;
};

const DictyModule = ({
    children,
    title,
    isLoading,
    status,
    infoContent,
}: DictyModuleProps): ReactElement => {
    const [infoModalOpen, setInfoModalOpen] = useState(false);

    return (
        <ModuleContainer>
            <ModuleHeader className="dragHandle">
                {title}
                {status != null && <StatusIcon status={status} />}
                {infoContent && (
                    <InfoButtonWrapper
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <IconButtonWithTooltip
                            title="Info"
                            onClick={() => setInfoModalOpen(true)}
                            $disablePadding
                        >
                            <InfoIcon fontSize="small" style={{ color: '#9e9e9e' }} />
                        </IconButtonWithTooltip>
                    </InfoButtonWrapper>
                )}
                {isLoading && <LoadingBar color="secondary" />}
            </ModuleHeader>
            <ModuleContent>{children}</ModuleContent>
            {infoModalOpen && (
                <InfoModal title={title} onClose={() => setInfoModalOpen(false)}>
                    {infoContent}
                </InfoModal>
            )}
        </ModuleContainer>
    );
};

export default DictyModule;
