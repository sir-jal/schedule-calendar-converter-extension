import { Schedule, Course } from "../../classes/index.js";
import { ExtensionSettingsManager } from "../tools/config.js";
import { Settings } from "../tools/setting.js";

/**
 * Creates an export button
 * @param {Schedule} schedule A schedule is required for the event listeners, specifically when it's time to actually export the .ics file
 * @returns {HTMLDivElement} The container which has all schedule settings as checkmarks
 */
export async function createScheduleSettings(schedule) {
    const categorySettings = (await ExtensionSettingsManager.getAll())["courseCategorization"];
    const settingsContainer = document.createElement('div');

    settingsContainer.classList.add("scheduleSettings");
    for (const setting of Settings.ScheduleSettings) {
        const id = Settings.convertSettingToId(setting);

        if (id.includes("waitlisted")) {
            if (categorySettings.groupWaitlistedCourses || schedule.getWaitlistedCourses().length === 0) continue;
        }

        const container = document.createElement('div');
        const checkbox = document.createElement('input');
        const label = document.createElement('label');


        container.classList.add("scheduleSetting");

        checkbox.type = "checkbox";
        checkbox.checked = schedule.getSetting(id);
        checkbox.id = id + "_" + schedule.id;
        checkbox.setAttribute("data-setting", id);

        label.htmlFor = checkbox.id;
        label.textContent = setting;

        container.append(checkbox, label);
        settingsContainer.append(container);

    }

    if (settingsContainer.children.length === 0) {
        settingsContainer.style.display = "none";
    }
    return settingsContainer;


}