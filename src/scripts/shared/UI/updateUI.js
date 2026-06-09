import { Schedule, Course } from "../../../classes/index.js";
import { updateCourseSetting } from "../settings/updateCourseSetting.js";


/**
 * 
 * @param {Schedule} schedule 
 * @param {Element} classContainer
 * @param {{waitlisted: boolean, courseOverwrites: boolean}} ignore
 */
export function updateUI(schedule, classContainer, ignore = {}) {
    const allCourses = schedule.getCourses();
    const waitlistedCourses = schedule.getWaitlistedCourses();
    const coursesDOM = Array.from(classContainer.querySelectorAll(".class"));



    const includeWaitlisted = schedule.getSetting("includewaitlistedcourses");

    console.log(schedule);

    // update waitlisted courses
    if (!ignore.waitlisted) {
        for (const course of waitlistedCourses) {


            const courseDiv = coursesDOM[schedule.findCourseIndex(course.id)];
            const courseCheckbox = courseDiv.querySelector('.courseCheckbox');
            courseCheckbox.disabled = !includeWaitlisted;


            if (includeWaitlisted) {
                updateCourseSetting(schedule, course.id, "includecourse", courseCheckbox.checked);
            } else {
                updateCourseSetting(schedule, course.id, "includecourse", false);
            }


        }
    }

    for (const course of allCourses) {
        const courseDiv = coursesDOM[schedule.findCourseIndex(course.id)];
        const optionCheckboxes = Array.from(courseDiv.querySelectorAll('.option input[type="checkbox"]'));
        const courseIncluded = course.getSetting("includecourse");
        const courseOverwrites = Course.SettingOverwrites;

        if (!ignore.courseOverwrites) {
            for (const overwrite of courseOverwrites) {
                const masterSetting = overwrite[0];
                const affected = overwrite.slice(1);

                const masterValue = course.getSetting(masterSetting);

                for (const a of affected) {
                    const chbx = optionCheckboxes.find(e => e.id.includes(a));

                    chbx.disabled = !masterValue;
                    chbx.classList.toggle("disabled", !masterValue);
                }
            }
        }


        for (const checkbox of optionCheckboxes) {

            if (!checkbox.classList.contains('disabled')) {
                checkbox.disabled = !courseIncluded;
            }
        }



    }

}