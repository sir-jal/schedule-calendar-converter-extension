import { Schedule } from "../../classes/index.js";
import { createDownload } from "../tools/download.js";
import { clearSessionStorage } from "../tools/storage.js";
import { delay, wait } from "../tools/timeRelatedUtils.js";

/**
 * Creates an export button
 * @param {Schedule} schedule The button exports a schedule's .ICS content, therefore a schedule is needed
 * @returns {HTMLDivElement} A div element containing the button with listeners already added
 */
export function createExportButton(schedule) {
    const container = document.createElement('div');
    const button = document.createElement("button");
    const isPopup = window.location.pathname.includes("pages/popup");

    container.classList.add("buttonContainer");

    button.textContent = "Export .ICS File";
    button.classList.add("exportScheduleButton");

    let flashing = false;

    button.addEventListener("click", async (e) => {
        const msgHTML = container.querySelector(".message.show.error");

        if (schedule.getIncludedCourses().length === 0) {
            if (!msgHTML) {
                // const isPopup = window.location.pathname.includes("pages/popup");
                const msgSize = "auto"; // isPopup ? "100%" : "auto";
                const msg = document.createElement('span');
                const msgContainer = document.createElement('div');

                msg.classList.add("message", "show", "error");
                msg.textContent = "At least one class must be included";
                msg.style.width = msgSize;

                msgContainer.append(msg);
                msgContainer.style.flex = "0 0 100%";
                msgContainer.style.display = "flex";
                msgContainer.style.justifyContent = "center";

                container.prepend(msgContainer);
            } else if (!flashing) {
                flashing = true;
                msgHTML.classList.toggle("flashing", true);
                await wait(1100);
                msgHTML.classList.toggle('flashing', false);
                flashing = false;
            }
            return;
        }
        const file = schedule.toICS();
        chrome.downloads.download({
            url: createDownload(file),
            filename: `schedule.ics`,
            saveAs: true,
        });
        if (isPopup) clearSessionStorage();
        if (msgHTML) msgHTML.parentElement.remove();
    })

    container.append(button);

    return container;


}