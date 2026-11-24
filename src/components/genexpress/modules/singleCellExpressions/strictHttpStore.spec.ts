import { afterEach, describe, expect, it, vi } from 'vitest';
import { isKeyError } from 'zarr';
import { StrictHTTPStore } from './strictHttpStore';

const respond = (status: number): void => {
    global.fetch = vi.fn(() =>
        Promise.resolve(new Response(status === 200 ? new ArrayBuffer(4) : null, { status })),
    );
};

describe('StrictHTTPStore', () => {
    const originalFetch = global.fetch;
    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('raises an error for a missing gene chunk instead of reading it as zeros', async () => {
        respond(404);
        const store = new StrictHTTPStore(
            'http://localhost/single-cell-data/AX4/arrays/expression',
        );

        const error = await store.getItem('7542.0').catch((caught: unknown) => caught);
        expect(error).toBeInstanceOf(Error);
        expect(isKeyError(error)).toBe(false);
        expect((error as Error).message).toContain('7542.0');
    });

    it('keeps missing metadata a KeyError', async () => {
        respond(404);
        const store = new StrictHTTPStore(
            'http://localhost/single-cell-data/AX4/arrays/expression',
        );

        const error = await store.getItem('.zgroup').catch((caught: unknown) => caught);
        expect(isKeyError(error)).toBe(true);
    });

    it('returns chunks that exist', async () => {
        respond(200);
        const store = new StrictHTTPStore(
            'http://localhost/single-cell-data/AX4/arrays/expression',
        );

        expect((await store.getItem('7542.0')).byteLength).toBe(4);
    });
});
