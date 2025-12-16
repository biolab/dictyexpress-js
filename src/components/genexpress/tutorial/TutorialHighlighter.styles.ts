import { styled, keyframes } from '@mui/material';

// Cursor movement animation - uses left/top so percentages are relative to container
const cursorMove = keyframes`
    0%, 5% {
        left: 59%;
        top: 36%;
        transform: scale(1);
        opacity: 0;
    }
    15% {
        left: 59%;
        top: 36%;
        transform: scale(1);
        opacity: 1;
    }
    20% {
        left: 59%;
        top: 36%;
        transform: scale(0.9);
    }
    75% {
        left: calc(59% + 34%);
        top: calc(36% + 33%);
        transform: scale(0.9);
        opacity: 1;
    }
    80% {
        left: calc(59% + 34%);
        top: calc(36% + 33%);
        transform: scale(1);
    }
    90%, 100% {
        left: calc(59% + 34%);
        top: calc(36% + 33%);
        transform: scale(1);
        opacity: 0;
    }
`;

// Selection box grow animation
const selectionGrow = keyframes`
    0%, 20% {
        width: 0;
        height: 0;
        opacity: 0;
    }
    25% {
        opacity: 1;
    }
    75% {
        width: 34%;
        height: 33%;
        opacity: 0.8;
    }
    80%, 100% {
        width: 34%;
        height: 33%;
        opacity: 0;
    }
`;

export const DragOverlay = styled('div')`
    position: fixed;
    pointer-events: none;
    z-index: 10000;
    overflow: visible;
`;

export const Cursor = styled('div')`
    position: absolute;
    width: 24px;
    height: 24px;
    animation: ${cursorMove} 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));

    &::before {
        content: '';
        position: absolute;
        width: 24px;
        height: 24px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' stroke='%23000' stroke-width='1.5' d='M5.5 3.21V20.8l4.86-4.86h7.28L5.5 3.21z'/%3E%3C/svg%3E");
        background-size: contain;
        background-repeat: no-repeat;
    }
`;

export const SelectionBox = styled('div')`
    position: absolute;
    left: 60%;
    top: 37%;
    transform-origin: top left;
    animation: ${selectionGrow} 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    background: rgba(59, 130, 246, 0.15);
    border: 2px solid rgba(59, 130, 246, 0.8);
    border-radius: 4px;
    box-shadow:
        0 0 0 3px rgba(59, 130, 246, 0.2),
        0 4px 20px rgba(59, 130, 246, 0.3);
`;

export const CustomOverlay = styled('div')`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;

    &::before {
        content: '';
        position: absolute;
        top: 75px;
        left: 10px;
        width: calc(100% - 20px);
        height: calc(100% - 85px);
        border-radius: 12px;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
    }
`;
