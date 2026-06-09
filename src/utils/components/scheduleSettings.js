import { Schedule, Course } from "../../classes/index.js";

/**
 * Creates an export button
 * @param {Schedule} schedule A schedule is required for the event listeners, specifically when it's time to actually export the .ics file
 * @returns {HTMLDivElement} The container which has all schedule settings as checkmarks
 */
export function createScheduleSettings(schedule) {
    const settingsContainer = document.createElement('div');

    settingsContainer.classList.add("scheduleSettings");

    for (const setting of Schedule.Settings) {
        const container = document.createElement('div');
        const checkbox = document.createElement('input');
        const label = document.createElement('label');

        container.classList.add("scheduleSetting");

        checkbox.type = "checkbox";
        checkbox.checked = schedule.getSetting(Course.convertSettingToId(setting))
        checkbox.id = Course.convertSettingToId(setting);

        label.htmlFor = checkbox.id;
        label.textContent = setting;

        container.append(checkbox, label);
        settingsContainer.append(container);

    }

    return settingsContainer;


}