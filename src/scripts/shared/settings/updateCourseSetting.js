import { Schedule, Course } from "../../../classes/index.js";


/**
 * Updates a course setting
 * 
 * @param {Schedule} schedule The schedule the course is in
 * @param {string} courseId The id of the course
 * @param {string} setting The setting to change
 * @param {boolean} value The new value of the setting
 */
export function updateCourseSetting(schedule, courseId, setting, value) {
    const course = schedule.findCourseById(courseId);

    course.setSetting(setting, value);
}