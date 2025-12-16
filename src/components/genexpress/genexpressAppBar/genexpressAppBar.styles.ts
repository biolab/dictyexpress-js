import styled, { keyframes, css } from 'styled-components';
import { AppBar, Button } from '@mui/material';
import { GetApp } from '@mui/icons-material';
import { Title } from 'components/landing/common/title.styles';

const gradientShift = keyframes`
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
`;

export const TutorialButton = styled(Button)<{ $highlight?: boolean }>`
    ${({ $highlight }) =>
        $highlight &&
        css`
            background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #667eea 100%);
            background-size: 200% 200%;
            animation: ${gradientShift} 3s ease infinite;
            color: white !important;
            font-weight: 500;
            border-radius: 20px;
            padding: 6px 16px;
            box-shadow: 0 2px 10px rgba(102, 126, 234, 0.4);
            transition:
                transform 0.2s,
                box-shadow 0.2s;

            &:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.5);
            }
        `}
`;

export const GenexpressAppBarWrapper = styled(AppBar)`
    background-color: #fff;
`;

export const DesktopSectionContainer = styled.div`
    display: inline-flex;
    width: 100%;
    flex-flow: row wrap;
    justify-content: space-between;
`;

export const DictyLogo = styled.img`
    margin: 10px;
    height: 25px;
    width: 25px;
`;

export const LoggedInInformation = styled.div`
    color: black;
`;

export const TitleContainer = styled.div`
    display: inline-flex;
    flex-flow: row nowrap;
    align-items: center;
    padding-left: 10px;

    .version {
        position: relative;
        top: 0.2em;
        color: #49688d;
        font-size: 0.75em;
        margin-left: 1em;
    }
`;

export const GenexpressTitle = styled(Title)`
    font-size: 1rem;
    padding: 0;
    margin: 0;
`;

export const ActionsContainer = styled.div`
    padding-right: 20px;
    display: inline-flex;
    flex-flow: row nowrap;
    align-items: center;
`;

export const DownloadIcon = styled(GetApp)`
    font-size: 1.2rem;
`;

export const BookmarkLinkContainer = styled.div`
    display: flex;
    align-items: center;
    padding: 15px;
    justify-content: space-between;
`;

export const BookmarkUrl = styled.a`
    margin-right: 24px;
`;
