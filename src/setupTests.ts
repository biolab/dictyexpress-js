import createFetchMock from 'vitest-fetch-mock';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import 'vitest-canvas-mock';

vi.setConfig({ testTimeout: 10_000 });

vi.stubGlobal('API_URL', null);
vi.stubGlobal('SAML_AUTH_URL', null);
vi.stubGlobal('WEBSOCKET_URL', null);
vi.stubGlobal('FIND_SIMILAR_API_URL', null);
vi.stubGlobal('GO_ENRICHMENT_API_URL', null);
vi.stubGlobal('COMMUNITY_SLUG', 'test');
vi.stubGlobal('SELECTED_TIMESERIES_SLUG', 'test');
vi.stubEnv('VITE_APP_NAME', 'dictyExpress');

window.ResizeObserver =
    window.ResizeObserver ||
    vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
    }));

/**
 * Fix `matchMedia` not present, legacy browsers require a polyfill.
 */
window.matchMedia =
    window.matchMedia ||
    (() => {
        return {
            matches: false,
            addListener() {},
            removeListener() {},
        };
    });

const fetchMocker = createFetchMock(vi);

fetchMocker.enableMocks();
beforeEach(() => {
    fetchMocker.mockClear();
});
