import { Schedule } from "../../classes/index.js";
import { createDownload } from "../tools/download.js";
import { clearSessionStorage } from "../tools/storage.js";
import { delay, wait } from "../tools/timeRelatedUtils.js";
import { ExtensionSettingsManager } from "../tools/config.js";

/**
 * Creates an export button
 * @param {Schedule} schedule The button exports a schedule's .ICS content, therefore a schedule is needed
 * @returns {HTMLDivElement} A div element containing the button with listeners already added
*/
export function createExportButton(schedule) {

    const preventDefaultEvent = new CustomEvent("endPreventDefault");
    const isPopup = window.location.pathname.includes("pages/popup");

    const container = document.createElement('div');
    container.classList.add("buttonContainer");

    let flashing = false;

    const flashError = async (msgHTML) => {
        flashing = true;
        msgHTML.classList.toggle("flashing", true);
        await wait(1100);
        msgHTML.classList.toggle('flashing', false);
        flashing = false;
    }

    const createError = (leMsg) => {
        const msgHTML = container.querySelector(".message.show.error");
        if (msgHTML) {
            if (msgHTML.textContent === leMsg) {
                if (!flashing) flashError(msgHTML);
            } else {
                msgHTML.textContent = leMsg;
            }

            return
        }

        const msgSize = "auto"; // isPopup ? "100%" : "auto";
        const msg = document.createElement('span');
        const msgContainer = document.createElement('div');

        msg.classList.add("message", "show", "error");
        msg.textContent = leMsg;
        msg.style.width = msgSize;

        msgContainer.append(msg);
        msgContainer.style.flex = "0 0 100%";
        msgContainer.style.display = "flex";
        msgContainer.style.justifyContent = "center";

        container.prepend(msgContainer);
    }

    const removeError = () => {
        const msgHTML = container.querySelector(".message.show.error");
        if (msgHTML) msgHTML.parentElement.remove();
    }

    // export button
    const exportICSButton = document.createElement("button");
    exportICSButton.textContent = "Export ICS";
    exportICSButton.classList.add("exportScheduleButton");



    exportICSButton.addEventListener("click", async (e) => {

        const file = await schedule.toICS();
        if (file === "PARSING ERROR") {
            createError("The extension could not parse your dates. Check your extension settings to verify that the extension is using the right date format.")
            return;
        }
        if (file === "ONE_CLASS_ERROR") {
            createError("At least one class must be included");
            return;
        }
        const downloadId = await chrome.downloads.download({
            url: createDownload(file),
            filename: `schedule.ics`,
            saveAs: true,
        });
        removeError();


    })


    // export json
    const exportJSONButton = document.createElement("button");
    exportJSONButton.textContent = "Export JSON";
    exportJSONButton.classList.add("exportJsonButton");

    exportJSONButton.addEventListener("click", async e => {
        const jsonToString = JSON.stringify(schedule.toJSON(), null, 2);
        const download = createDownload(jsonToString, "application/json");

        const downloadId = chrome.downloads.download({
            url: download,
            filename: "schedule.json",
            saveAs: true
        });

        removeError();
    })

    chrome.downloads.onChanged.addListener(d => {
        if (d.state?.current === "complete") {
            if (isPopup) clearSessionStorage();
        }
    })

    container.append(exportICSButton, exportJSONButton);

    return container;


}