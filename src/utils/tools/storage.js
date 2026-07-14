import { Schedule } from "../../classes/index.js";
import { getJSON } from "./getJSON.js";
import { wait } from "./timeRelatedUtils.js";

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
export async function updateSessionStorage(schedule) {

    await chrome.storage.session.set({ loadedSchedule: { FORCE_PRESERVE: true, ...schedule.toJSON() } });
}

/**
 * Clears the session storage
 */
export async function clearSessionStorage() {
    await chrome.storage.session.remove("loadedSchedule");
}


export const SCHOOL_CACHE_MAX_AGE = 1000 * 60;

export async function updateInfoCache(force = false) {
    const e = await chrome.storage?.local?.get(["lastUpdated"]);
    const lastUpdated = new Date(e?.lastUpdated ?? 0).getTime();
    await wait(150);
    if (
        Object.keys(e).length === 0 ||
        lastUpdated + SCHOOL_CACHE_MAX_AGE <= Date.now() || force
    ) {
        await chrome.storage?.local?.set({
            info: await getJSON(
                "../../../extension_info.json"
            ),
            lastUpdated: Date.now(),
        });

    }
    return await chrome.storage?.local?.get(["info"]);
}