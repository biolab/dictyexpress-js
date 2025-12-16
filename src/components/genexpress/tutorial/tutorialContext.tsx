import {
    createContext,
    useContext,
    useState,
    ReactNode,
    useCallback,
    useEffect,
    useRef,
} from 'react';
import { useSelector } from 'react-redux';
import { ACTIONS, CallBackProps, EVENTS, STATUS } from 'react-joyride';
import TutorialConfirmDialog from './TutorialConfirmDialog';
import { TUTORIAL_STEP } from './tutorialUtils';
import { RootState } from 'redux/rootReducer';

// Flag to track if hint should show (set true after first time series loads, false on user interaction)
let showHintFlag = false;
const hasBookmark = new URLSearchParams(window.location.search).has('_s');

// Interactive steps that require user action
export const INTERACTIVE_STEPS = new Set<number>([
    TUTORIAL_STEP.TIME_SERIES,
    TUTORIAL_STEP.GENE_SEARCH,
    TUTORIAL_STEP.COLOR_TIME,
    TUTORIAL_STEP.STRAIN_SELECT,
    TUTORIAL_STEP.STRAIN_BACK_TO_AX4,
    TUTORIAL_STEP.VOLCANO_SELECT,
    TUTORIAL_STEP.VOLCANO_MODAL,
    TUTORIAL_STEP.SELECT_ALL,
    TUTORIAL_STEP.CLUSTERING,
]);

interface TutorialContextType {
    isRunning: boolean;
    stepIndex: number;
    showTutorialHint: boolean;
    startTutorial: () => void;
    advanceFromStep: (fromStep: number) => void;
    handleJoyrideCallback: (data: CallBackProps) => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export const TutorialProvider = ({ children }: { children: ReactNode }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showTutorialHint, setShowTutorialHint] = useState(showHintFlag);

    const selectedTimeSeriesId = useSelector((s: RootState) => s.timeSeries.selectedId);
    const selectedGenesCount = useSelector((s: RootState) => s.genes.selectedGenesIds.length);
    const prevTimeSeriesId = useRef<number | null>(null);

    const hideHint = useCallback(() => {
        showHintFlag = false;
        setShowTutorialHint(false);
    }, []);

    useEffect(() => {
        const isFirstLoad = prevTimeSeriesId.current === null && selectedTimeSeriesId !== null;
        const hasChanged = prevTimeSeriesId.current !== null;
        prevTimeSeriesId.current = selectedTimeSeriesId;

        if (isFirstLoad && !hasBookmark) {
            showHintFlag = true;
            setShowTutorialHint(true);
        } else if (hasChanged || selectedGenesCount > 0) {
            hideHint();
        }
    }, [selectedTimeSeriesId, selectedGenesCount, hideHint]);

    const startTutorial = useCallback(() => {
        hideHint();
        setShowConfirmDialog(true);
    }, [hideHint]);

    const handleConfirmTutorial = useCallback(() => {
        setShowConfirmDialog(false);
        sessionStorage.setItem('startTutorial', 'true');
        window.location.reload();
    }, []);

    const advanceFromStep = useCallback((fromStep: number) => {
        setStepIndex((prev) => (prev === fromStep ? prev + 1 : prev));
    }, []);

    const handleJoyrideCallback = useCallback((data: CallBackProps) => {
        const { action, index, status, type } = data;

        // Handle close (X button), skip, or finish
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED || action === ACTIONS.CLOSE) {
            setIsRunning(false);
            setStepIndex(0);
            return;
        }

        if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
            if (
                INTERACTIVE_STEPS.has(index) &&
                action !== ACTIONS.NEXT &&
                action !== ACTIONS.PREV
            ) {
                return; // Let TutorialStateWatcher handle advancement
            }
            // Going back from Clustering should skip modal steps and go to Volcano selection
            if (action === ACTIONS.PREV && index === TUTORIAL_STEP.CLUSTERING) {
                setStepIndex(TUTORIAL_STEP.VOLCANO_SELECT);
            } else {
                setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
            }
        }
    }, []);

    useEffect(() => {
        if (sessionStorage.getItem('startTutorial') === 'true') {
            sessionStorage.removeItem('startTutorial');
            setIsRunning(true);
        }
    }, []);

    return (
        <TutorialContext.Provider
            value={{
                isRunning,
                stepIndex,
                showTutorialHint,
                startTutorial,
                advanceFromStep,
                handleJoyrideCallback,
            }}
        >
            {children}
            <TutorialConfirmDialog
                open={showConfirmDialog}
                onConfirm={handleConfirmTutorial}
                onCancel={() => setShowConfirmDialog(false)}
            />
        </TutorialContext.Provider>
    );
};

export const useTutorial = () => {
    const context = useContext(TutorialContext);
    if (!context) throw new Error('useTutorial must be used within TutorialProvider');
    return context;
};
