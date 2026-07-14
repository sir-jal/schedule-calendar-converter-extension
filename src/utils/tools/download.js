/**
 * Create a download
 * @param {string} content The content to create a download for
 * @param {string} [type="text/calendar;charset=utf8"] The file type
 * @returns {string} The blob url for the download
 */
export function createDownload(content, type = "text/calendar;charset=utf8") {
    // self explanatory
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);


    return url;
}