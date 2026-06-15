import { Schedule, Course } from "../../classes/index.js";
import { updateUI, updateCourseSetting } from "../../scripts/shared/index.js";
import { updateSessionStorage } from "../tools/storage.js";
import { Settings } from "../tools/setting.js";

/**
 * Creates the bulk settings for a schedule
 * @param {Schedule} schedule The schedule to apply the bulk settings to
 * @param {HTMLDivElement} scheduleContainer The schedule's HTML div container
 * @returns {HTMLDivElement} A container which has the bulk settings (the buttons and select menu)
 */
export function createBulkSettings(schedule, scheduleContainer) {

    const popUpPage = window.location.pathname.includes("pages/popup");

    const selectionContainer = document.createElement("div");
    const selectAll = document.createElement("button");
    const deselectAll = document.createElement("button");
    const selectBox = document.createElement("select");

    selectionContainer.classList.toggle("selectionContainer", true);
    selectAll.classList.toggle("selectAll", true);
    deselectAll.classList.toggle("deselectAll", true);
    selectBox.classList.toggle("optionSelect", true);

    selectAll.textContent = "Select All";
    deselectAll.textContent = "Deselect All";

    Settings.CourseSettings.forEach(e => {
        const optionElement = document.createElement('option');
        optionElement.value = Settings.convertSettingToId(e);
        optionElement.text = e;
        selectBox.options.add(optionElement);
    })

    /**
     * Mass changes all settings
     * @param {boolean} booleanValue The value for the mass change, either true or false
     */
    const massChange = (booleanValue) => {

        const settingToChange = selectBox.value;

        const bulkEvent = new CustomEvent("course-bulk-settings", {
            bubbles: true,
            cancelable: true,
            detail: {
                schedule,
                setting: settingToChange,
                newValue: booleanValue
            }
        })

        document.dispatchEvent(bulkEvent);

        for (let i = 0; i < schedule.length; i++) {
            const course = schedule.at(i);
            if (course.hasNoMeetingInfo()) continue;

            const checkbox = document.querySelector(`#${schedule.id} #${settingToChange}_${course.id}`);
            if (checkbox.disabled) continue;

            updateCourseSetting(schedule, course.id, settingToChange, booleanValue, true);

            checkbox.checked = booleanValue;

            updateUI(schedule, scheduleContainer);

        }
    }

    selectAll.onclick = () => {
        massChange(true);
    };

    deselectAll.onclick = () => {
        massChange(false);
    };

    selectionContainer.append(selectAll, deselectAll, selectBox);

    return selectionContainer;
}