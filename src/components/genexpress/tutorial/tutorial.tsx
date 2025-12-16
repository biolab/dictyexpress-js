import { ReactElement, useEffect, useState, useRef, useMemo, CSSProperties } from 'react';
import Joyride, { Styles, Step } from 'react-joyride';
import { useTheme, Theme } from '@mui/material';
import { useSelector } from 'react-redux';
import { useTutorial } from './tutorialContext';
import { tutorialSteps, getPlacement, LayoutMode, TUTORIAL_TARGETS } from './tutorialSteps';
import TutorialStateWatcher from './TutorialStateWatcher';
import TutorialHighlighter from './TutorialHighlighter';
import { TUTORIAL_STEP, getDropdownValue } from './tutorialUtils';
import { RootState } from 'redux/rootReducer';
import { breakpoints } from 'components/app/globalStyle';

const getLayoutMode = (w: number): LayoutMode =>
    w >= breakpoints.large ? 'large' : w >= breakpoints.mid ? 'mid' : 'small';

/** Base button styles shared across all tutorial buttons */
const getBaseButtonStyle = (theme: Theme): CSSProperties => ({
    border: 'none',
    borderRadius: 4,
    fontSize: '0.875rem',
    fontWeight: 500,
    textTransform: 'uppercase',
    cursor: 'pointer',
    letterSpacing: '0.02857em',
    lineHeight: 1.75,
    minWidth: '64px',
    fontFamily: theme.typography.fontFamily as string,
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxSizing: 'border-box',
});

const Tutorial = (): ReactElement => {
    const { isRunning, stepIndex, handleJoyrideCallback } = useTutorial();
    const theme = useTheme();
    const [layoutMode, setLayoutMode] = useState<LayoutMode>(() =>
        getLayoutMode(window.innerWidth),
    );
    const [shouldRender, setShouldRender] = useState(true);
    const [remountKey, setRemountKey] = useState(0);
    const layoutModeRef = useRef(layoutMode);
    const resizeTimeoutRef = useRef<number | null>(null);

    // Redux state for completion checks
    const selectedTimeSeriesId = useSelector((s: RootState) => s.timeSeries.selectedId);
    const timeSeriesById = useSelector((s: RootState) => s.timeSeries.byId);
    const selectedGenesIds = useSelector((s: RootState) => s.genes.selectedGenesIds);
    const genesById = useSelector((s: RootState) => s.genes.byId);

    const isTimeSeriesCompleted = useMemo(() => {
        if (!selectedTimeSeriesId) return false;
        const ts = timeSeriesById[selectedTimeSeriesId];
        const d = ts?.descriptor as { project?: string; details?: string } | undefined;
        return Boolean(
            d?.project?.includes('Filter Development') && d?.details === 'Filter development',
        );
    }, [selectedTimeSeriesId, timeSeriesById]);

    const isGeneSearchCompleted = useMemo(
        () => selectedGenesIds.some((id) => genesById[id]?.name?.toLowerCase() === 'ecma'),
        [selectedGenesIds, genesById],
    );

    // Track completion state on step entry
    const completionRef = useRef({
        timeSeries: false,
        geneSearch: false,
        colorTime: false,
        strainSelect: false,
        strainBackToAX4: false,
        spearmanSelect: false,
    });
    const prevStepRef = useRef(stepIndex);

    useEffect(() => {
        if (stepIndex !== prevStepRef.current) {
            completionRef.current = {
                timeSeries: isTimeSeriesCompleted,
                geneSearch: isGeneSearchCompleted,
                colorTime:
                    getDropdownValue(TUTORIAL_TARGETS.singleCellColorDropdown)?.toLowerCase() ===
                    'time',
                strainSelect:
                    (getDropdownValue(TUTORIAL_TARGETS.singleCellStrainDropdown) || '') === 'acaA-',
                strainBackToAX4:
                    (getDropdownValue(TUTORIAL_TARGETS.singleCellStrainDropdown) || '') === 'AX4',
                spearmanSelect:
                    getDropdownValue(
                        TUTORIAL_TARGETS.clusteringDistanceMeasureDropdown,
                    )?.toLowerCase() === 'spearman',
            };
            prevStepRef.current = stepIndex;
        }
    }, [stepIndex, isTimeSeriesCompleted, isGeneSearchCompleted]);

    const frozenSteps = useMemo(
        (): Step[] =>
            tutorialSteps.map((step) => ({
                ...step,
                placement: getPlacement(
                    step.target as string,
                    layoutMode,
                    (step.data as { placementKey?: string })?.placementKey,
                ),
            })),
        [layoutMode],
    );

    // For strain back to AX4 step, check current dropdown value directly (not from ref)
    // because the ref is populated after render, but useMemo runs during render
    const isStrainBackCompleted = useMemo(() => {
        if (stepIndex !== TUTORIAL_STEP.STRAIN_BACK_TO_AX4) return true;
        return (getDropdownValue(TUTORIAL_TARGETS.singleCellStrainDropdown) || '') === 'AX4';
    }, [stepIndex]);

    const shouldHideNextButton = useMemo(() => {
        const c = completionRef.current;
        const volcanoModalSteps: number[] = [
            TUTORIAL_STEP.VOLCANO_SELECT,
            TUTORIAL_STEP.VOLCANO_MODAL,
            TUTORIAL_STEP.SELECT_ALL,
        ];

        return (
            (stepIndex === TUTORIAL_STEP.TIME_SERIES && !c.timeSeries) ||
            (stepIndex === TUTORIAL_STEP.GENE_SEARCH && !c.geneSearch) ||
            (stepIndex === TUTORIAL_STEP.COLOR_TIME && !c.colorTime) ||
            (stepIndex === TUTORIAL_STEP.STRAIN_SELECT && !c.strainSelect) ||
            (stepIndex === TUTORIAL_STEP.STRAIN_BACK_TO_AX4 && !isStrainBackCompleted) ||
            (stepIndex === TUTORIAL_STEP.CLUSTERING && !c.spearmanSelect) ||
            volcanoModalSteps.includes(stepIndex)
        );
    }, [stepIndex, isStrainBackCompleted]);

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            setShouldRender(false);
            if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
            resizeTimeoutRef.current = window.setTimeout(() => {
                const newMode = getLayoutMode(window.innerWidth);
                if (newMode !== layoutModeRef.current) {
                    layoutModeRef.current = newMode;
                    setLayoutMode(newMode);
                }
                setRemountKey((k) => k + 1);
                setShouldRender(true);
            }, 300);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
        };
    }, []);

    const styles: Partial<Styles> = useMemo(() => {
        const baseButton = getBaseButtonStyle(theme);
        const transparentButtonStyle: CSSProperties = {
            ...baseButton,
            backgroundColor: 'transparent',
            padding: '6px 8px',
            color: theme.palette.primary.main,
        };

        return {
            options: {
                primaryColor: theme.palette.primary.main,
                overlayColor: 'rgba(0, 0, 0, 0.5)',
                width: 400,
                zIndex: 10000,
            },
            tooltip: { borderRadius: 0, padding: 0, boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)' },
            tooltipContainer: { textAlign: 'left' as const },
            tooltipTitle: {
                fontSize: '1.25rem',
                fontWeight: 'normal',
                padding: '15px',
                margin: 0,
                color: theme.palette.text.primary,
                textAlign: 'left' as const,
                borderBottom: '1px solid #e5e5e5',
                fontFamily: theme.typography.fontFamily,
            },
            tooltipContent: { fontSize: '1rem', lineHeight: 1.5, padding: '15px' },
            tooltipFooter: {
                padding: '15px',
                borderTop: '1px solid #e5e5e5',
                marginTop: 0,
                textAlign: 'right' as const,
            },
            buttonNext: {
                ...baseButton,
                backgroundColor: theme.palette.secondary.main,
                padding: '6px 16px',
                color: '#fff',
                display: shouldHideNextButton ? 'none' : 'inline-flex',
            },
            buttonBack: {
                ...transparentButtonStyle,
                marginRight: 8,
            },
            buttonSkip: transparentButtonStyle,
            spotlight: { borderRadius: 8 },
            beacon: { display: 'none' },
        };
    }, [theme, shouldHideNextButton]);

    if (!shouldRender)
        return (
            <>
                <TutorialStateWatcher />
                <TutorialHighlighter />
            </>
        );

    return (
        <>
            <TutorialStateWatcher />
            <TutorialHighlighter />
            <Joyride
                key={`${layoutMode}-${remountKey}`}
                steps={frozenSteps}
                run={isRunning}
                stepIndex={stepIndex}
                callback={handleJoyrideCallback}
                continuous
                showSkipButton
                showProgress={false}
                spotlightClicks
                spotlightPadding={10}
                disableOverlayClose
                disableScrollParentFix
                disableScrolling
                styles={styles}
                locale={{
                    back: 'Back',
                    close: 'Close',
                    last: 'Finish',
                    next: 'Next',
                    skip: 'Skip tutorial',
                }}
                floaterProps={{ disableFlip: true, disableAnimation: true, offset: 12 }}
            />
        </>
    );
};

export default Tutorial;
