// this is injected into the webpage, therefore is utilizing the webpage's DOM, not the extension's.


(async () => {
  function fixText(str) {
    return str
      .replaceAll("\n", "")
      .split(" ")
      .filter(e => e !== "")
      .join(" ");
  }
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
   * Reports an error back to the extension (keep in mind this code is being injected into the webpage)
   * @param {ErrorEvent} e The error to report
   */
  function reportError(e) {
    window.removeEventListener("error", reportError);
  }
  window.addEventListener("error", reportError);


  try {
    // regular expressions to match the start and end times and the start and end dates.
    const timeRegex12 = /\d{2}:\d{2}\s{2}(?:AM|PM)\s*-\s*\d{2}:\d{2}\s{2}(?:AM|PM)/;
    const timeRegex24 = /\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/;
    const classes = Array.from(document.querySelectorAll(".listViewWrapper"));
    const Schedule = [];


    if (classes.length === 0) {
      chrome.runtime.sendMessage({
        title: "NO_CLASS",
        body: "SCHEDULE FETCHING ATTEMPTED: NO CLASSES FOUND"
      });
    }

    const tableHeader = Array.from(document.querySelectorAll("#table1 thead .title")).map(e => fixText(e.textContent).toLowerCase());
    const tableRows = Array.from(document.querySelectorAll("#table1 tbody tr"));


    for (const _class of classes) {
      const rows = []; // holds all rows of class times and meetings
      const index = classes.indexOf(_class); // allows us to easily access course info using .querySelectorAll()
      const status = document.querySelectorAll(".list-view-status")[index].textContent.trim().toLowerCase();
      const isWaitlisted = status === "waitlisted";

      // example: 'Differential Calculus | Mathematics 1551 Section L01 | Class Begin: 08/18/2025 | Class End: 12/11/2025'
      const courseInfo = fixText(document.querySelectorAll(".list-view-course-info-div")[index].textContent);

      const meetingInformationDiv = document.querySelectorAll(".listViewMeetingInformation")[index]

      // example: '08/18/2025 -- 12/11/2025   FridaySMTWTFS   03:30  PM - 04:20  PM Type: Class Location: Georgia Tech-Atlanta * Building: Skiles Room: 254'
      const meetingInformation = fixText(meetingInformationDiv.textContent);

      const [courseTitle, courseDesc, classBegin, classEnd] =
        courseInfo.split(" | ");

      const startColonIndex = classBegin.indexOf(":");
      const startDate = classBegin.substring(startColonIndex + 1).trim();

      const endColonIndex = classEnd.indexOf(":");
      const endDate = classEnd.substring(endColonIndex + 1).trim();



      // example: ['Message: **Web Registered**', 'Hours: 3', 'Degree: Undergraduate Semester', 
      // 'Campus: Online - Atl US (Mand. Fees)', 'Schedule Type: Lecture', 'Instructional Method: Fully Distance 95% tech', 
      // 'Grade Mode: Letters I, A-F, W, WF']
      const crnInfo = document.querySelectorAll(".list-view-crn-info-div")[index].textContent.split(" | ");
      const crn = fixText(document.querySelectorAll(".listViewInstructorInformation .list-view-crn-schedule")[index].textContent)
      const importantTableData = tableRows.map(row => {
        const cells = row.querySelectorAll("td");

        const crn = tableHeader.indexOf("crn");
        const courseCode = tableHeader.indexOf("details");
        const title = tableHeader.indexOf("title");


        return {
          crn: fixText(cells[crn].textContent),
          courseCode: fixText(cells[courseCode].textContent).split(", ")[0],
          title: fixText(cells[title].textContent)
        }
      })

      const courseCode = importantTableData.find(e => e.crn === crn || e.title === courseTitle.trim()).courseCode;

      // in meetingInformation, a new row is indicated by the start date; 
      // this will therefore the indices at which the start date appears
      const rowEndPoints = findAllIndices(meetingInformation, startDate);

      for (let i = 0; i < rowEndPoints.length; i++) {
        // this is responsible for slicing the string into different rows.
        // this will slice the meetingInformation string from index i to index i + 1. if index i + 1 does not exist, we have reached the last row.
        rows.push(
          meetingInformation.substring(rowEndPoints[i], rowEndPoints[i + 1])
        );
      }

      const courseSection = fixText(
        document.querySelectorAll(".list-view-subj-course-section")[index].textContent.toLowerCase()
      )

      const section = courseSection
        .substring(courseSection.indexOf("section"))
        .replace("section ", "")
        .trim();


      const professorInformation = document.querySelectorAll(".listViewInstructorInformation")[index];
      const parsableProfessors = Array.from(professorInformation.querySelectorAll(".email"));

      const prof = [];
      if (parsableProfessors.length === 0) {
        prof.push("No professor found");
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
      for (let row of rows) {
        row = row
          .replaceAll("\n", "")
          .split(" ")
          .filter(e => e !== "")
          .join(" ");
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


        let time = times?.[rows.indexOf(row)]?.textContent?.trim() ?? row.match(timeRegex12)?.[0] ?? row.match(timeRegex24)?.[0];

        time = time
          .replaceAll("\n", "")
          .split(" ")
          .filter(e => e !== "")
          .join(" ");

        const timeSplit = time?.split("-")
        const [startTime, endTime] = [timeSplit?.[0]?.trim(), timeSplit?.[1]?.trim()];

        // location
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

    chrome.runtime.sendMessage({
      title: "PARSED_SCHEDULE",
      body: Schedule
    });
  } catch (e) {
    console.error(e);
  }


  // this allow the chrome extension to receive the Schedule. keep in mind that this function is being injected into the webpage
  // and is not being ran in respect to the chrome extension.
})();
