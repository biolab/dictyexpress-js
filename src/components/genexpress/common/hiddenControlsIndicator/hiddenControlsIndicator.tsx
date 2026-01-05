import { ReactElement } from 'react';
import { Tooltip } from '@mui/material';
import { HiddenControlsIndicatorWrapper, EllipsisText } from './hiddenControlsIndicator.styles';

/**
 * Displays an ellipsis indicator (...) when controls are hidden due to module size.
 * On hover, shows a tooltip prompting the user to resize.
 */
const HiddenControlsIndicator = (): ReactElement => (
    <Tooltip title="Expand module to see more controls">
        <HiddenControlsIndicatorWrapper>
            <EllipsisText>...</EllipsisText>
        </HiddenControlsIndicatorWrapper>
    </Tooltip>
);

export default HiddenControlsIndicator;

