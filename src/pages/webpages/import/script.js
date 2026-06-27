"use strict";

import { Schedule, Course } from "../../../classes/index.js";
import { readIcs } from "../../../utils/tools/ics.js";
import { addSettingListener, renderSchedule, updateCourseSetting, updateUI } from "../../../scripts/shared/index.js";
import { wait } from "../../../utils/tools/timeRelatedUtils.js";
import { createExportButton } from "../../../utils/components/exportButton.js";
import { createBulkSettings } from "../../../utils/components/bulkSettings.js";
import { createScheduleSettings } from "../../../utils/components/scheduleSettings.js";

(async () => {

    const msg = document.querySelector('#fileInputMessage');

    const fileInput = document.querySelector("#icsfileinput");

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

            preventDefault = true;

            chrome.storage.session.remove("scheduleToImport");
        } else {
            window.location.href = chrome.runtime.getURL("src/pages/webpages/import/index.html");
        }


    }

    inputFileButton.addEventListener("click", async () => {

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
            clearFileInput();
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
                    clearFileInput();
                    return;
                }
            } else {
                if (lowercase.trim().length === 0) {
                    msg.textContent = "The .ics file you provided is empty.";
                } else {
                    msg.textContent = "The .ics file you provided wasn't created by this extension."
                }
                clearFileInput();
                msg.classList.toggle("show", true);
                return;
            }

            loadClasses(content);




        }

        reader.readAsText(file);
    });

    window.addEventListener('beforeunload', async e => {
        if (preventDefault) e.preventDefault();
    })

    document.addEventListener('dragover', e => {
        e.preventDefault();
    })
    document.addEventListener("drop", e => {
        e.preventDefault();

        if (schedule.length !== 0) return;

        const dt = new DataTransfer();
        const item = e.dataTransfer.files.item(0);
        if (item.type !== "text/calendar") return;

        dt.items.add(item);

        fileInput.files = dt.files;
    })

    fileInput.addEventListener('change', e => {
        const leFiles = fileInput.files;

        if (leFiles.length > 0) {
            const item = leFiles.item(0);
            if (item.type !== "text/calendar") {
                clearFileInput();
            }
        }
    })


    async function clearFileInput() {
        fileInput.files = new DataTransfer().files;

    }


    async function loadClasses(content = "") {
        inputFileButton.disabled = true;

        if (schedule.length === 0) schedule = readIcs(content);


        if (!extensionDirect) await wait(1000);

        // let course1 = Course.fromJSON(schedule.at(0).toJSON());
        // let course2 = Course.fromJSON(schedule.at(1).toJSON());
        // let course3 = Course.fromJSON(schedule.at(2).toJSON());
        // course1.id = "CTEST1"
        // course2.id = "CTEST2";
        // course3.id = "CTEST3";

        // let schedule2 = new Schedule(course1, course2, course3);


        // checks to see if the schedule is still empty
        if (schedule.length === 0) {
            msg.textContent = "The .ics file you provided contained no valid events and resulted in an empty schedule. Try again."
            msg.classList.toggle("error", true);
            msg.classList.toggle("show", true);
            inputFileButton.disabled = false;
            clearFileInput();
            return;
        }



        const scheduleElement = renderSchedule(schedule, false);
        // const scheduleElement2 = renderSchedule(schedule2);


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


        await wait(1000);

        document.addEventListener("course-change", e => {
            if (schedule.findCourseById(e.detail.course.id) && !preventDefault) {
                preventDefault = true;
            }
        });

        document.addEventListener("click", (e) => {
            if (e.target.classList.contains("exportScheduleButton") && preventDefault) {
                preventDefault = false;
            }
        })
    }
})()