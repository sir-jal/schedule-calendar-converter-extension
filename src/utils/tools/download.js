/**
 * Create a download for .ics file
 * @param {string} content String representation of the .ics file
 * @returns A blob URL
 */
export function createDownload(content) {
    // self explanatory
    const blob = new Blob([content], { type: "text/calendar;charset=utf8" });
    const url = URL.createObjectURL(blob);


    return url;
}