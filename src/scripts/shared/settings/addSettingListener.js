import { Schedule, Course } from "../../../classes/index.js";
import { updateUI } from "../UI/updateUI.js";
import { updateCourseSetting } from "./updateCourseSetting.js";
import { updateSessionStorage } from "../../../utils/tools/storage.js";
import { Settings } from "../../../utils/tools/setting.js";
import { getParents } from "../../../utils/tools/htmlElement.js";

/**
 * Adds the setting event listener to a schedule. This listener will be responsible for detecting setting changes and updating the UI.
 * @param {Schedule} schedule
 */
export function addSettingListener(schedule) {
    const popUpPage = window.location.pathname.includes("pages/popup");

    document.addEventListener("change", event => {
        const element = event.target;
        if (!(element.tagName === "INPUT" && element.getAttribute("type") === "checkbox")) return;

        const parents = getParents(element);

        const scheduleElement = parents.find(e => e.id === schedule.id);
        if (!scheduleElement) return;



        const ignore = {};


        const parent = element.parentElement;

        const isCourseSetting = parents.some(e => e.classList.contains('class'));
        const isScheduleSetting = parents.some(e => e.classList.contains("scheduleSetting"));

        const setting = element.getAttribute("data-setting");

        if (isCourseSetting) {

            const classes = Array.from(scheduleElement.querySelectorAll(`.class`));
            const classDiv = classes.find(e => e.querySelector(`#${element.id}`));


            const course = schedule.findCourseById(classDiv.id);




            // console.log("INDEX", index);
            // console.log("CLASSES", classes);
            // console.log("SETTING", setting);
            // console.log("COURSE", course);
            updateCourseSetting(schedule, course.id, setting, element.checked);

            ignore.waitlisted = true;
        } else if (isScheduleSetting) {
            schedule.setSetting(setting, element.checked);

            ignore.courseOverwrites = true;
        }

        updateUI(schedule, document.querySelector(`.schedule#${schedule.id}`), ignore);
    })
}