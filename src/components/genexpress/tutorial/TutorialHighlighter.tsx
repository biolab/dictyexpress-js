import { useEffect, useRef, useState } from 'react';
import { useTutorial } from './tutorialContext';
import { TUTORIAL_TARGETS } from './tutorialSteps';
import {
    TUTORIAL_STEP,
    VOLCANO_SELECT_STEPS,
    DROPDOWN_STEP_CONFIG,
    DropdownStepConfig,
    hasCellSelection,
} from './tutorialUtils';
import { DragOverlay, Cursor, SelectionBox, CustomOverlay } from './TutorialHighlighter.styles';
import { GEN_GREY, GEN_ORANGE } from 'components/genexpress/common/theming/theming';

const HIGHLIGHT_CLASS = 'tutorial-highlight-row';
const MENU_HIGHLIGHT_CLASS = 'tutorial-highlight-menu-item';

// Outline around the dense cluster of AX4 prestalk cells, in UMAP coordinates.
const PRESTALK_OUTLINE = [
    [1.34, 3.11],
    [2.19, 2.66],
    [2.42, 1.45],
    [2.07, 0.18],
    [1.26, -0.14],
    [0.37, 0.27],
    [-0.17, 1.13],
    [-0.06, 2.09],
    [0.48, 2.82],
];
const LASSO_DURATION = '3.5s';
const LASSO_KEY_TIMES = '0;0.15;0.8;1';

/** A smooth closed SVG path through the points (Catmull-Rom spline). */
const getClosedPath = (points: number[][]): string => {
    const at = (i: number) => points[(i + points.length) % points.length];
    const round = (value: number) => Math.round(value * 10) / 10;
    const segments = points.map((point, i) => {
        const [previous, next, afterNext] = [at(i - 1), at(i + 1), at(i + 2)];
        return `C ${[
            point[0] + (next[0] - previous[0]) / 6,
            point[1] + (next[1] - previous[1]) / 6,
            next[0] - (afterNext[0] - point[0]) / 6,
            next[1] - (afterNext[1] - point[1]) / 6,
            next[0],
            next[1],
        ]
            .map(round)
            .join(' ')}`;
    });
    return `M ${round(points[0][0])} ${round(points[0][1])} ${segments.join(' ')} Z`;
};

/**
 * Where to draw the lasso demonstration: the plot's position on the page and the outline
 * around the prestalk cells as they are currently drawn, so it follows panning and zooming.
 */
const getLassoDemo = (): { rect: DOMRect; path: string } | null => {
    const canvas = document.querySelector<HTMLCanvasElement>(
        `${TUTORIAL_TARGETS.singleCellModule} canvas`,
    );
    const view = canvas?.dataset.viewTransform?.split(',').map(Number);
    if (!canvas || view?.length !== 4 || view.some(Number.isNaN)) return null;
    const [scaleX, offsetX, scaleY, offsetY] = view;
    return {
        rect: canvas.getBoundingClientRect(),
        path: getClosedPath(
            PRESTALK_OUTLINE.map(([x, y]) => [scaleX * x + offsetX, scaleY * y + offsetY]),
        ),
    };
};

const TutorialHighlighter = (): JSX.Element | null => {
    const { isRunning, stepIndex } = useTutorial();
    const intervalRef = useRef<number | null>(null);
    const highlightedRef = useRef<Element[]>([]);
    const [showDragAnimation, setShowDragAnimation] = useState(false);
    const [overlayRect, setOverlayRect] = useState<DOMRect | null>(null);
    const [lassoDemo, setLassoDemo] = useState<{ rect: DOMRect; path: string } | null>(null);

    const cleanup = () => {
        highlightedRef.current.forEach((el) => {
            el.classList.remove(HIGHLIGHT_CLASS, MENU_HIGHLIGHT_CLASS);
        });
        highlightedRef.current = [];
    };

    const resetDragOverlay = () => {
        setShowDragAnimation(false);
        setOverlayRect(null);
        setLassoDemo(null);
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
                            if (
                                text.includes('D. discoideum vs. D. purpureum') &&
                                text.includes('AX4') &&
                                text.includes('Parikh')
                            )
                                addHighlight(row);
                        });
                    break;

                case TUTORIAL_STEP.GENE_SEARCH: {
                    const input = document.querySelector(TUTORIAL_TARGETS.geneSearchInput);
                    if (input) addHighlight(input);
                    break;
                }

                case TUTORIAL_STEP.CELLS_SELECT_TOOL:
                    resetDragOverlay();
                    [
                        TUTORIAL_TARGETS.singleCellSelectTool,
                        TUTORIAL_TARGETS.singleCellExpressionToggle,
                    ].forEach((selector) => {
                        const el = document.querySelector(selector);
                        if (el) addHighlight(el);
                    });
                    break;

                case TUTORIAL_STEP.CELLS_DRAW: {
                    // Show where to draw until some cells are selected.
                    const demo = hasCellSelection() ? null : getLassoDemo();
                    setLassoDemo((previous) =>
                        previous?.path === demo?.path &&
                        previous?.rect.left === demo?.rect.left &&
                        previous?.rect.top === demo?.rect.top
                            ? previous
                            : demo,
                    );
                    break;
                }

                case TUTORIAL_STEP.CELLS_FIND_MARKERS:
                    resetDragOverlay();
                    document
                        .querySelectorAll(`${TUTORIAL_TARGETS.singleCellSelectionPanel} button`)
                        .forEach((btn) => {
                            if (btn.textContent?.trim() === 'Same time points') addHighlight(btn);
                        });
                    break;

                case TUTORIAL_STEP.VOLCANO_SELECT:
                case TUTORIAL_STEP.MARKERS_SELECT: {
                    const differentialModule = document.querySelector(
                        TUTORIAL_TARGETS.differentialModule,
                    );
                    if (differentialModule) {
                        setOverlayRect(differentialModule.getBoundingClientRect());
                        setShowDragAnimation(true);
                    }
                    break;
                }

                case TUTORIAL_STEP.VOLCANO_MODAL:
                case TUTORIAL_STEP.MARKERS_MODAL: {
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
                case TUTORIAL_STEP.MARKERS_SELECT_ALL:
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
    if (showDragAnimation && VOLCANO_SELECT_STEPS.includes(stepIndex) && overlayRect) {
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

    // Show the lasso being drawn around the prestalk cells for the cell selection step
    if (stepIndex === TUTORIAL_STEP.CELLS_DRAW && lassoDemo) {
        const { rect, path } = lassoDemo;
        return (
            <DragOverlay style={{ left: `${rect.left}px`, top: `${rect.top}px` }}>
                <svg width={rect.width} height={rect.height} style={{ overflow: 'visible' }}>
                    <path d={path} fill={GEN_ORANGE['500']} fillOpacity={0}>
                        <animate
                            attributeName="fill-opacity"
                            values="0;0;0.2;0"
                            keyTimes={LASSO_KEY_TIMES}
                            dur={LASSO_DURATION}
                            repeatCount="indefinite"
                        />
                    </path>
                    {[
                        { stroke: '#fff', strokeWidth: 5 },
                        { stroke: GEN_GREY['700'], strokeWidth: 2 },
                    ].map(({ stroke, strokeWidth }) => (
                        <path
                            key={stroke}
                            d={path}
                            pathLength={1}
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={1}
                            strokeDashoffset={1}
                            stroke={stroke}
                            strokeWidth={strokeWidth}
                        >
                            <animate
                                attributeName="stroke-dashoffset"
                                values="1;1;0;0"
                                keyTimes={LASSO_KEY_TIMES}
                                dur={LASSO_DURATION}
                                repeatCount="indefinite"
                            />
                            <animate
                                attributeName="opacity"
                                values="1;1;1;0"
                                keyTimes={LASSO_KEY_TIMES}
                                dur={LASSO_DURATION}
                                repeatCount="indefinite"
                            />
                        </path>
                    ))}
                    <g filter="drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4))">
                        <path
                            d="M0 0v17.6l4.86-4.86h7.28L0 0z"
                            fill="#fff"
                            stroke="#000"
                            strokeWidth={1.5}
                        />
                        <animateMotion
                            path={path}
                            keyPoints="0;0;1;1"
                            keyTimes={LASSO_KEY_TIMES}
                            calcMode="linear"
                            dur={LASSO_DURATION}
                            repeatCount="indefinite"
                        />
                        <animate
                            attributeName="opacity"
                            values="1;1;1;0"
                            keyTimes={LASSO_KEY_TIMES}
                            dur={LASSO_DURATION}
                            repeatCount="indefinite"
                        />
                    </g>
                </svg>
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
