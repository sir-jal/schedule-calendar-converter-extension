import { Settings } from "./setting.js"

const defaultPerCourseSettings = {}
for (const setting of Settings.CourseSettings.slice(1)) {
    defaultPerCourseSettings[Settings.convertSettingToId(setting)] = true;
}

/**
 * These are settings that are used when the user has no saved preferences. This is also used as a template.
 */
export const DEFAULT_SETTINGS = {
    perCourseSettings: defaultPerCourseSettings,
    courseCategorization: {
        groupNoMeetingTime: false,
        groupWaitlistedCourses: false,
        groupCourseCode: false,
    },
    scheduleBehavior: {
        restorePopupProgress: "ASK", // ALWAYS or ASK or NEVER
    },
    importBehavior: {
        importSettingBehavior: "PRESERVE" // PRESERVE or REVERT
    },
    calendarPreferences: {
        dateFormat: "MM/DD/YYYY", // MM/DD/YYYY or DD/MM/YYYY
        dateSplitter: "/"
    }
}

/**
 * Handles fetching and configuring extension settings & preferences.
 */
export const ExtensionSettingsManager = {

    /**
     * Transforms the provided object to fit the default settings template.
     * 
     * Extra entries will be removed. Missing entries will be added 
     * 
     * @param {typeof DEFAULT_SETTINGS} leSettings 
     * @returns {typeof DEFAULT_SETTINGS}
     */
    matchToDefault(leSettings) {
        if (leSettings === null || leSettings === undefined) return null;
        const defKeys = Object.keys(DEFAULT_SETTINGS);
        const curKeys = Object.keys(leSettings);

        const notAllowedKeys = curKeys.filter(e => !defKeys.includes(e));
        for (const key of notAllowedKeys) {
            delete leSettings[key];
        }

        for (const key of defKeys) {
            const value = leSettings[key];
            const defSettings = DEFAULT_SETTINGS[key]

            if (value === null || value === undefined) {
                leSettings[key] = defSettings
                continue;
            };
            const defSettingKeys = Object.keys(defSettings);
            const curSettingKeys = Object.keys(value);

            const notAllowedKeys = curSettingKeys.filter(e => !defSettingKeys.includes(e));
            for (const settingKey of notAllowedKeys) {
                delete leSettings[key][settingKey];
            }

            for (const settingKey in defSettings) {
                const settingValue = leSettings[key][settingKey];
                if (settingValue === null || settingValue === undefined)
                    leSettings[key][settingKey] = DEFAULT_SETTINGS[key][settingKey];
            }
        }

        return leSettings;
    },

    /**
     * 
     * @returns {Promise<typeof DEFAULT_SETTINGS>}
     */
    async getAll() {
        const leSettings = await chrome.storage.sync.get("extensionSettings");
        return leSettings.extensionSettings ? this.matchToDefault(leSettings.extensionSettings) : DEFAULT_SETTINGS;
    },

    /**
     * 
     * @returns {Promise<typeof DEFAULT_SETTINGS>}
     */
    async resetToDefault() {
        await chrome.storage.sync.set({ extensionSettings: DEFAULT_SETTINGS, lastEditStamp: Date.now() });
        return DEFAULT_SETTINGS;
    },

    /**
     * Sets the extension settings to the given object
     * @param {typeof DEFAULT_SETTINGS} leSettings 
     */
    async setSettings(leSettings) {
        await chrome.storage.sync.set({ extensionSettings: this.matchToDefault(leSettings), lastEditStamp: Date.now() });
    },

    async getLastEditStamp() {
        const lES = await chrome.storage.sync.get("lastEditStamp");
        return lES.lastEditStamp;
    },
}


