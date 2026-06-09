import { Schedule, Course } from "../../../classes/index.js";
import { updateUI } from "../UI/updateUI.js";
import { updateCourseSetting } from "./updateCourseSetting.js";
import { updateSessionStorage } from "../../../utils/tools/storage.js";

/**
 * Adds the setting event listener to a schedule. This listener will be responsible for detecting setting changes and updating the UI.
 * @param {Schedule} schedule
 * @param {boolean} [popUpPage=false] Whether or not the listener is being attached to the extension popup. Defaults to **`false`**
 */
export function addSettingListener(schedule, popUpPage = false) {
    document.addEventListener("change", event => {
        const element = event.target;
        if (!(element.tagName === "INPUT" && element.getAttribute("type") === "checkbox")) return

        const ignore = {};

        if (Course.CourseSettings.map(e => Course.convertSettingToId(e)).some(e => element.id.includes(e))) {


            const classes = Array.from(document.querySelectorAll(`#${schedule.id} .class`));
            const index = classes.findIndex(e => e.querySelector(`#${element.id}`));

            if (index === -1) return;

            const setting = element.getAttribute("data-setting");

            const course = schedule.getAtIndex(index);



            // console.log("INDEX", index);
            // console.log("CLASSES", classes);
            // console.log("SETTING", setting);
            // console.log("COURSE", course);
            updateCourseSetting(schedule, course.id, setting, element.checked);

            ignore.waitlisted = true;
        } else {
            console.log(schedule.getSetting(element.id) !== undefined);
            if (schedule.getSetting(element.id) !== undefined) {
                schedule.setSetting(element.id, element.checked);
            }

            ignore.courseOverwrites = true;
        }
        if (popUpPage) updateSessionStorage(schedule);


        updateUI(schedule, document.querySelector(".schedule"), ignore);
    })
}