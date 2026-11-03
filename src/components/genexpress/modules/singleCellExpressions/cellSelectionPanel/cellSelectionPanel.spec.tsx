import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import CellSelectionPanel from './cellSelectionPanel';

describe('CellSelectionPanel', () => {
    it('hints how to select cells when nothing is selected', () => {
        render(<CellSelectionPanel selectedCount={0} onClear={vi.fn()} isComparing={false} />);

        expect(
            screen.getByText('Shift + drag, or click a legend entry, to select cells'),
        ).toBeInTheDocument();
    });

    it('compares the selection with the chosen reference', () => {
        const onCompare = vi.fn();
        render(
            <CellSelectionPanel
                selectedCount={12}
                onCompare={onCompare}
                onClear={vi.fn()}
                isComparing={false}
            />,
        );

        expect(screen.getByText('12 cells selected')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Same time points' }));
        fireEvent.click(screen.getByRole('button', { name: 'All other cells' }));
        expect(onCompare.mock.calls).toEqual([['sameTime'], ['rest']]);
    });

    it('disables same time points when the selection holds whole time points', () => {
        render(
            <CellSelectionPanel
                selectedCount={12}
                onCompare={vi.fn()}
                onClear={vi.fn()}
                isComparing={false}
                hasSameTimeReference={false}
            />,
        );

        expect(screen.getByRole('button', { name: 'Same time points' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'All other cells' })).toBeEnabled();
    });
});
