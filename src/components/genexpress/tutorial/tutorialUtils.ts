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
    STRAIN_SELECT: 7,
    STRAIN_BACK_TO_AX4: 8,
    DIFFERENTIAL_INTRO: 9,
    VOLCANO_SELECT: 10,
    VOLCANO_MODAL: 11,
    SELECT_ALL: 12,
    CLUSTERING: 13,
    SELECT_CLUSTER: 14,
    CROSS_MODULE: 15,
    GO_ENRICHMENT: 16,
    CLOSING: 17,
} as const;

/**
 * Get the current text value from a MUI Select dropdown.
 */
export const getDropdownValue = (selector: string): string | null => {
    const el = document.querySelector(selector)?.querySelector('.MuiSelect-select');
    return el?.textContent || null;
};

/**
 * Configuration for dropdown-based tutorial steps.
 * Maps step index to the dropdown selector and value check function.
 */
export const DROPDOWN_STEP_CONFIG: Record<
    number,
    {
        selector: string;
        checkValue: (current: string | null, initial: string | null) => boolean;
    }
> = {
    [TUTORIAL_STEP.COLOR_TIME]: {
        selector: TUTORIAL_TARGETS.singleCellColorDropdown,
        checkValue: (current, initial) =>
            current?.toLowerCase() === 'time' && initial?.toLowerCase() !== 'time',
    },
    [TUTORIAL_STEP.STRAIN_SELECT]: {
        selector: TUTORIAL_TARGETS.singleCellStrainDropdown,
        checkValue: (current, initial) => current !== initial && current === 'acaA-',
    },
    [TUTORIAL_STEP.STRAIN_BACK_TO_AX4]: {
        selector: TUTORIAL_TARGETS.singleCellStrainDropdown,
        checkValue: (current, initial) => current !== initial && current === 'AX4',
    },
    [TUTORIAL_STEP.CLUSTERING]: {
        selector: TUTORIAL_TARGETS.clusteringDistanceMeasureDropdown,
        checkValue: (current, initial) =>
            current?.toLowerCase() === 'spearman' && initial?.toLowerCase() !== 'spearman',
    },
};

/**
 * Get the list of step indices that require dropdown interaction.
 */
export const DROPDOWN_STEPS = Object.keys(DROPDOWN_STEP_CONFIG).map(Number);
