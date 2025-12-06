// this is injected into the webpage, therefore is utilizing the webpage's DOM, not the extension's.
// regular expressions to match the start and end times and the start and end dates.

(() => {
  const timeRegex = /\d{2}:\d{2}\s{2}(?:AM|PM)\s*-\s*\d{2}:\d{2}\s{2}(?:AM|PM)/;
  const dateRegex = /(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}/g;

  function findAllIndices(str, sub) {
    // find all indices where a substring occurs in a string
    let indices = [];
    let index = str.indexOf(sub);

    while (index !== -1) {
      indices.push(index);
      index = str.indexOf(sub, index + sub.length);
    }

    return indices;
  }

  function reportError(e) {
    chrome.runtime.sendMessage({
      type: "inject-error",
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      error: { stack: e.error?.stack },
    });
    window.removeEventListener("error", reportError);
  }

  window.addEventListener("error", reportError);
  const classes = Array.from(document.querySelectorAll(".listViewWrapper")); // i despise the ElementList type, so im converting it to Array
  const Schedule = [];
  console.log("hi");

  for (const _class of classes) {
    const rows = []; // holds all rows of class times and meetings
    const index = classes.indexOf(_class); // allows us to easily access course info
    const status = document
      .querySelectorAll(".list-view-status")
      [index].textContent.trim()
      .toLowerCase();
    const isWaitlisted = status === "waitlisted";
    // course info
    const courseInfo = document.querySelectorAll(".list-view-course-info-div")[
      index
    ].textContent; // example: 'Differential Calculus | Mathematics 1551 Section L01 | Class Begin: 08/18/2025 | Class End: 12/11/2025'

    const meetingInformation = document.querySelectorAll(
      ".listViewMeetingInformation"
    )[index].textContent; // example: '08/18/2025 -- 12/11/2025   FridaySMTWTFS   03:30  PM - 04:20  PM Type: Class Location: Georgia Tech-Atlanta * Building: Skiles Room: 254'

    const [courseTitle, courseDesc, classBegin, classEnd] =
      courseInfo.split(" | ");

    const startDate = classBegin.match(dateRegex).join();

    const rowEndPoints = findAllIndices(meetingInformation, startDate); // since in meetingInformation, a new row is indicated each time the start date appears, this will tell us at which indices do these rows begin/end.
    console.log("Endpoints", rowEndPoints);
    for (let i = 0; i < rowEndPoints.length; i++) {
      // this is responsible for slicing the string into different rows.
      // this will slice the meetingInformation string from index i to index i + 1. if index i + 1 does not exist, we have reached
      // the last row.
      rows.push(
        meetingInformation.substring(rowEndPoints[i], rowEndPoints[i + 1])
      );
    }

    // if (courseTitle == "Integral Calculus") {

    //   console.log(meetingInformation)
    //   console.log('integral calculus')

    //   const firstRow = meetingInformation.indexOf(startDate) // 0
    //   const secondRow = meetingInformation.indexOf(startDate, 1)
    //   console.log('indices', firstRow, secondRow)
    //   console.log(meetingInformation.substring(firstRow, secondRow))
    //   console.log(meetingInformation.substring(secondRow))
    // }
    const courseSection = document
      .querySelectorAll(".list-view-subj-course-section")
      [index].textContent.toLowerCase();
    console.log("course section");
    const section = courseSection
      .substring(courseSection.indexOf("section"))
      .replace("section ", "")
      .trim();

    console.log(section);
    // console.log(`Course: ${courseTitle} Section: ${section.toUpperCase()}`);

    // day and time

    console.log("loop start");
    console.log("rows", rows);
    for (const row of rows) {
      // example row: '08/18/2025 -- 12/11/2025   FridaySMTWTFS   03:30  PM - 04:20  PM Type: Class Location: Georgia Tech-Atlanta * Building: Skiles Room: 254'
      console.log(row);
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
      if (!days) continue;
      const time = row.match(timeRegex)[0];

      console.log("checkpoint 1");
      console.log(days);
      // this is usually only the case for online ASYNCHRONOUS classes.

      const [startTime, endTime] = time.split(" - ");

      // location
      // building name
      const buildingStringIndex = row.indexOf("Building");
      const buildingAndRoom = row.substring(buildingStringIndex);
      const buildingName = buildingAndRoom
        .substring(0, buildingAndRoom.indexOf("Room"))
        .replace("Building: ", "")
        .trim();
      const roomNumber = buildingAndRoom
        .substring(buildingAndRoom.indexOf("Room"))
        .replace("Room: ", "")
        .trim();
      console.log("checkpoint 2");
      Schedule.push({
        courseTitle: `${isWaitlisted ? "(WAITLISTED) " : ""}` + courseTitle,
        days,
        time,
        startDate: classBegin.match(dateRegex).join(),
        endDate: classEnd.match(dateRegex).join(),
        startTime,
        endTime,
        buildingName,
        roomNumber,
        section,
      });
      console.log("final checkpoint");
    }
  }
  console.log("loop end");
  // this allow the chrome extension to receive the Schedule. keep in mind that this function is being injected into the webpage
  // and is not being ran in respect to the chrome extension.
  console.log(Schedule);
  chrome.runtime.sendMessage(Schedule);
})();
