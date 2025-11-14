import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
    setStrain,
    getCurrentStrain,
    loadGeneNames,
    loadGeneSymbols,
    loadCellTags,
    loadCellTimes,
    loadCellTypes,
    loadDatasetInfo,
    loadUMAPCoordinates,
    listAvailableStrains,
    loadGeneExpression,
    loadMultipleGenesExpression,
    clearCache,
    getCacheStats,
    aggregateGeneExpression,
    transformExpression,
} from './dataLoader';

const { openArrayMock, openArrayGetMock } = vi.hoisted(() => {
    const getMock = vi.fn();
    const arrayMock = vi.fn(() => Promise.resolve({ get: getMock }));
    return { openArrayMock: arrayMock, openArrayGetMock: getMock };
});

vi.mock('zarr', () => {
    return {
        openArray: openArrayMock,
        HTTPStore: vi.fn(() => ({})),
    };
});

const setRequestResult = <T>(request: IDBRequest<T>, value: T): void => {
    Object.defineProperty(request, 'result', {
        value,
        configurable: true,
        writable: true,
    });
};

type AsyncRequest<T> = IDBRequest<T> & { triggerSuccess: (result: T) => void };

const createAsyncRequest = <T>(initialResult: T): AsyncRequest<T> => {
    const request = {
        result: initialResult,
        onsuccess: undefined,
        onerror: undefined,
        error: null,
        triggerSuccess(result: T) {
            setRequestResult(request as unknown as IDBRequest<T>, result);
            request.onsuccess?.({ target: request } as unknown as Event);
        },
    } as unknown as AsyncRequest<T>;

    setTimeout(() => {
        request.triggerSuccess(initialResult);
    }, 0);

    return request;
};

const cacheStore = new Map<string, unknown>();

const createFakeObjectStore = () => ({
    get(key: string) {
        return createAsyncRequest(cacheStore.get(key) ?? null);
    },
    put(value: unknown, key: string) {
        cacheStore.set(key, value);
        return createAsyncRequest(undefined);
    },
    clear() {
        cacheStore.clear();
        return createAsyncRequest(undefined);
    },
    count() {
        return createAsyncRequest(cacheStore.size);
    },
});

const createFakeTransaction = () => ({
    objectStore() {
        return createFakeObjectStore();
    },
});

let hasObjectStore = false;

const createFakeDatabase = (): IDBDatabase => {
    const objectStoreNames = {
        get length() {
            return hasObjectStore ? 1 : 0;
        },
        item() {
            return null;
        },
        contains() {
            return hasObjectStore;
        },
        [Symbol.iterator]: function* () {
            if (hasObjectStore) {
                yield 'fake-store';
            }
        },
    } as unknown as DOMStringList;

    return {
        name: 'fake-db',
        version: 1,
        objectStoreNames,
        onabort: null,
        onclose: null,
        onerror: null,
        onversionchange: null,
        transaction() {
            return createFakeTransaction();
        },
        createObjectStore() {
            hasObjectStore = true;
            return createFakeObjectStore();
        },
        deleteObjectStore() {
            hasObjectStore = false;
        },
        close() {
            return undefined;
        },
        addEventListener() {
            return undefined;
        },
        removeEventListener() {
            return undefined;
        },
        dispatchEvent() {
            return false;
        },
    } as unknown as IDBDatabase;
};

const createOpenRequest = () => {
    const request = {
        onsuccess: undefined,
        onerror: undefined,
        onupgradeneeded: undefined,
        result: undefined,
        error: null,
    } as unknown as IDBOpenDBRequest;

    setTimeout(() => {
        const db = createFakeDatabase();
        setRequestResult(request as unknown as IDBOpenDBRequest, db);
        if (request.onupgradeneeded) {
            request.onupgradeneeded({ target: request } as unknown as IDBVersionChangeEvent);
        }
        request.onsuccess?.({ target: request } as unknown as Event);
    }, 0);

    return request;
};

(globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = {
    open() {
        return createOpenRequest();
    },
    deleteDatabase() {
        return createOpenRequest();
    },
    cmp() {
        return 0;
    },
    databases() {
        return Promise.resolve([]);
    },
};

// Mock fetch globally
global.fetch = vi.fn();

describe('dataLoader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        openArrayMock.mockImplementation(() => Promise.resolve({ get: openArrayGetMock }));
        openArrayGetMock.mockReset();
        cacheStore.clear();
        hasObjectStore = false;
        global.fetch = vi.fn();
        // Reset strain to default
        setStrain('AX4');
    });

    describe('strain management', () => {
        it('should return default strain AX4', () => {
            expect(getCurrentStrain()).toBe('AX4');
        });

        it('should set and get strain', () => {
            setStrain('DH1');
            expect(getCurrentStrain()).toBe('DH1');
        });

        it('should change strain multiple times', () => {
            setStrain('DH1');
            expect(getCurrentStrain()).toBe('DH1');

            setStrain('AX2');
            expect(getCurrentStrain()).toBe('AX2');

            setStrain('AX4');
            expect(getCurrentStrain()).toBe('AX4');
        });
    });

    describe('listAvailableStrains', () => {
        it('should fetch and return list of strains', async () => {
            const mockStrains = ['AX4', 'DH1', 'AX2'];
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockStrains),
            });

            const strains = await listAvailableStrains();

            expect(strains).toEqual(mockStrains);
            expect(global.fetch).toHaveBeenCalledWith('/single-cell-data/strains.json');
        });

        it('should return default strain list when fetch fails', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
            });

            const strains = await listAvailableStrains();

            expect(strains).toEqual(['AX4']);
        });

        it('should return default strain list when fetch throws error', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new Error('Network error'),
            );

            const strains = await listAvailableStrains();

            expect(strains).toEqual(['AX4']);
        });
    });

    describe('loadGeneNames', () => {
        it('should fetch and return gene names', async () => {
            const mockGeneNames = ['DDB_G0001', 'DDB_G0002', 'DDB_G0003'];
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockGeneNames),
            });

            const geneNames = await loadGeneNames();

            expect(geneNames).toEqual(mockGeneNames);
            expect(global.fetch).toHaveBeenCalledWith('/single-cell-data/AX4/genes/names.json');
        });

        it('should throw error when fetch fails', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
            });

            await expect(loadGeneNames()).rejects.toThrow('Failed to load genes/names.json');
        });

        it('should use correct strain in URL', async () => {
            setStrain('DH1');
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            await loadGeneNames();

            expect(global.fetch).toHaveBeenCalledWith('/single-cell-data/DH1/genes/names.json');
        });
    });

    describe('loadGeneSymbols', () => {
        it('should fetch and return gene symbols', async () => {
            const mockSymbols = ['pspA', 'pspB', 'carA'];
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSymbols),
            });

            const symbols = await loadGeneSymbols();

            expect(symbols).toEqual(mockSymbols);
            expect(global.fetch).toHaveBeenCalledWith('/single-cell-data/AX4/genes/symbols.json');
        });

        it('should throw error when fetch fails', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
            });

            await expect(loadGeneSymbols()).rejects.toThrow('Failed to load genes/symbols.json');
        });
    });

    describe('loadCellTags', () => {
        it('should fetch and return cell tags', async () => {
            const mockTags = ['cell_001', 'cell_002', 'cell_003'];
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockTags),
            });

            const tags = await loadCellTags();

            expect(tags).toEqual(mockTags);
            expect(global.fetch).toHaveBeenCalledWith('/single-cell-data/AX4/cells/tags.json');
        });

        it('should throw error when fetch fails', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
            });

            await expect(loadCellTags()).rejects.toThrow('Failed to load cells/tags.json');
        });
    });

    describe('loadCellTimes', () => {
        it('should fetch and return cell times', async () => {
            const mockTimes = ['0h', '2h', '4h', '8h'];
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockTimes),
            });

            const times = await loadCellTimes();

            expect(times).toEqual(mockTimes);
            expect(global.fetch).toHaveBeenCalledWith('/single-cell-data/AX4/cells/time.json');
        });

        it('should throw error when fetch fails', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
            });

            await expect(loadCellTimes()).rejects.toThrow('Failed to load cells/time.json');
        });
    });

    describe('loadCellTypes', () => {
        it('should fetch and return cell types', async () => {
            const mockTypes = ['Type A', 'Type B', 'Type C'];
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockTypes),
            });

            const types = await loadCellTypes();

            expect(types).toEqual(mockTypes);
            expect(global.fetch).toHaveBeenCalledWith('/single-cell-data/AX4/cells/type.json');
        });

        it('should throw error when fetch fails', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
            });

            await expect(loadCellTypes()).rejects.toThrow('Failed to load cells/type.json');
        });
    });

    describe('loadDatasetInfo', () => {
        it('should fetch and return dataset info', async () => {
            const mockInfo = {
                strain: 'AX4',
                n_genes: 13000,
                n_cells: 5000,
            };
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockInfo),
            });

            const info = await loadDatasetInfo();

            expect(info).toEqual(mockInfo);
            expect(global.fetch).toHaveBeenCalledWith('/single-cell-data/AX4/info.json');
        });

        it('should throw error when fetch fails', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
            });

            await expect(loadDatasetInfo()).rejects.toThrow('Failed to load info.json');
        });
    });

    describe('loadUMAPCoordinates', () => {
        it('should fetch and parse UMAP coordinates correctly', async () => {
            const mockCoordinates = [
                [1.5, 2.3],
                [3.2, 4.1],
                [5.5, 6.8],
            ];
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockCoordinates),
            });

            const coords = await loadUMAPCoordinates();

            expect(coords).toEqual({
                x: [1.5, 3.2, 5.5],
                y: [2.3, 4.1, 6.8],
            });
            expect(global.fetch).toHaveBeenCalledWith('/single-cell-data/AX4/cells/umap.json');
        });

        it('should handle empty coordinates array', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            const coords = await loadUMAPCoordinates();

            expect(coords).toEqual({
                x: [],
                y: [],
            });
        });

        it('should throw error when fetch fails', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
            });

            await expect(loadUMAPCoordinates()).rejects.toThrow('Failed to load cells/umap.json');
        });
    });

    describe('aggregateGeneExpression', () => {
        const expr1 = new Float32Array([1.0, 2.0, 3.0, 4.0]);
        const expr2 = new Float32Array([2.0, 3.0, 4.0, 5.0]);
        const expr3 = new Float32Array([3.0, 4.0, 5.0, 6.0]);

        it('should aggregate using average mode', () => {
            const result = aggregateGeneExpression([expr1, expr2, expr3], 'average');

            expect(result.length).toBe(4);
            expect(result[0]).toBeCloseTo(2.0);
            expect(result[1]).toBeCloseTo(3.0);
            expect(result[2]).toBeCloseTo(4.0);
            expect(result[3]).toBeCloseTo(5.0);
        });

        it('should aggregate using sum mode', () => {
            const result = aggregateGeneExpression([expr1, expr2, expr3], 'sum');

            expect(result.length).toBe(4);
            expect(result[0]).toBeCloseTo(6.0);
            expect(result[1]).toBeCloseTo(9.0);
            expect(result[2]).toBeCloseTo(12.0);
            expect(result[3]).toBeCloseTo(15.0);
        });

        it('should aggregate using min mode', () => {
            const result = aggregateGeneExpression([expr1, expr2, expr3], 'min');

            expect(result.length).toBe(4);
            expect(result[0]).toBeCloseTo(1.0);
            expect(result[1]).toBeCloseTo(2.0);
            expect(result[2]).toBeCloseTo(3.0);
            expect(result[3]).toBeCloseTo(4.0);
        });

        it('should aggregate using max mode', () => {
            const result = aggregateGeneExpression([expr1, expr2, expr3], 'max');

            expect(result.length).toBe(4);
            expect(result[0]).toBeCloseTo(3.0);
            expect(result[1]).toBeCloseTo(4.0);
            expect(result[2]).toBeCloseTo(5.0);
            expect(result[3]).toBeCloseTo(6.0);
        });

        it('should return empty array when no expressions provided', () => {
            const result = aggregateGeneExpression([], 'average');

            expect(result.length).toBe(0);
        });

        it('should handle single expression array', () => {
            const result = aggregateGeneExpression([expr1], 'average');

            expect(result.length).toBe(4);
            expect(result[0]).toBeCloseTo(1.0);
            expect(result[1]).toBeCloseTo(2.0);
            expect(result[2]).toBeCloseTo(3.0);
            expect(result[3]).toBeCloseTo(4.0);
        });

        it('should handle expressions with zero values', () => {
            const expr = new Float32Array([0.0, 1.0, 0.0, 2.0]);
            const result = aggregateGeneExpression([expr], 'average');

            expect(result[0]).toBe(0.0);
            expect(result[1]).toBe(1.0);
            expect(result[2]).toBe(0.0);
            expect(result[3]).toBe(2.0);
        });

        it('should handle negative values in min mode', () => {
            const exprNeg = new Float32Array([-1.0, -2.0, -3.0, -4.0]);
            const result = aggregateGeneExpression([expr1, exprNeg], 'min');

            expect(result[0]).toBeCloseTo(-1.0);
            expect(result[1]).toBeCloseTo(-2.0);
            expect(result[2]).toBeCloseTo(-3.0);
            expect(result[3]).toBeCloseTo(-4.0);
        });
    });

    describe('transformExpression', () => {
        const expression = new Float32Array([0.0, 1.0, 2.0, 4.0, 8.0]);

        it('should apply linear transformation (no change)', () => {
            const result = transformExpression(expression, 'linear');

            expect(result.length).toBe(5);
            expect(result[0]).toBeCloseTo(0.0);
            expect(result[1]).toBeCloseTo(1.0);
            expect(result[2]).toBeCloseTo(2.0);
            expect(result[3]).toBeCloseTo(4.0);
            expect(result[4]).toBeCloseTo(8.0);
        });

        it('should apply log2 transformation', () => {
            const result = transformExpression(expression, 'log2');

            expect(result.length).toBe(5);
            expect(result[0]).toBeCloseTo(0.0); // log2(0+1) = 0
            expect(result[1]).toBeCloseTo(1.0); // log2(1+1) = 1
            expect(result[2]).toBeCloseTo(Math.log2(3)); // log2(2+1)
            expect(result[3]).toBeCloseTo(Math.log2(5)); // log2(4+1)
            expect(result[4]).toBeCloseTo(Math.log2(9)); // log2(8+1)
        });

        it('should apply log1p transformation', () => {
            const result = transformExpression(expression, 'log1p');

            expect(result.length).toBe(5);
            expect(result[0]).toBeCloseTo(Math.log1p(0.0));
            expect(result[1]).toBeCloseTo(Math.log1p(1.0));
            expect(result[2]).toBeCloseTo(Math.log1p(2.0));
            expect(result[3]).toBeCloseTo(Math.log1p(4.0));
            expect(result[4]).toBeCloseTo(Math.log1p(8.0));
        });

        it('should handle zero values in log2 transformation', () => {
            const zeroExpr = new Float32Array([0.0, 0.0, 0.0]);
            const result = transformExpression(zeroExpr, 'log2');

            expect(result[0]).toBe(0.0);
            expect(result[1]).toBe(0.0);
            expect(result[2]).toBe(0.0);
        });

        it('should handle negative values in log2 transformation', () => {
            const negExpr = new Float32Array([-1.0, -2.0]);
            const result = transformExpression(negExpr, 'log2');

            // Negative values should result in 0 according to the implementation
            expect(result[0]).toBe(0.0);
            expect(result[1]).toBe(0.0);
        });

        it('should not modify original array', () => {
            const original = new Float32Array([1.0, 2.0, 3.0]);
            const originalCopy = new Float32Array(original);

            transformExpression(original, 'log2');

            // Original should remain unchanged
            expect(original).toEqual(originalCopy);
        });

        it('should handle large values', () => {
            const largeExpr = new Float32Array([100.0, 1000.0, 10000.0]);
            const result = transformExpression(largeExpr, 'log2');

            expect(result[0]).toBeCloseTo(Math.log2(101));
            expect(result[1]).toBeCloseTo(Math.log2(1001));
            expect(result[2]).toBeCloseTo(Math.log2(10001));
        });

        it('should handle very small values', () => {
            const smallExpr = new Float32Array([0.001, 0.01, 0.1]);
            const result = transformExpression(smallExpr, 'log1p');

            expect(result[0]).toBeCloseTo(Math.log1p(0.001));
            expect(result[1]).toBeCloseTo(Math.log1p(0.01));
            expect(result[2]).toBeCloseTo(Math.log1p(0.1));
        });
    });

    describe('loadGeneExpression', () => {
        it('should cache gene expression after first load', async () => {
            const mockData = new Float32Array([1.0, 2.0, 3.0]);
            openArrayGetMock.mockResolvedValueOnce({ data: mockData });

            const firstResult = await loadGeneExpression(0);
            expect(Array.from(firstResult)).toEqual(Array.from(mockData));
            expect(openArrayGetMock).toHaveBeenCalledTimes(1);
            expect(openArrayMock).toHaveBeenCalledTimes(1);

            await new Promise((resolve) => setTimeout(resolve, 0));

            openArrayGetMock.mockClear();
            openArrayMock.mockClear();

            const secondResult = await loadGeneExpression(0);
            expect(Array.from(secondResult)).toEqual(Array.from(mockData));
            expect(openArrayGetMock).not.toHaveBeenCalled();
            expect(openArrayMock).not.toHaveBeenCalled();
        });

        it('should handle array responses without data property', async () => {
            openArrayGetMock.mockResolvedValueOnce([1, 2, 3]);

            const result = await loadGeneExpression(1);
            expect(Array.from(result)).toEqual([1, 2, 3]);
        });
    });

    describe('loadMultipleGenesExpression', () => {
        it('should merge cached and uncached gene expressions', async () => {
            const cachedData = new Float32Array([1.0, 1.5]);
            openArrayGetMock.mockResolvedValueOnce({ data: cachedData });

            await loadGeneExpression(0);
            await new Promise((resolve) => setTimeout(resolve, 0));

            const freshData = new Float32Array([2.0, 2.5]);
            openArrayGetMock.mockResolvedValueOnce({ data: freshData });

            const callsBefore = openArrayGetMock.mock.calls.length;

            const { data: results, failedIndices } = await loadMultipleGenesExpression([0, 1]);

            expect(Array.from(results.get(0) ?? new Float32Array())).toEqual(
                Array.from(cachedData),
            );
            expect(Array.from(results.get(1) ?? new Float32Array())).toEqual(Array.from(freshData));
            expect(failedIndices).toEqual([]);
            const callsAfter = openArrayGetMock.mock.calls.length;
            expect(callsAfter - callsBefore).toBe(1);
        });

        it('should keep successful results when some genes fail to load', async () => {
            const successData = new Float32Array([5.0, 6.0]);
            openArrayGetMock.mockResolvedValueOnce({ data: successData });
            openArrayGetMock.mockRejectedValueOnce(new Error('zarr failure'));

            const { data: results, failedIndices } = await loadMultipleGenesExpression([0, 1]);

            expect(Array.from(results.get(0) ?? new Float32Array())).toEqual(
                Array.from(successData),
            );
            expect(results.has(1)).toBe(false);
            expect(failedIndices).toEqual([1]);
        });
    });

    describe('cache utilities', () => {
        it('should report cached genes and clear cache', async () => {
            openArrayGetMock.mockResolvedValueOnce({ data: new Float32Array([1.0]) });

            await loadGeneExpression(5);
            await new Promise((resolve) => setTimeout(resolve, 0));

            const statsBefore = await getCacheStats();
            expect(statsBefore.cachedGenes).toBe(1);

            await clearCache();

            const statsAfter = await getCacheStats();
            expect(statsAfter.cachedGenes).toBe(0);
        });
    });
});
