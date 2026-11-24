import { HTTPStore, isKeyError } from 'zarr';

/**
 * Every gene of a strain has its own chunk, so a missing chunk is a failed download, not a gene
 * without expression. zarr reads a missing chunk as fill values (zeros), which then got cached
 * as real data; this store raises an error instead. Metadata keys (.zarray) behave as before.
 */
export class StrictHTTPStore extends HTTPStore {
    async getItem(item: string, opts?: RequestInit): Promise<ArrayBuffer> {
        try {
            return await super.getItem(item, opts);
        } catch (error) {
            if (isKeyError(error) && !item.split('/').pop()?.startsWith('.')) {
                throw new Error(`Missing expression chunk: ${item}`);
            }
            throw error;
        }
    }
}
