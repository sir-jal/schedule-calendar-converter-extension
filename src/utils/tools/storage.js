import { Schedule } from "../../classes/index.js";

/**
 * Fetches something from the storage
 * @param {string} key The key from which to pull information
 * @returns The value at the provided key (can be null/undefined)
 */
export async function getStorage(key) {
    return await chrome.storage.local.get(key);
}

/**
 * Updates the session storage
 * @param {Schedule} schedule The schedule to update the storage with
 */
export function updateSessionStorage(schedule) {

    console.log('storage updated');
    chrome.storage.session.set({ loadedSchedule: schedule.toJSON() });
}

/**
 * Clears the session storage
 */
export function clearSessionStorage() {
    chrome.storage.session.remove("loadedSchedule");
}