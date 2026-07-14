export const Settings = {
    /**
     * Converts a setting (string) to an id by trimming it, removing all spaces, and lowercasing all characters
     * @param {string} setting The setting to convert
     * @returns {string} The id
    */
    convertSettingToId(setting) {
        return setting.trim().replaceAll(" ", "").toLowerCase();
    },

    /**
     * Course settings that apply to every course
     */
    CourseSettings: [
        "Include course",
        "Include course code",
        "Include professor names",
        "Only include primary professor",
        "Include section",
        "Include class location",
    ],
    /**
     * Schedule settings that apply to every schedule
     */

    ScheduleSettings: ["Include waitlisted courses"],

    /**
     * 
     */
    CourseSettingOverwrites() {
        return [
            [this.convertSettingToId(this.CourseSettings[2]), this.convertSettingToId(this.CourseSettings[3])]
        ]
    }

}
