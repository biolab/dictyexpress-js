import styled from 'styled-components';

export const HiddenControlsIndicatorWrapper = styled.span`
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: default;
    user-select: none;
    padding: 0 4px;
`;

export const EllipsisText = styled.span`
    font-size: 1.25rem;
    font-weight: 600;
    color: ${({ theme }) => theme.palette.grey[500]};
    letter-spacing: 1px;
    line-height: 1;

    &:hover {
        color: ${({ theme }) => theme.palette.grey[700]};
    }
`;
