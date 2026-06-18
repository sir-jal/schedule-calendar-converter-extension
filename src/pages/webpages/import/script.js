"use strict";

import { Schedule, Course } from "../../../classes/index.js";
import { readIcs } from "../../../utils/tools/ics.js";
import { addSettingListener, renderSchedule, updateCourseSetting, updateUI } from "../../../scripts/shared/index.js";
import { wait } from "../../../utils/tools/timeRelatedUtils.js";
import { createExportButton } from "../../../utils/components/exportButton.js";
import { createBulkSettings } from "../../../utils/components/bulkSettings.js";
import { createScheduleSettings } from "../../../utils/components/scheduleSettings.js";

(async () => {

    let preventDefault = false;

    const link = window.location.href;
    const extensionDirect = link.includes("extensionDirect=true");

    let schedule = new Schedule();

    const schedulesContainer = document.createElement('div');
    schedulesContainer.classList.add("schedules");

    const inputFileButton = document.querySelector("#importFile");

    if (extensionDirect) {
        const leSchedule = (await chrome.storage.session.get(["scheduleToImport"]));

        if (leSchedule && leSchedule.scheduleToImport) {

            schedule = Schedule.fromJSON(leSchedule.scheduleToImport);

            loadClasses();

            await chrome.storage.session.remove("scheduleToImport");
        }


    }

    inputFileButton.addEventListener("click", async () => {
        const fileInput = document.querySelector("#icsfileinput");
        const msg = document.querySelector('#fileInputMessage');

        const file = fileInput.files.item(0)
        const fileType = file?.type;

        if (!file) {
            msg.classList.toggle('show', true);
            msg.textContent = "You have not provided a file.";
            return;
        }
        if (fileType !== "text/calendar") {
            msg.classList.toggle('show', true);
            msg.textContent = "The file you provided is not an .ics file.";
            return;
        }
        const reader = new FileReader();

        reader.onload = async (event) => {
            msg.classList.toggle("show", false);
            const content = event.target.result;
            const lowercase = content.toLowerCase();


            if (lowercase.includes("sir jal//calendar extension")) {
                if (!lowercase.includes("importable")) {
                    msg.textContent = "The .ics file you provided was exported using a version older than 2.0.0. You will have to export a new file. Ensure you are updated to the latest version.";
                    msg.classList.toggle('show', true);
                    return;
                }
            } else {
                if (lowercase.trim().length === 0) {
                    msg.textContent = "The .ics file you provided is empty.";
                } else {
                    msg.textContent = "The .ics file you provided wasn't created by this extension."
                }
                msg.classList.toggle("show", true);
                return;
            }
            inputFileButton.disabled = true;

            await wait(1000);
            loadClasses(content);




        }

        reader.readAsText(file);
    });


    document.addEventListener("course-change", e => {
        if (schedule.findCourseById(e.detail.course.id)) {
            preventDefault = true;
        }
    });

    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("exportScheduleButton")) {
            preventDefault = false;
        }
    })

    window.addEventListener('beforeunload', e => {
        if (preventDefault) e.preventDefault();
    })

    async function loadClasses(content = "") {

        if (schedule.length === 0) schedule = readIcs(content);

        // let course1 = Course.fromJSON(schedule.at(0).toJSON());
        // let course2 = Course.fromJSON(schedule.at(1).toJSON());
        // let course3 = Course.fromJSON(schedule.at(2).toJSON());
        // course1.id = "CTEST1"
        // course2.id = "CTEST2";
        // course3.id = "CTEST3";

        // let schedule2 = new Schedule(course1, course2, course3);


        const scheduleElement = renderSchedule(schedule, false);
        // const scheduleElement2 = renderSchedule(schedule2);

        if (schedule.length !== 0)

            scheduleElement.append(
                createScheduleSettings(schedule),
                createBulkSettings(schedule, scheduleElement),
                createExportButton(schedule)
            )
        // scheduleElement2.append(
        //     createScheduleSettings(schedule2),
        //     createBulkSettings(schedule2, scheduleElement2),
        //     createExportButton(schedule2)
        // )
        schedulesContainer.append(scheduleElement) //, scheduleElement2);
        document.querySelector(".main").append(
            schedulesContainer
        );

        document.querySelector(".fileInputContainer").style.display = "none";
        addSettingListener(schedule);
    }
})()