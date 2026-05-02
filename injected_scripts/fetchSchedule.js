// this is injected into the webpage, therefore is utilizing the webpage's DOM, not the extension's.
// regular expressions to match the start and end times and the start and end dates.

(() => {
  const timeRegex12 = /\d{2}:\d{2}\s{2}(?:AM|PM)\s*-\s*\d{2}:\d{2}\s{2}(?:AM|PM)/;
  const timeRegex24 = /\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/;
  const header = document.querySelector('h1').textContent;

  /**
   * Finds the indices at which a substring is in a string
   * @param {string} str The string to search in
   * @param {string} sub The substring to search for
   * @returns An array of indices at which the substring appears. An empty array is returned if the substring is not in the string.
   */
  function findAllIndices(str, sub) {
    if (!str.includes(sub)) return [];
    let indices = [];
    let index = str.indexOf(sub);

    while (index !== -1) {
      indices.push(index);
      index = str.indexOf(sub, index + sub.length);
    }

    return indices;
  }

  /**
   * Reports an error back to the extension. Keep in mind this code is being injected into the webpage
   * @param {ErrorEvent} e The error to report
   */
  function reportError(e) {
    chrome.runtime.sendMessage({
      error: {
        type: "inject-error",
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: { stack: e.error?.stack },
      },
      HTML: document.body.innerHTML,
    });
    window.removeEventListener("error", reportError);
  }
  window.addEventListener("error", reportError);
  const classes = Array.from(document.querySelectorAll(".listViewWrapper")); // i despise the ElementList type, so im converting it to Array
  const Schedule = [];

  if (classes.length === 0) {
    chrome.runtime.sendMessage("SCHEDULE FETCHING ATTEMPTED: NO CLASSES FOUND");
  }

  for (const _class of classes) {
    const rows = []; // holds all rows of class times and meetings
    const index = classes.indexOf(_class); // allows us to easily access course info using .querySelectorAll()
    const status = document.querySelectorAll(".list-view-status")[index].textContent.trim().toLowerCase();
    const isWaitlisted = status === "waitlisted";

    // example: 'Differential Calculus | Mathematics 1551 Section L01 | Class Begin: 08/18/2025 | Class End: 12/11/2025'
    const courseInfo = document.querySelectorAll(".list-view-course-info-div")[index].textContent;

    const courseCode = Array.from(document.querySelectorAll(`#table1 tr td[data-property=subjectCourseSectionNumber]`))?.[index]?.textContent?.trim()?.split(", ")?.[0] ?? "";

    const meetingInformationDiv = document.querySelectorAll(".listViewMeetingInformation")[index]

    // example: '08/18/2025 -- 12/11/2025   FridaySMTWTFS   03:30  PM - 04:20  PM Type: Class Location: Georgia Tech-Atlanta * Building: Skiles Room: 254'
    const meetingInformation = meetingInformationDiv.textContent;

    const [courseTitle, courseDesc, classBegin, classEnd] =
      courseInfo.split(" | ");

    const startColonIndex = classBegin.indexOf(":");
    const startDate = classBegin.substring(startColonIndex + 1).trim();

    const endColonIndex = classEnd.indexOf(":");
    const endDate = classEnd.substring(endColonIndex + 1).trim();


    // in meetingInformation, a new row is indicated by the start date; this will therefore the indices at which the start date appears
    const rowEndPoints = findAllIndices(meetingInformation, startDate);

    for (let i = 0; i < rowEndPoints.length; i++) {
      // this is responsible for slicing the string into different rows.
      // this will slice the meetingInformation string from index i to index i + 1. if index i + 1 does not exist, we have reached the last row.
      rows.push(
        meetingInformation.substring(rowEndPoints[i], rowEndPoints[i + 1])
      );
    }

    const courseSection = document.querySelectorAll(".list-view-subj-course-section")[index].textContent.toLowerCase();

    const section = courseSection
      .substring(courseSection.indexOf("section"))
      .replace("section ", "")
      .trim();


    const professorInformation = document.querySelectorAll(".listViewInstructorInformation")[index];
    const parsableProfessors = Array.from(professorInformation.querySelectorAll(".email"));

    const prof = [];
    if (parsableProfessors.length === 0) {
      prof.push("No professor");
    } else {
      for (const elProf of parsableProfessors) {
        const [first, last] = elProf.textContent
          .trim()
          .split(", ")
          .reverse();
        prof.push(`${first} ${last}`);
      }
    }


    // console.log(`Course: ${courseTitle} Section: ${section.toUpperCase()}`);

    // day and time


    const times = meetingInformationDiv.querySelectorAll(".ui-pillbox+span");
    for (const row of rows) {
      // example row: '08/18/2025 -- 12/11/2025   FridaySMTWTFS   03:30  PM - 04:20  PM Type: Class Location: Georgia Tech-Atlanta * Building: Skiles Room: 254'

      const dayList = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      const days = dayList.filter((day) => row.includes(day)).join(",");


      const time = times?.[rows.indexOf(row)]?.textContent?.trim() ?? row.match(timeRegex12)?.[0] ?? row.match(timeRegex24)?.[0];
      if (!days || !time) {
        Schedule.push({
          courseTitle,
          displayName: courseTitle,
          courseCode,
          days: "ASYNCHRONOUS",
          time: "ASYNCHRONOUS",
          startDate,
          endDate,
          startTime: "ASYNCHRONOUS",
          endTime: "ASYNCHRONOUS",
          buildingName: "ASYNCHRONOUS",
          roomNumber: "ASYNCHRONOUS",
          section,
          prof,
          waitlisted: isWaitlisted
        })
        continue;
      }



      const timeSplit = time.split("-")
      const [startTime, endTime] = [timeSplit[0].trim(), timeSplit[1].trim()];

      // location
      // building name
      const buildingStringIndex = row.indexOf("Building");
      const toBuildingStr = row.substring(buildingStringIndex);
      const buildingName = toBuildingStr
        .substring(0, toBuildingStr.indexOf("Room"))
        .replace("Building: ", "")
        .trim();
      const roomNumber = toBuildingStr
        .substring(toBuildingStr.indexOf("Room"))
        .replace("Room: ", "")
        .trim();

      Schedule.push({
        courseTitle,
        displayName: courseTitle,
        courseCode,
        days,
        time,
        startDate,
        endDate,
        startTime,
        endTime,
        buildingName,
        roomNumber,
        section,
        prof,
        waitlisted: isWaitlisted,
      });

    }
  }

  // this allow the chrome extension to receive the Schedule. keep in mind that this function is being injected into the webpage
  // and is not being ran in respect to the chrome extension.

  chrome.runtime.sendMessage(Schedule);
})();
