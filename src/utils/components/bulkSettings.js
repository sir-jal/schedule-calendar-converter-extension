import { Schedule, Course } from "../../classes/index.js";
import { updateUI, updateCourseSetting } from "../../scripts/shared/index.js";
import { updateSessionStorage } from "../tools/storage.js";

/**
 * Creates the bulk settings for a schedule
 * @param {Schedule} schedule The schedule to apply the bulk settings to
 * @param {HTMLDivElement} scheduleContainer The schedule's HTML div container
 * @param {boolean} [popUpPage=false] Whether or not the bulk settings are being attached to the extension popup. Defaults to **`false`**
 * @returns {HTMLDivElement} A container which has the bulk settings (the buttons and select menu)
 */
export function createBulkSettings(schedule, scheduleContainer, popUpPage = false) {
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

    Course.CourseSettings.forEach(e => {
        const optionElement = document.createElement('option');
        optionElement.value = Course.convertSettingToId(e);
        optionElement.text = e;
        selectBox.options.add(optionElement);
    })

    /**
     * Mass changes all settings
     * @param {boolean} booleanValue The value for the mass change, either true or false
     */
    const massChange = (booleanValue) => {

        const optionsOverlap = Course.SettingOverwrites;
        const settingToChange = selectBox.value;
        const index = optionsOverlap.indexOf(optionsOverlap.find(e => e[0] === settingToChange));


        for (let i = 0; i < schedule.length; i++) {
            const course = schedule.getAtIndex(i);
            if (course.isAsync()) continue;

            const checkbox = document.querySelector(`#${schedule.id} #${settingToChange}${i}`);
            console.log(`#${schedule.id} #${settingToChange}${i}`);
            if (checkbox.disabled) continue;

            updateCourseSetting(schedule, course.id, settingToChange, booleanValue);

            checkbox.checked = booleanValue;

            updateUI(schedule, scheduleContainer);

        }
    }

    selectAll.onclick = () => {
        massChange(true);
        if (popUpPage) updateSessionStorage(schedule);
    };

    deselectAll.onclick = () => {
        massChange(false);
        if (popUpPage) updateSessionStorage(schedule);
    };

    selectionContainer.append(selectAll, deselectAll, selectBox);

    return selectionContainer;
}