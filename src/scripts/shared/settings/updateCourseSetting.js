import { Schedule, Course } from "../../../classes/index.js";


/**
 * Updates a course setting
 * 
 * @param {Schedule} schedule The schedule the course is in
 * @param {string} courseId The id of the course
 * @param {string} setting The setting to change
 * @param {boolean} value The new value of the setting
 */
export function updateCourseSetting(schedule, courseId, setting, value, isBulk = false) {

    const course = schedule.findCourseById(courseId);

    const event = new CustomEvent("course-change", {
        detail: {
            course,
            changedProperty: setting,
            oldValue: course.getSetting(setting),
            newValue: value,
            isBulk

        },
        bubbles: true,
        cancelable: true
    });

    document.dispatchEvent(event);

    course.setSetting(setting, value);
}