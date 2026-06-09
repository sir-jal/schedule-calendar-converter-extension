import { Schedule, Course } from "../../../classes/index.js";
import { renderCourse, updateUI } from "../index.js";


/**
 * Renders a schedule
 * @param {Schedule} schedule The schedule to render
 * @param {boolean} [popUpPage=false] Whether or not the schedule is being rendered into the extension popup. Defaults to **`false`**
 * @returns {HTMLDivElement} the container element
 */
export function renderSchedule(schedule, popUpPage = false) {
    const scheduleContainer = document.createElement("div");
    const classesContainer = document.createElement("div");

    classesContainer.classList.toggle("classes", true);
    scheduleContainer.classList.toggle("schedule", true);

    scheduleContainer.id = schedule.id;



    for (const course of schedule.getCourses()) {
        const courseElement = renderCourse(schedule, course, popUpPage);
        classesContainer.append(courseElement);
    }


    scheduleContainer.append(classesContainer);
    updateUI(schedule, classesContainer);
    return scheduleContainer;
}