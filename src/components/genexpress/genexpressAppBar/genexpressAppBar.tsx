import { ReactElement, useState, useRef } from 'react';
import { Button, CircularProgress, Popover, Menu, MenuItem } from '@mui/material';
import { Bookmark as BookmarkIcon } from '@mui/icons-material';
import { connect, ConnectedProps, useStore } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { useTutorial } from '../tutorial';
import { LoadingBar } from '../common/dictyModule/dictyModule.styles';
import * as reportBuilder from '../common/reportBuilder/reportBuilder';
import IconButtonWithTooltip from '../common/iconButtonWithTooltip/iconButtonWithTooltip';
import TextInputModal from '../common/textInputModal/textInputModal';
import { ModalHeader } from '../common/dictyModal/dictyModal.styles';
import { DictyUrlQueryParameter } from '../common/constants';
import { Version } from '../../common/version';
import {
    GenexpressAppBarWrapper,
    DictyLogo,
    TitleContainer,
    GenexpressTitle,
    DesktopSectionContainer,
    ActionsContainer,
    DownloadIcon,
    BookmarkLinkContainer,
    BookmarkUrl,
} from './genexpressAppBar.styles';
import dictyLogo from 'images/favicon.ico';
import { RootState } from 'redux/rootReducer';
import { getUser, getIsLoggedIn } from 'redux/stores/authentication';
import DictyAppBar from 'components/common/dictyAppBar/dictyAppBar';
import { layoutsReset } from 'redux/stores/layouts';
import {
    getIsFetchingDifferentialExpressions,
    getIsFetchingDifferentialExpressionsData,
} from 'redux/stores/differentialExpressions';
import { getTimeSeriesIsFetching, getIsAddingToBasket } from 'redux/stores/timeSeries';
import { getIsFetchingSamplesExpressions } from 'redux/stores/samplesExpressions';
import { getIsFetchingGOEnrichmentJson } from 'redux/stores/gOEnrichment';
import { saveBookmarkState } from 'managers/bookmarkStateManager';
import { setClipboardText } from 'utils/documentHelpers';
import { login, logout } from 'api/authApi';

const mapStateToProps = (state: RootState) => {
    return {
        user: getUser(state.authentication),
        isLoggedIn: getIsLoggedIn(state.authentication),
        isFetchingDifferentialExpressions: getIsFetchingDifferentialExpressions(
            state.differentialExpressions,
        ),
        isFetchingDifferentialExpressionsData: getIsFetchingDifferentialExpressionsData(
            state.differentialExpressions,
        ),
        isFetchingTimeSeries: getTimeSeriesIsFetching(state.timeSeries),
        isAddingToBasket: getIsAddingToBasket(state.timeSeries),
        isFetchingSamplesExpressions: getIsFetchingSamplesExpressions(state.samplesExpressions),
        isFetchingGOEnrichmentJson: getIsFetchingGOEnrichmentJson(state.gOEnrichment),
    };
};

const connector = connect(mapStateToProps, {
    connectedLayoutsReset: layoutsReset,
});

type PropsFromRedux = ConnectedProps<typeof connector>;

type GenexpressAppBarProps = {
    isLoading: boolean;
} & PropsFromRedux;

const GenexpressAppBar = ({
    user,
    isLoggedIn,
    isLoading,
    connectedLayoutsReset,
    isFetchingDifferentialExpressions,
    isFetchingDifferentialExpressionsData,
    isFetchingTimeSeries,
    isAddingToBasket,
    isFetchingSamplesExpressions,
    isFetchingGOEnrichmentJson,
}: GenexpressAppBarProps): ReactElement => {
    const location = useLocation();
    const { startTutorial, showTutorialHint, isRunning } = useTutorial();

    const [userMenuOpened, setUserMenuOpened] = useState(false);
    const [exportPrefixModalOpened, setExportPrefixModalOpened] = useState(false);
    const [bookmarkPopoverOpened, setBookmarkPopoverOpened] = useState(false);
    const store = useStore<RootState>();
    const bookmarkButtonElement = useRef<HTMLButtonElement>(null);
    const userButtonElement = useRef<HTMLButtonElement>(null);
    const [bookmark, setBookmark] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    /**
     * Execute export once user clicks on Export button in export prefix modal.
     */
    const handleExportPrefix = async (prefix: string) => {
        setIsExporting(true);
        await reportBuilder.exportToZip(prefix);

        setIsExporting(false);
    };

    const handleBookmarkClick = async (): Promise<void> => {
        const url = new URL(window.location.href);

        url.searchParams.delete(DictyUrlQueryParameter.genes);
        url.searchParams.set(
            DictyUrlQueryParameter.appState,
            await saveBookmarkState(store.getState()),
        );

        setBookmark(url.toString());
        setBookmarkPopoverOpened(true);
    };

    const areExportingModulesLoading =
        isFetchingDifferentialExpressions ||
        isFetchingDifferentialExpressionsData ||
        isFetchingTimeSeries ||
        isAddingToBasket ||
        isFetchingSamplesExpressions ||
        isFetchingGOEnrichmentJson;

    const desktopSection = (
        <DesktopSectionContainer>
            <TitleContainer>
                <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
                    <DictyLogo src={dictyLogo} alt="dictyExpress logo" />
                </Link>
                <GenexpressTitle>{import.meta.env.VITE_APP_NAME}</GenexpressTitle>
                <Version />
            </TitleContainer>
            <ActionsContainer>
                <IconButtonWithTooltip
                    title="Bookmark"
                    onClick={() => {
                        void handleBookmarkClick();
                    }}
                    disabled={isFetchingTimeSeries}
                    ref={bookmarkButtonElement}
                    data-tutorial="bookmark-button"
                >
                    <BookmarkIcon />
                </IconButtonWithTooltip>
                <IconButtonWithTooltip
                    title={
                        areExportingModulesLoading
                            ? 'Export will be available when all modules are loaded.'
                            : isExporting
                              ? 'Exporting'
                              : 'Export'
                    }
                    disabled={areExportingModulesLoading || isExporting}
                    onClick={(): void => {
                        setExportPrefixModalOpened(true);
                    }}
                    data-tutorial="export-button"
                >
                    {isExporting ? <CircularProgress size={20} /> : <DownloadIcon />}
                </IconButtonWithTooltip>
                <Button
                    onClick={() => {
                        connectedLayoutsReset();
                    }}
                    data-tutorial="default-layout-button"
                >
                    Default layout
                </Button>
                <Button
                    onClick={startTutorial}
                    className={showTutorialHint && !isRunning ? 'tutorial-button-hint' : undefined}
                >
                    Tutorial
                </Button>
                {isLoggedIn ? (
                    <Button onClick={(): void => setUserMenuOpened(true)} ref={userButtonElement}>
                        {user.first_name} {user.last_name}
                    </Button>
                ) : (
                    <Button
                        onClick={() => {
                            login(location.pathname);
                        }}
                    >
                        Login
                    </Button>
                )}
            </ActionsContainer>
            {isLoading && <LoadingBar />}
        </DesktopSectionContainer>
    );

    return (
        <>
            <GenexpressAppBarWrapper position="sticky">
                <DictyAppBar desktopSection={desktopSection} />
            </GenexpressAppBarWrapper>
            {userMenuOpened && (
                <Menu
                    anchorEl={userButtonElement.current}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    open
                    disableScrollLock
                    onClose={() => setUserMenuOpened(false)}
                >
                    <MenuItem
                        onClick={() => {
                            logout(location.pathname);
                        }}
                    >
                        Logout
                    </MenuItem>
                </Menu>
            )}
            {exportPrefixModalOpened && (
                <TextInputModal
                    title="Export"
                    placeholder="Optional prefix of exported files"
                    confirmButtonLabel="Export"
                    validationRegex={/^[A-Za-z0-9 .\-_()[\]]*$/}
                    onClose={(): void => setExportPrefixModalOpened(false)}
                    onConfirm={(value) => {
                        void handleExportPrefix(value);
                    }}
                />
            )}
            <Popover
                id="bookmarkPopover"
                open={bookmarkPopoverOpened}
                anchorEl={bookmarkButtonElement.current}
                onClose={(): void => {
                    setBookmarkPopoverOpened(false);
                }}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
            >
                <ModalHeader>Bookmark URL</ModalHeader>
                <BookmarkLinkContainer>
                    <BookmarkUrl href={bookmark} rel="noopener noreferrer" target="_blank">
                        {bookmark}
                    </BookmarkUrl>
                    <Button
                        type="button"
                        onClick={(): void => {
                            setClipboardText(bookmark);
                        }}
                    >
                        Copy
                    </Button>
                </BookmarkLinkContainer>
            </Popover>
        </>
    );
};

export default connector(GenexpressAppBar);
