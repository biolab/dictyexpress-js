import { TUTORIAL_TARGETS } from './tutorialSteps';

/**
 * Step indices for the tutorial.
 * Using named constants instead of magic numbers for better maintainability.
 */
export const TUTORIAL_STEP = {
    WELCOME: 0,
    TIME_SERIES: 1,
    GENE_SEARCH: 2,
    EXPRESSION_MODULE: 3,
    SINGLE_CELL_INTRO: 4,
    COLOR_TIME: 5,
    TIMING_OBSERVATION: 6,
    COLOR_CELL_TYPE: 7,
    STRAIN_SELECT: 8,
    STRAIN_BACK_TO_AX4: 9,
    DIFFERENTIAL_INTRO: 10,
    VOLCANO_SELECT: 11,
    VOLCANO_MODAL: 12,
    SELECT_ALL: 13,
    CLUSTERING: 14,
    SELECT_CLUSTER: 15,
    CROSS_MODULE: 16,
    GO_ENRICHMENT: 17,
    CLOSING: 18,
} as const;

/**
 * Get the current text value from a MUI Select dropdown.
 */
export const getDropdownValue = (selector: string): string | null => {
    const el = document.querySelector(selector)?.querySelector('.MuiSelect-select');
    return el?.textContent || null;
};

/**
 * Unified configuration for dropdown-based tutorial steps.
 * Used for both state watching (advancement) and visual highlighting.
 */
export interface DropdownStepConfig {
    /** CSS selector for the dropdown element */
    selector: string;
    /** Expected value text to highlight in menu */
    expectedValue: string;
    /** Whether to use case-sensitive matching */
    caseSensitive?: boolean;
}

export const DROPDOWN_STEP_CONFIG: Record<number, DropdownStepConfig> = {
    [TUTORIAL_STEP.COLOR_TIME]: {
        selector: TUTORIAL_TARGETS.singleCellColorDropdown,
        expectedValue: 'time',
    },
    [TUTORIAL_STEP.COLOR_CELL_TYPE]: {
        selector: TUTORIAL_TARGETS.singleCellColorDropdown,
        expectedValue: 'Cell type',
    },
    [TUTORIAL_STEP.STRAIN_SELECT]: {
        selector: TUTORIAL_TARGETS.singleCellStrainDropdown,
        expectedValue: 'acaA-',
        caseSensitive: true,
    },
    [TUTORIAL_STEP.STRAIN_BACK_TO_AX4]: {
        selector: TUTORIAL_TARGETS.singleCellStrainDropdown,
        expectedValue: 'AX4',
        caseSensitive: true,
    },
    [TUTORIAL_STEP.CLUSTERING]: {
        selector: TUTORIAL_TARGETS.clusteringDistanceMeasureDropdown,
        expectedValue: 'spearman',
    },
};

/**
 * Check if dropdown value matches expected value for a step.
 */
export const checkDropdownValue = (
    config: DropdownStepConfig,
    current: string | null,
    initial: string | null,
): boolean => {
    const normalize = (val: string | null) =>
        config.caseSensitive ? val : (val?.toLowerCase() ?? null);
    const expected = normalize(config.expectedValue);
    return normalize(current) === expected && normalize(initial) !== expected;
};

/**
 * Get the list of step indices that require dropdown interaction.
 */
export const DROPDOWN_STEPS = Object.keys(DROPDOWN_STEP_CONFIG).map(Number);
