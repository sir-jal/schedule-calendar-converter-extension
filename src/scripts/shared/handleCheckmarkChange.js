import { Course } from "../../classes/course.js";
import { Schedule } from "../../classes/schedule.js";

/**
 * Handles when a checkmark is changed
 * @param {Event} event The event to handle
 * @param {Schedule} schedule the current schedule
 * @param {*} checkbox A checkbox element must be provided if the function is being called outside of an event listener
 */
export function handleCheckmarkChange(event, schedule, checkbox = null) {
    const element = checkbox ?? event.target;
    if (
        element.tagName === "INPUT" &&
        element.getAttribute("type") === "checkbox"
    ) {
        const id = element.id;
        if (id.includes("waitlisted")) {

            changeSetting(id, -1, element.checked);

            for (const course of waitlistedCourses) {
                const leCheckBox = document.querySelector(`#${course}`);
                const index = parseInt(leCheckBox.id.match(/\d+/)[0]);
                const course = schedule.getAtIndex(index);
                course.setSetting("includecourse", element.checked);

                leCheckBox.disabled = !element.checked;
                leCheckBox.checked = element.checked ? settings["includecourse"][index] : false;


                handleCheckmarkChange(null, schedule, leCheckBox);
            }
            return;
        }

        const index = parseInt(id.match(/\d+/)[0]);
        const course = schedule.getAtIndex(index);
        if (element.classList.contains("courseCheckbox")) {
            const leClass = document.querySelectorAll('.class')[index];
            const checkboxes = Array.from(leClass.querySelectorAll('.option input[type="checkbox"]'));

            for (const checkbox of checkboxes) {
                if (checkbox.classList.contains("disabled")) continue;
                checkbox.disabled = !element.checked;
            }
        }

        const setting = id.match(/\D+/)[0];

        const optionsOverlap = Course.SettingOverwrites;
        const overlapIndex = optionsOverlap.indexOf(optionsOverlap.find(e => e[0] === setting))
        if (overlapIndex !== -1) {
            for (const overlap of optionsOverlap[overlapIndex].slice(1)) {

                const checkbox = document.querySelector(`#${overlap}${index}`);
                checkbox.disabled = !element.checked;
                checkbox.classList.toggle("disabled", checkbox.disabled);

            }
        }

        course.setSetting(setting, element.checked);
        debugger;
    }
}