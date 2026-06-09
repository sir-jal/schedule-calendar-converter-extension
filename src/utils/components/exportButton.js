import { Schedule } from "../../classes/index.js";
import { createDownload } from "../tools/download.js";
import { clearSessionStorage } from "../tools/storage.js";

/**
 * Creates an export button
 * @param {Schedule} schedule The button exports a schedule's .ICS content, therefore a schedule is needed
 * @returns {HTMLDivElement} A div element containing the button with listeners already added
 */
export function createExportButton(schedule) {
    const container = document.createElement('div');
    const button = document.createElement("button");

    container.classList.add("buttonContainer");

    button.textContent = "Export .ICS File";
    button.classList.add("export");

    button.addEventListener("click", e => {
        const file = schedule.toICS();
        chrome.downloads.download({
            url: createDownload(file),
            filename: `schedule.ics`,
            saveAs: true,
        });
        clearSessionStorage();
    })

    container.append(button);

    return container;


}