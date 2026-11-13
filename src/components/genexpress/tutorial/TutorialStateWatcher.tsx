import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useTutorial } from './tutorialContext';
import { TUTORIAL_TARGETS } from './tutorialSteps';
import {
    TUTORIAL_STEP,
    VOLCANO_SELECT_STEPS,
    VOLCANO_MODAL_STEPS,
    SELECT_ALL_STEPS,
    isSelectToolChosen,
    hasCellSelection,
    getDropdownValue,
    DROPDOWN_STEP_CONFIG,
    DROPDOWN_STEPS,
    checkDropdownValue,
    isTutorialTimeSeries,
} from './tutorialUtils';
import { RootState } from 'redux/rootReducer';
import { CELL_SELECTION_DIFFERENTIAL_EXPRESSION_ID } from 'redux/stores/differentialExpressions';

const ADVANCE_DELAY = 300;

const TutorialStateWatcher = (): null => {
    const { isRunning, stepIndex, advanceFromStep } = useTutorial();
    const selectedTimeSeriesId = useSelector((s: RootState) => s.timeSeries.selectedId);
    const timeSeriesById = useSelector((s: RootState) => s.timeSeries.byId);
    const selectedGenesIds = useSelector((s: RootState) => s.genes.selectedGenesIds);
    const genesById = useSelector((s: RootState) => s.genes.byId);
    const markersResult = useSelector(
        (s: RootState) => s.differentialExpressions.byId[CELL_SELECTION_DIFFERENTIAL_EXPRESSION_ID],
    );
    const selectedDifferentialExpressionId = useSelector(
        (s: RootState) => s.differentialExpressions.selectedId,
    );

    const prevTimeSeriesId = useRef<number | null>(null);
    const prevGenesCount = useRef(0);
    const prevStepIndex = useRef(stepIndex);
    const appendWasCheckedOnEntry = useRef(true);
    const prevMarkersResult = useRef(markersResult);

    // Step 1: Watch time series selection
    useEffect(() => {
        if (!isRunning || stepIndex !== TUTORIAL_STEP.TIME_SERIES) {
            prevTimeSeriesId.current = selectedTimeSeriesId;
            return;
        }
        if (selectedTimeSeriesId !== null && selectedTimeSeriesId !== prevTimeSeriesId.current) {
            const ts = timeSeriesById[selectedTimeSeriesId];
            if (isTutorialTimeSeries(ts)) {
                setTimeout(() => advanceFromStep(TUTORIAL_STEP.TIME_SERIES), ADVANCE_DELAY);
            }
        }
        prevTimeSeriesId.current = selectedTimeSeriesId;
    }, [isRunning, stepIndex, selectedTimeSeriesId, timeSeriesById, advanceFromStep]);

    // Step 2: Watch gene selection
    useEffect(() => {
        if (!isRunning || stepIndex !== TUTORIAL_STEP.GENE_SEARCH) {
            prevGenesCount.current = selectedGenesIds.length;
            return;
        }
        if (selectedGenesIds.length > prevGenesCount.current) {
            if (selectedGenesIds.some((id) => genesById[id]?.name?.toLowerCase() === 'ecma')) {
                setTimeout(() => advanceFromStep(TUTORIAL_STEP.GENE_SEARCH), ADVANCE_DELAY);
            }
        }
        prevGenesCount.current = selectedGenesIds.length;
    }, [isRunning, stepIndex, selectedGenesIds, genesById, advanceFromStep]);

    // Watch dropdown changes (steps 5, 7, 8, 13)
    useEffect(() => {
        if (!isRunning || !DROPDOWN_STEPS.includes(stepIndex)) return;

        const config = DROPDOWN_STEP_CONFIG[stepIndex];
        const initial = getDropdownValue(config.selector);
        const dropdown = document.querySelector(config.selector);
        if (!dropdown) return;

        const check = () => {
            const current = getDropdownValue(config.selector);
            if (checkDropdownValue(config, current, initial)) {
                setTimeout(() => advanceFromStep(stepIndex), ADVANCE_DELAY);
            }
        };

        const observer = new MutationObserver(check);
        observer.observe(dropdown, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
        });
        const handleClick = () => setTimeout(check, 100);
        document.addEventListener('click', handleClick);

        return () => {
            observer.disconnect();
            document.removeEventListener('click', handleClick);
        };
    }, [isRunning, stepIndex, advanceFromStep]);

    // Watch for volcano selection modal appearing
    useEffect(() => {
        if (!isRunning || !VOLCANO_SELECT_STEPS.includes(stepIndex)) return;

        const observer = new MutationObserver(() => {
            const modalTitle = document.getElementById('modalTitle');
            if (modalTitle?.textContent?.includes('Selected Differential Expression Genes')) {
                setTimeout(() => advanceFromStep(stepIndex), ADVANCE_DELAY);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        return () => observer.disconnect();
    }, [isRunning, stepIndex, advanceFromStep]);

    // Close modal when going back to volcano select from modal steps
    useEffect(() => {
        const modalSteps: Record<number, number[]> = {
            [TUTORIAL_STEP.VOLCANO_SELECT]: [
                TUTORIAL_STEP.VOLCANO_MODAL,
                TUTORIAL_STEP.SELECT_ALL,
                TUTORIAL_STEP.CLUSTERING,
            ],
            [TUTORIAL_STEP.MARKERS_SELECT]: [
                TUTORIAL_STEP.MARKERS_MODAL,
                TUTORIAL_STEP.MARKERS_SELECT_ALL,
                TUTORIAL_STEP.MARKERS_EXPRESSION,
            ],
        };
        if (modalSteps[stepIndex]?.includes(prevStepIndex.current)) {
            document
                .querySelectorAll(`${TUTORIAL_TARGETS.volcanoSelectionModal} button`)
                .forEach((btn) => {
                    if (btn.textContent?.trim() === 'Close') (btn as HTMLButtonElement).click();
                });
        }
        prevStepIndex.current = stepIndex;
    }, [stepIndex]);

    // Watch for "Append" checkbox being unchecked
    useEffect(() => {
        if (!isRunning || !VOLCANO_MODAL_STEPS.includes(stepIndex)) return;
        if (!document.getElementById('modalTitle')) return;

        const checkbox = document.querySelector<HTMLInputElement>(
            `${TUTORIAL_TARGETS.volcanoSelectionModal} input[name="append"]`,
        );
        appendWasCheckedOnEntry.current = checkbox?.checked ?? true;

        if (!appendWasCheckedOnEntry.current) return; // Already unchecked (going back)

        const interval = setInterval(() => {
            const cb = document.querySelector<HTMLInputElement>(
                `${TUTORIAL_TARGETS.volcanoSelectionModal} input[name="append"]`,
            );
            if (cb && !cb.checked) {
                clearInterval(interval);
                setTimeout(() => advanceFromStep(stepIndex), ADVANCE_DELAY);
            }
        }, 200);

        return () => clearInterval(interval);
    }, [isRunning, stepIndex, advanceFromStep]);

    // Watch for "Select all" button click
    useEffect(() => {
        if (!isRunning || !SELECT_ALL_STEPS.includes(stepIndex)) return;

        const handleClick = (e: MouseEvent) => {
            const button = (e.target as HTMLElement).closest('button');
            if (button?.textContent?.trim().startsWith('Select all')) {
                setTimeout(() => advanceFromStep(stepIndex), ADVANCE_DELAY);
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [isRunning, stepIndex, advanceFromStep]);

    // Watch for the lasso tool being chosen and for cells being selected. A step that is
    // already done on entry (after going back) keeps its Next button instead.
    useEffect(() => {
        const isDone =
            stepIndex === TUTORIAL_STEP.CELLS_SELECT_TOOL
                ? isSelectToolChosen
                : stepIndex === TUTORIAL_STEP.CELLS_DRAW
                  ? hasCellSelection
                  : null;
        if (!isRunning || isDone == null || isDone()) return;

        const interval = setInterval(() => {
            if (isDone()) {
                clearInterval(interval);
                setTimeout(() => advanceFromStep(stepIndex), ADVANCE_DELAY);
            }
        }, 200);

        return () => clearInterval(interval);
    }, [isRunning, stepIndex, advanceFromStep]);

    // Watch for a new marker ranking of the selected cells being shown.
    useEffect(() => {
        if (
            isRunning &&
            stepIndex === TUTORIAL_STEP.CELLS_FIND_MARKERS &&
            markersResult != null &&
            markersResult !== prevMarkersResult.current &&
            selectedDifferentialExpressionId === CELL_SELECTION_DIFFERENTIAL_EXPRESSION_ID
        ) {
            setTimeout(() => advanceFromStep(TUTORIAL_STEP.CELLS_FIND_MARKERS), ADVANCE_DELAY);
        }
        if (
            stepIndex !== TUTORIAL_STEP.CELLS_FIND_MARKERS ||
            selectedDifferentialExpressionId === CELL_SELECTION_DIFFERENTIAL_EXPRESSION_ID
        ) {
            prevMarkersResult.current = markersResult;
        }
    }, [isRunning, stepIndex, markersResult, selectedDifferentialExpressionId, advanceFromStep]);

    return null;
};

export default TutorialStateWatcher;
