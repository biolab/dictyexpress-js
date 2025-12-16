import { useEffect, useRef, useState } from 'react';
import { useTutorial } from './tutorialContext';
import { TUTORIAL_TARGETS } from './tutorialSteps';
import { TUTORIAL_STEP, DROPDOWN_STEP_CONFIG, DropdownStepConfig } from './tutorialUtils';
import { DragOverlay, Cursor, SelectionBox, CustomOverlay } from './TutorialHighlighter.styles';

const HIGHLIGHT_CLASS = 'tutorial-highlight-row';
const MENU_HIGHLIGHT_CLASS = 'tutorial-highlight-menu-item';

const TutorialHighlighter = (): JSX.Element | null => {
    const { isRunning, stepIndex } = useTutorial();
    const intervalRef = useRef<number | null>(null);
    const highlightedRef = useRef<Element[]>([]);
    const [showDragAnimation, setShowDragAnimation] = useState(false);
    const [overlayRect, setOverlayRect] = useState<DOMRect | null>(null);

    const cleanup = () => {
        highlightedRef.current.forEach((el) => {
            el.classList.remove(HIGHLIGHT_CLASS, MENU_HIGHLIGHT_CLASS);
        });
        highlightedRef.current = [];
    };

    const resetDragOverlay = () => {
        setShowDragAnimation(false);
        setOverlayRect(null);
    };

    const addHighlight = (el: Element, cls = HIGHLIGHT_CLASS) => {
        if (!el.classList.contains(cls)) {
            el.classList.add(cls);
            highlightedRef.current.push(el);
        }
    };

    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (!isRunning) {
            cleanup();
            return;
        }

        /** Highlight dropdown and corresponding menu item */
        const highlightDropdown = (config: DropdownStepConfig) => {
            const dropdown = document.querySelector(config.selector);
            if (dropdown) addHighlight(dropdown);
            document.querySelectorAll('.MuiMenuItem-root').forEach((item) => {
                const itemText = item.textContent?.trim() || '';
                const matches = config.caseSensitive
                    ? itemText === config.expectedValue
                    : itemText.toLowerCase() === config.expectedValue.toLowerCase();
                if (matches) addHighlight(item, MENU_HIGHLIGHT_CLASS);
            });
        };

        const findAndHighlight = () => {
            // Remove stale highlights
            highlightedRef.current = highlightedRef.current.filter((el) => {
                if (!document.body.contains(el)) {
                    el.classList.remove(HIGHLIGHT_CLASS, MENU_HIGHLIGHT_CLASS);
                    return false;
                }
                return true;
            });

            // Check if this step has dropdown highlighting config
            const dropdownConfig = DROPDOWN_STEP_CONFIG[stepIndex];
            if (dropdownConfig) {
                highlightDropdown(dropdownConfig);
                return;
            }

            // Handle special cases
            switch (stepIndex) {
                case TUTORIAL_STEP.TIME_SERIES:
                    document
                        .querySelector(TUTORIAL_TARGETS.timeSeriesModule)
                        ?.querySelectorAll('.ag-row')
                        .forEach((row) => {
                            const text = row.textContent || '';
                            if (text.includes('Filter development') && text.includes('Rosengarten'))
                                addHighlight(row);
                        });
                    break;

                case TUTORIAL_STEP.GENE_SEARCH: {
                    const input = document.querySelector(TUTORIAL_TARGETS.geneSearchInput);
                    if (input) addHighlight(input);
                    break;
                }

                case TUTORIAL_STEP.VOLCANO_SELECT: {
                    const differentialModule = document.querySelector(
                        TUTORIAL_TARGETS.differentialModule,
                    );
                    if (differentialModule) {
                        setOverlayRect(differentialModule.getBoundingClientRect());
                        setShowDragAnimation(true);
                    }
                    break;
                }

                case TUTORIAL_STEP.VOLCANO_MODAL: {
                    resetDragOverlay();
                    const appendCheckbox = document.querySelector(
                        `${TUTORIAL_TARGETS.volcanoSelectionModal} input[name="append"]`,
                    );
                    if (appendCheckbox?.parentElement) {
                        addHighlight(appendCheckbox.parentElement);
                    }
                    break;
                }

                case TUTORIAL_STEP.SELECT_ALL:
                    resetDragOverlay();
                    document
                        .querySelectorAll(`${TUTORIAL_TARGETS.volcanoSelectionModal} button`)
                        .forEach((btn) => {
                            if (btn.textContent?.trim().startsWith('Select all')) {
                                addHighlight(btn);
                            }
                        });
                    break;

                default:
                    cleanup();
                    resetDragOverlay();
            }
        };

        findAndHighlight();
        intervalRef.current = window.setInterval(findAndHighlight, 200);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            cleanup();
            resetDragOverlay();
        };
    }, [isRunning, stepIndex]);

    if (!isRunning) return null;

    // Show drag animation overlay for volcano select step
    if (showDragAnimation && stepIndex === TUTORIAL_STEP.VOLCANO_SELECT && overlayRect) {
        return (
            <DragOverlay
                style={{
                    left: `${overlayRect.left}px`,
                    top: `${overlayRect.top}px`,
                    width: `${overlayRect.width}px`,
                    height: `${overlayRect.height}px`,
                }}
            >
                <SelectionBox />
                <Cursor />
            </DragOverlay>
        );
    }

    // Show custom overlay for cross-module analysis step
    if (stepIndex === TUTORIAL_STEP.CROSS_MODULE) {
        return <CustomOverlay />;
    }

    return null;
};

export default TutorialHighlighter;
