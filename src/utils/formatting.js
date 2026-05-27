/**
 * Formats a date and time to .ics dates
 * @param {string} dateStr The string representing the date. Use the format MM/DD/YYYY.
 * @param {string} timeStr The string representing the time. Can be 12 hour or 24 hour time.
 * @param {boolean} justDate Whether the formatted string should include just the date.
 * @returns A formatted string in the appropriate .ics format
 */
export function formatDate(dateStr, timeStr, justDate) {
    const [month, day, year] = dateStr.split("/");
    // turn time to 24h time
    const [time, AMPM] = timeStr.split("  ");
    let [hour, minute] = time.split(":");

    if (AMPM) {
        if (AMPM === "PM" && hour !== "12") {
            hour = parseInt(hour) + 12; // add 12 to hour to convert to 24 hr time; example: 6 pm + 12 = 18:00
        }

        if (AMPM === "AM" && hour === "12") {
            hour = "00";
        }
    }
    return justDate ? `${year}${month}${day}` : `${year}${month}${day}T${hour.toString().padStart(2, "0")}${minute.toString().padStart(2, "0")}00`;
}

/**
 * Formats a string pf days of the week to .ics format.
 * 
 * EXAMPLE: Wednesdays -> WE, Fridays -> FR, etc
 * @param {string} days A string containing days of the week separated by commas
 * @returns A string with only the first 2 letters of each day capitalized, split by commas
 */
export function formatDays(days) {
    const split = days.split(",");
    for (let i = 0; i < split.length; i++) {
        const day = split[i];
        const correctFormat = day.substring(0, 2).toUpperCase();
        split[i] = correctFormat;
    }

    return split.join(",");
}
