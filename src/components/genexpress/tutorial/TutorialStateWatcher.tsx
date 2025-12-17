import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useTutorial } from './tutorialContext';
import { TUTORIAL_TARGETS } from './tutorialSteps';
import {
    TUTORIAL_STEP,
    getDropdownValue,
    DROPDOWN_STEP_CONFIG,
    DROPDOWN_STEPS,
    checkDropdownValue,
} from './tutorialUtils';
import { RootState } from 'redux/rootReducer';

const ADVANCE_DELAY = 300;

const TutorialStateWatcher = (): null => {
    const { isRunning, stepIndex, advanceFromStep } = useTutorial();
    const selectedTimeSeriesId = useSelector((s: RootState) => s.timeSeries.selectedId);
    const timeSeriesById = useSelector((s: RootState) => s.timeSeries.byId);
    const selectedGenesIds = useSelector((s: RootState) => s.genes.selectedGenesIds);
    const genesById = useSelector((s: RootState) => s.genes.byId);

    const prevTimeSeriesId = useRef<number | null>(null);
    const prevGenesCount = useRef(0);
    const prevStepIndex = useRef(stepIndex);
    const appendWasCheckedOnEntry = useRef(true);

    // Step 1: Watch time series selection
    useEffect(() => {
        if (!isRunning || stepIndex !== TUTORIAL_STEP.TIME_SERIES) {
            prevTimeSeriesId.current = selectedTimeSeriesId;
            return;
        }
        if (selectedTimeSeriesId !== null && selectedTimeSeriesId !== prevTimeSeriesId.current) {
            const ts = timeSeriesById[selectedTimeSeriesId];
            const d = ts?.descriptor as { project?: string; details?: string } | undefined;
            if (d?.project?.includes('Filter Development') && d?.details === 'Filter development') {
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
        if (!isRunning || stepIndex !== TUTORIAL_STEP.VOLCANO_SELECT) return;

        const observer = new MutationObserver(() => {
            const modalTitle = document.getElementById('modalTitle');
            if (modalTitle?.textContent?.includes('Selected Differential Expression Genes')) {
                setTimeout(() => advanceFromStep(TUTORIAL_STEP.VOLCANO_SELECT), ADVANCE_DELAY);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        return () => observer.disconnect();
    }, [isRunning, stepIndex, advanceFromStep]);

    // Close modal when going back to volcano select from modal steps
    useEffect(() => {
        const modalSteps: number[] = [
            TUTORIAL_STEP.VOLCANO_MODAL,
            TUTORIAL_STEP.SELECT_ALL,
            TUTORIAL_STEP.CLUSTERING,
        ];
        if (
            modalSteps.includes(prevStepIndex.current) &&
            stepIndex === TUTORIAL_STEP.VOLCANO_SELECT
        ) {
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
        if (!isRunning || stepIndex !== TUTORIAL_STEP.VOLCANO_MODAL) return;
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
                setTimeout(() => advanceFromStep(TUTORIAL_STEP.VOLCANO_MODAL), ADVANCE_DELAY);
            }
        }, 200);

        return () => clearInterval(interval);
    }, [isRunning, stepIndex, advanceFromStep]);

    // Watch for "Select all" button click
    useEffect(() => {
        if (!isRunning || stepIndex !== TUTORIAL_STEP.SELECT_ALL) return;

        const handleClick = (e: MouseEvent) => {
            const button = (e.target as HTMLElement).closest('button');
            if (button?.textContent?.trim().startsWith('Select all')) {
                setTimeout(() => advanceFromStep(TUTORIAL_STEP.SELECT_ALL), ADVANCE_DELAY);
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [isRunning, stepIndex, advanceFromStep]);

    return null;
};

export default TutorialStateWatcher;
