/**
   * Creates an .ics event for a class
   * @param {object} course The course
   * @param {number} courseIndex The index at which the course is located; will be used for settings
   * @param {object} settings The per-class and general settings
   * @returns A string representation of the created .ics event
   */
export function buildICSEvent(
    course,
    courseIndex,
    settings
) {

    // figure out settings
    const includeCourseCode = settings['includecoursecode'][courseIndex];
    const includeProfName = settings[`includeprofessornames`][courseIndex];
    const includeSection = settings[`includesection`][courseIndex];
    const includeLocation = settings[`includeclasslocation`][courseIndex];
    const onlyPrimaryProfessor =
        includeProfName && settings["onlyincludeprimaryprofessor"][courseIndex];
    const asynchronous = course.days === "ASYNCHRONOUS";

    const uid = crypto.randomUUID();

    const dayFormat = formatDays(course.days);
    course.location =
        course.buildingName !== "None" &&
            course.roomNumber !== "None" &&
            course.buildingName !== "NA" &&
            course.roomNumber !== "NA" &&
            course.buildingName !== "Online" &&
            course.roomNumber !== "Online" && !asynchronous
            ? `${course.buildingName}\\, Room ${course.roomNumber}`
            : "No location found";


    const [endDateObj, startDateObj] = [new Date(course.endDate), new Date(course.startDate)];

    // this is used to offset the days from the start date of the class. 
    // otherwise, every class will appear on the start date in iCloud maps.
    const indices = {
        SU: 0,
        MO: 1,
        TU: 2,
        WE: 3,
        TH: 4,
        FR: 5,
        SA: 6,
    };


    const today = new Date();
    const chosenColor = colors.pop();

    let lines;

    if (asynchronous) {
        lines = [
            `BEGIN:VEVENT`,
            `UID:${uid}`,
            `DTSTAMP:${today.toISOString().replace(/[-:]/g, "").split(".")[0]}`,
            `COLOR:${chosenColor}`,
            `SUMMARY:${course.waitlisted ? "[WL] " : ""}${includeCourseCode ? `${course.courseCode}: ` : ""}${course.displayName}` +
            (includeSection ? `(${course.section.toUpperCase()})` : ""),
            `DESCRIPTION:${includeProfName
                ? `No meeting time; asynchronous\\nProfessor(s): ${onlyPrimaryProfessor ? course.prof[0] : course.prof.join(", ")}`
                : "No meeting time; asynchronous"
            }`,
            //
            `DTSTART:${formatDate(
                `${(startDateObj.getMonth() + 1).toString().padStart(2, "0")}/${startDateObj.getDate().toString().padStart(2, "0")}/${startDateObj.getFullYear()}`,
                "12:00  AM", true)}`,
            //
            `DTEND:${formatDate(
                `${(startDateObj.getMonth() + 1).toString().padStart(2, "0")}/${(startDateObj.getDate() + 1).toString().padStart(2, "0")}/${startDateObj.getFullYear()}`,
                "12:00  AM", true)}`,
        ];
    } else {
        const difference = indices[dayFormat.split(",")[0]] - startDateObj.getDay();
        startDateObj.setDate(startDateObj.getDate() + difference);
        lines = [
            `BEGIN:VEVENT`,
            `UID:${uid}`,
            `DTSTAMP:${today.toISOString().replace(/[-:]/g, "").split(".")[0]}`,
            `COLOR:${chosenColor}`,
            `SUMMARY:${course.waitlisted ? "[WL] " : ""}${includeCourseCode ? `${course.courseCode}: ` : ""}${course.displayName}` +
            (includeSection ? ` (${course.section.toUpperCase()})` : ""),
            `DESCRIPTION:${includeProfName
                ? `Professor(s): ${onlyPrimaryProfessor ? course.prof[0] : course.prof.join(", ")}`
                : ""
            }`,
            `DTSTART:${formatDate(
                `${(startDateObj.getMonth() + 1).toString().padStart(2, "0")}/${startDateObj.getDate().toString().padStart(2, "0")}/${startDateObj.getFullYear()}`,
                course.startTime
            )}`,
            `DTEND:${formatDate(
                `${(startDateObj.getMonth() + 1).toString().padStart(2, "0")}/${startDateObj.getDate().toString().padStart(2, "0")}/${startDateObj.getFullYear()}`,
                course.endTime
            )}`,
            `RRULE:FREQ=WEEKLY;BYDAY=${dayFormat};UNTIL=${endDateObj.getFullYear()}${(endDateObj.getMonth() + 1).toString().padStart(2, "0")}${endDateObj.getDate().toString().padStart(2, "0")}T235959`,
            `LOCATION:` + (includeLocation ? `${course.location}` : ""),
        ];
    }

    // adding non-ics-related information to make importing easier
    lines.push(`courseTitle:${course.courseTitle}`, `displayName:${course.displayName}`, `prof:${course.prof.join(", ")}`, `days:${course.days}`, `startDate:${course.startDate}`, `endDate:${course.endDate}`, `startTime:${course.startTime}`, `endTime:${course.endTime}`, `section:${course.section}`, `buildingName:${course.buildingName}`, `roomNumber:${course.roomNumber}`, `waitlisted:${course.waitlisted}`, `courseCode:${course.courseCode}`, "END:VEVENT");


    return lines.join("\r\n");
}

/**
 * Creates an .ics file
 * @param {string[]} events Array of events
 * @returns A string representation of the .ics file
 */
export function buildICSFile(events) {
    return `BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nPRODID:-//Sir Jal//Calendar Extension importable//EN\n${events.join(
        "\n"
    )}\nEND:VCALENDAR`
        .split("\n")
        .join("\r\n");
}