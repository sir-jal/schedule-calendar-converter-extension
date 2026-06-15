import { Schedule, Course } from "../../../classes/index.js";
import { updateCourseSetting } from "../settings/updateCourseSetting.js";
import { Settings } from "../../../utils/tools/setting.js";


/**
 * 
 * @param {Schedule} schedule 
 * @param {Element} classContainer
 * @param {{waitlisted: boolean, courseOverwrites: boolean}} ignore
 */
export function updateUI(schedule, classContainer, ignore = {}) {
    // debugger;
    const allCourses = schedule.getCourses();
    const waitlistedCourses = schedule.getWaitlistedCourses();
    const coursesDOM = Array.from(classContainer.querySelectorAll(".class"));



    const includeWaitlisted = schedule.getSetting("includewaitlistedcourses");


    // update waitlisted courses
    if (!ignore.waitlisted) {
        for (const course of waitlistedCourses) {


            const courseDiv = coursesDOM.find(e => e.id == course.id);
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
        const courseDiv = coursesDOM.find(e => e.id === course.id);



        const optionCheckboxes = Array.from(courseDiv.querySelectorAll('.courseOption input[type="checkbox"]'));
        const courseIncluded = course.getSetting("includecourse");
        const courseOverwrites = Settings.CourseSettingOverwrites;

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