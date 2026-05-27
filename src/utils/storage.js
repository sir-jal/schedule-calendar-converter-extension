/**
 * Fetches something from the storage
 * @param {string} key The key from which to pull information
 * @returns The value at the provided key (can be null/undefined)
 */
export async function getStorage(key) {
    return await chrome.storage.local.get(key);
}