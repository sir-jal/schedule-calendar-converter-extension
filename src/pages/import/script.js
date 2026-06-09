"use strict";

import { Schedule } from "../../classes/index.js";
import { readIcs } from "../../utils/tools/ics.js";
import { addSettingListener, renderSchedule, updateCourseSetting, updateUI } from "../../scripts/shared/index.js";
import { wait } from "../../utils/tools/timeRelatedUtils.js";
import { createExportButton } from "../../utils/components/exportButton.js";
import { createBulkSettings } from "../../utils/components/bulkSettings.js";
import { createScheduleSettings } from "../../utils/components/scheduleSettings.js";

(() => {

    let schedule = new Schedule();
    const inputFileButton = document.querySelector("#importFile");

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

            schedule = readIcs(content);


            const scheduleElement = renderSchedule(schedule);

            await wait(1000);

            scheduleElement.append(
                createScheduleSettings(schedule),
                createBulkSettings(schedule, scheduleElement),
                createExportButton(schedule)
            )
            document.querySelector(".main").append(
                scheduleElement,
            );

            document.querySelector(".fileInputContainer").style.display = "none";
            addSettingListener(schedule);


        }

        reader.readAsText(file);
    });

    window.addEventListener('beforeunload', e => {
        if (schedule.length > 0) e.preventDefault();
    })
})()