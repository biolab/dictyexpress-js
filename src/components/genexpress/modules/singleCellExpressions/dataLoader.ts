/**
 * Zarr-formatted single-cell data loader.
 * 
 * Data structure (organized by strain):
 * - arrays/expression/: Zarr array with shape (n_genes, n_cells), chunked by gene (1, n_cells)
 * - genes/names.json: Array of gene IDs
 * - genes/symbols.json: Array of gene symbols
 * - cells/tags.json: Array of cell identifiers
 * - cells/time.json: Array of time points
 * - cells/type.json: Array of cell types
 * - cells/umap.json: UMAP coordinates [[x1, y1], [x2, y2], ...]
 * - info.json: {strain, n_genes, n_cells}
 */

import { openArray, HTTPStore } from 'zarr';

const DATA_BASE_PATH = '/single-cell-data';
const CACHE_VERSION = 1;
const CACHE_DB_NAME = 'dictyexpress-gene-cache';
const CACHE_STORE_NAME = 'gene-expressions';

// Current strain (can be changed to switch between datasets)
let currentStrain: string = 'AX4';

// Shared Zarr store instances (optimization #1)
let expressionStoreInstance: HTTPStore | null = null;
let expressionArrayInstance: any | null = null;

// IndexedDB cache (optimization #2)
let dbInstance: IDBDatabase | null = null;

/**
 * Set the current strain and reset cached instances
 */
export function setStrain(strain: string): void {
    if (strain !== currentStrain) {
        currentStrain = strain;
        // Reset instances to reload from new strain
        expressionStoreInstance = null;
        expressionArrayInstance = null;
    }
}

/**
 * Get the current strain
 */
export function getCurrentStrain(): string {
    return currentStrain;
}

/**
 * Get the data URL for the current strain
 */
function getDataUrl(): string {
    return `${DATA_BASE_PATH}/${currentStrain}`;
}

/**
 * List available strains by fetching from strains.json
 * Returns a list of strain names (e.g., ['AX4', 'DH1'])
 * Falls back to ['AX4'] if strains.json is not found.
 */
export async function listAvailableStrains(): Promise<string[]> {
    try {
        const response = await fetch(`${DATA_BASE_PATH}/strains.json`);
        if (response.ok) {
            const strains: string[] = await response.json();
            return strains;
        }
    } catch (error) {
        console.warn('Could not load strains.json, using default strain list');
    }
    // Fallback to default
    return ['AX4'];
}

/**
 * Load gene IDs from JSON
 */
export async function loadGeneNames(): Promise<string[]> {
    const response = await fetch(`${getDataUrl()}/genes/names.json`);
    if (!response.ok) {
        throw new Error('Failed to load gene names');
    }
    return response.json();
}

/**
 * Load gene symbols from JSON
 */
export async function loadGeneSymbols(): Promise<string[]> {
    const response = await fetch(`${getDataUrl()}/genes/symbols.json`);
    if (!response.ok) {
        throw new Error('Failed to load gene symbols');
    }
    return response.json();
}

/**
 * Load cell tags from JSON
 */
export async function loadCellTags(): Promise<string[]> {
    const response = await fetch(`${getDataUrl()}/cells/tags.json`);
    if (!response.ok) {
        throw new Error('Failed to load cell tags');
    }
    return response.json();
}

/**
 * Load cell times from JSON
 */
export async function loadCellTimes(): Promise<string[]> {
    const response = await fetch(`${getDataUrl()}/cells/time.json`);
    if (!response.ok) {
        throw new Error('Failed to load cell times');
    }
    return response.json();
}

/**
 * Load cell types from JSON
 */
export async function loadCellTypes(): Promise<string[]> {
    const response = await fetch(`${getDataUrl()}/cells/type.json`);
    if (!response.ok) {
        throw new Error('Failed to load cell types');
    }
    return response.json();
}

/**
 * Load dataset info
 */
export async function loadDatasetInfo(): Promise<{ strain: string; n_genes: number; n_cells: number }> {
    const response = await fetch(`${getDataUrl()}/info.json`);
    if (!response.ok) {
        throw new Error('Failed to load dataset info');
    }
    return response.json();
}

/**
 * Initialize IndexedDB cache for gene expression data
 */
async function initCache(): Promise<IDBDatabase> {
    if (dbInstance) {
        return dbInstance;
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CACHE_DB_NAME, CACHE_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
                db.createObjectStore(CACHE_STORE_NAME);
            }
        };
    });
}

/**
 * Get cached gene expression from IndexedDB
 * Cache key includes strain to prevent cross-contamination
 */
async function getCachedGeneExpression(geneIndex: number): Promise<Float32Array | null> {
    try {
        const db = await initCache();
        const cacheKey = `${currentStrain}:${geneIndex}`;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([CACHE_STORE_NAME], 'readonly');
            const store = transaction.objectStore(CACHE_STORE_NAME);
            const request = store.get(cacheKey);

            request.onsuccess = () => {
                if (request.result) {
                    resolve(new Float32Array(request.result));
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null); // Fail silently, fetch from network
        });
    } catch {
        return null; // Fail silently if IndexedDB is unavailable
    }
}

/**
 * Cache gene expression in IndexedDB
 * Cache key includes strain to prevent cross-contamination
 */
async function setCachedGeneExpression(geneIndex: number, data: Float32Array): Promise<void> {
    try {
        const db = await initCache();
        const cacheKey = `${currentStrain}:${geneIndex}`;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(CACHE_STORE_NAME);
            // Store as regular array for IndexedDB compatibility
            const request = store.put(Array.from(data), cacheKey);

            request.onsuccess = () => resolve();
            request.onerror = () => resolve(); // Fail silently
        });
    } catch {
        // Fail silently if IndexedDB is unavailable
    }
}

/**
 * Get or initialize shared expression array
 */
async function getExpressionArray() {
    if (expressionArrayInstance) {
        return expressionArrayInstance;
    }

    if (!expressionStoreInstance) {
        expressionStoreInstance = new HTTPStore(`${getDataUrl()}/arrays/expression`);
    }

    expressionArrayInstance = await openArray({ store: expressionStoreInstance, mode: 'r' });
    return expressionArrayInstance;
}

/**
 * Load UMAP coordinates for all cells from JSON.
 */
export async function loadUMAPCoordinates(): Promise<{ x: number[]; y: number[] }> {
    const response = await fetch(`${getDataUrl()}/cells/umap.json`);
    if (!response.ok) {
        throw new Error('Failed to load UMAP coordinates');
    }
    
    const data: number[][] = await response.json();
    
    const x: number[] = [];
    const y: number[] = [];
    
    for (const [xCoord, yCoord] of data) {
        x.push(xCoord);
        y.push(yCoord);
    }

    return { x, y };
}

/**
 * Load expression values for a specific gene with caching.
 * Each gene is stored as a row in the expression matrix.
 * Uses shared Zarr store and IndexedDB caching for performance.
 */
export async function loadGeneExpression(geneIndex: number): Promise<Float32Array> {
    // Try to get from cache first
    const cached = await getCachedGeneExpression(geneIndex);
    if (cached) {
        return cached;
    }

    // Use shared Zarr array instance
    const zarrArray = await getExpressionArray();

    const data = await zarrArray.get([geneIndex, null]);
    
    if (typeof data === 'number') {
        throw new Error('Expected array data but got scalar');
    }
    
    let typedData: Float32Array;
    
    if ('data' in data && data.data instanceof Float32Array) {
        typedData = data.data as Float32Array;
    } else if (data instanceof Float32Array) {
        typedData = data;
    } else if (Array.isArray(data)) {
        const flatData = data.flat(Infinity) as number[];
        typedData = new Float32Array(flatData);
    } else if ('data' in data && Array.isArray(data.data)) {
        const flatData = (data.data as any[]).flat(Infinity) as number[];
        typedData = new Float32Array(flatData);
    } else {
        throw new Error('Unexpected data structure from zarr array');
    }
    
    // Cache for future use (async, don't wait)
    setCachedGeneExpression(geneIndex, typedData);
    
    return typedData;
}

/**
 * Load expression values for multiple genes in parallel with optimized batching.
 * Separates cached from uncached genes to minimize network requests.
 */
export async function loadMultipleGenesExpression(
    geneIndices: number[]
): Promise<Map<number, Float32Array>> {
    const results = new Map<number, Float32Array>();

    // Separate cached and uncached genes
    const cacheChecks = await Promise.all(
        geneIndices.map(async (geneIndex) => ({
            geneIndex,
            cached: await getCachedGeneExpression(geneIndex),
        }))
    );

    // Add cached results immediately
    const uncachedIndices: number[] = [];
    for (const { geneIndex, cached } of cacheChecks) {
        if (cached) {
            results.set(geneIndex, cached);
        } else {
            uncachedIndices.push(geneIndex);
        }
    }

    // Fetch uncached genes in parallel (with shared store, this is efficient)
    if (uncachedIndices.length > 0) {
        const promises = uncachedIndices.map(async (geneIndex) => {
            try {
                const data = await loadGeneExpression(geneIndex);
                return { geneIndex, data };
            } catch (error) {
                console.error(`Failed to load gene ${geneIndex}:`, error);
                return null;
            }
        });

        const loadedGenes = await Promise.all(promises);

        for (const result of loadedGenes) {
            if (result) {
                results.set(result.geneIndex, result.data);
            }
        }
    }

    return results;
}

/**
 * Clear the IndexedDB cache (useful for debugging or data updates)
 */
export async function clearCache(): Promise<void> {
    try {
        const db = await initCache();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(CACHE_STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Failed to clear cache:', error);
    }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{ cachedGenes: number }> {
    try {
        const db = await initCache();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([CACHE_STORE_NAME], 'readonly');
            const store = transaction.objectStore(CACHE_STORE_NAME);
            const request = store.count();

            request.onsuccess = () => resolve({ cachedGenes: request.result });
            request.onerror = () => resolve({ cachedGenes: 0 });
        });
    } catch {
        return { cachedGenes: 0 };
    }
}

/**
 * Aggregate expression values for multiple genes.
 */
export function aggregateGeneExpression(
    geneExpressions: Float32Array[],
    mode: 'average' | 'sum' | 'min' | 'max'
): Float32Array {
    if (geneExpressions.length === 0) {
        return new Float32Array(0);
    }

    const nCells = geneExpressions[0].length;
    const result = new Float32Array(nCells);

    for (let cellIdx = 0; cellIdx < nCells; cellIdx++) {
        let value: number;

        switch (mode) {
            case 'sum':
                value = 0;
                for (const expr of geneExpressions) {
                    value += expr[cellIdx];
                }
                break;

            case 'average':
                value = 0;
                for (const expr of geneExpressions) {
                    value += expr[cellIdx];
                }
                value /= geneExpressions.length;
                break;

            case 'min':
                value = Infinity;
                for (const expr of geneExpressions) {
                    value = Math.min(value, expr[cellIdx]);
                }
                break;

            case 'max':
                value = -Infinity;
                for (const expr of geneExpressions) {
                    value = Math.max(value, expr[cellIdx]);
                }
                break;

            default:
                value = 0;
        }

        result[cellIdx] = value;
    }

    return result;
}

/**
 * Apply transformation to expression values.
 */
export function transformExpression(
    expression: Float32Array,
    mode: 'linear' | 'log2' | 'log1p'
): Float32Array {
    const result = new Float32Array(expression.length);

    for (let i = 0; i < expression.length; i++) {
        const val = expression[i];

        switch (mode) {
            case 'log2':
                result[i] = val > 0 ? Math.log2(val + 1) : 0;
                break;

            case 'log1p':
                result[i] = Math.log1p(val);
                break;

            case 'linear':
            default:
                result[i] = val;
                break;
        }
    }

    return result;
}
