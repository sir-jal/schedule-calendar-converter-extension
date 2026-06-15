import { Schedule, Course } from "../../../classes/index.js";
import { renderCourse, updateUI } from "../index.js";


/**
 * Renders a schedule
 * @param {Schedule} schedule The schedule to render
 * @returns {HTMLDivElement} the container element
 */
export function renderSchedule(schedule, excludeAsyncByDefault = true) {

    const scheduleContainer = document.createElement("div");
    const classesContainer = document.createElement("div");

    classesContainer.classList.toggle("classes", true);
    scheduleContainer.classList.toggle("schedule", true);

    scheduleContainer.id = schedule.id;


    const grouped = schedule.groupCourses(true);
    const entries = Object.entries(grouped);

    const uncategorizedGroup = document.createElement('div');
    const h2 = document.createElement('h2');



    h2.textContent = "Uncategorized";
    uncategorizedGroup.classList.add("classGroup");
    if (!entries.every(e => e[1].length <= 1)) uncategorizedGroup.append(h2);




    for (const [courseCode, courses] of entries) {
        if (courses.length === 0) continue;
        if (courses.length === 1 && !courses[0].hasNoMeetingInfo()) {
            uncategorizedGroup.append(renderCourse(schedule, courses[0], excludeAsyncByDefault));
            continue;
        }
        const classGroup = document.createElement('div');
        const h2 = document.createElement('h2');
        const hr = document.createElement('hr');

        h2.textContent = courseCode;

        classGroup.append(h2);
        classGroup.classList.add("classGroup");

        for (const course of courses) {
            const courseElement = renderCourse(schedule, course, excludeAsyncByDefault);
            classGroup.append(courseElement);

        }

        classesContainer.append(classGroup, hr);
    }

    classesContainer.append(uncategorizedGroup);
    // for (const course of schedule.getCourses()) {

    //     const classGroups = Array.from(classesContainer.querySelectorAll(".classGroup"));
    //     let targetClassGroup = classGroups.find(
    //         e => e.querySelector("h2")?.textContent?.toLowerCase() === course.getCourseCode().toLowerCase()
    //     );

    //     if (course.hasNoMeetingInfo()) {
    //         targetClassGroup = classGroups.find(
    //             e => e.querySelector("h2")?.textContent?.toLowerCase() === course.getCourseCode().toLowerCase()
    //         )
    //     }

    //     const courseElement = renderCourse(schedule, course, popUpPage);

    //     if (targetClassGroup) {
    //         targetClassGroup.append(courseElement)
    //     } else {
    //         targetClassGroup = document.createElement("div");
    //         const h2 = document.createElement('h2');

    //         targetClassGroup.classList.add("classGroup");
    //         h2.textContent = course.getCourseCode();

    //         targetClassGroup.append(h2, courseElement)

    //     }

    //     classesContainer.append(targetClassGroup);

    // }


    scheduleContainer.append(classesContainer);
    updateUI(schedule, classesContainer);
    return scheduleContainer;
}