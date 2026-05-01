(() => {
  // DEFINING GLOBAL VARIABLES

  const version = document.querySelector("#versionNumber");

  const inputFileContainer = document.querySelector(".fileInputContainer");
  const inputFileButton = document.querySelector("#importFile");

  const resetPopUpButton = document.querySelector("#refreshPopup");
  const popUpButtonIcon = document.querySelector("#refreshPopup i");

  resetPopUpButton.addEventListener('click', resetPopup);

  const schoolName = document.querySelector("#school-name");
  const schoolSection = document.querySelector(".school-search");

  const settings = {};
  const docLink =
    "https://docs.google.com/document/d/1f6nR1gs8f4Ddj9vVLVmsOS5gwGHIQla28Q6va0HvfN0/edit?usp=sharing";
  const errorLog = [];

  const stepsButton = document.querySelector("#stepsButton");
  const stepsPopup = document.querySelector("#stepsPopup");

  const validateText = document.querySelector("p#validation");

  const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 3; // 3 days
  const actionHistory = [] // may help with replicating errors and debugging
  const colors = ["green", "blue", "yellow", "aqua", "red", "orange", "teal", "purple", "brown", "beige", "white", "bisque", "maroon", "magenta"];
  const keysToEditName = ["e", "f2"];
  const waitlistedCourses = [];

  const correctSitePageContainer = document.querySelector("#onWebsitePage");
  const wrongSitePageContainer = document.querySelector("#notOnWebsitePage");

  let injection_error = false;
  let step = 1;
  let links = {};
  let changingLocal = false;
  let editingName = false;
  let popupOpen = false;
  let revertingChanges = false;







  // FUNCTIONS







  /**
   * Changes the current step. This directly affects the steps popup.
   * @param {number} num The step number to change to
   */
  function changeStep(num) {
    const steps = document.querySelectorAll(".step");
    const maxSteps = steps.length;
    if (maxSteps < num) return;

    const curStep = document.querySelector(`#step${step}`);
    curStep.classList.remove("current");

    const curSubList = document.querySelector(`#step${step}sublist`);
    if (curSubList) curSubList.classList.remove('current');

    step = num;

    const nextSubList = document.querySelector(`#step${step}sublist`);
    if (nextSubList) nextSubList.classList.add('current');

    for (let i = 1; i < num; i++) {
      const leStep = document.querySelector(`#step${i}`);
      const leSubList = document.querySelector(`#step${i}sublist`);

      leStep.classList.add("past");
      if (leSubList) leSubList.classList.add('past');
    }
    document.querySelector(`#step${step}`).classList.add("current");
  }

  /**
   * Handles errors and prevents the extension from crashing
   * @param {Error} e The error
   * @param {string} type The type of error
   * @param {boolean} extensionError Whether or not the error was caused by the extension itself or by an injected script
   */
  function handleError(e, type, extensionError = true) {
    let text;
    const errorType = extensionError ? "extension-error" : "injection-error";

    if (type === "error") {
      text = `Type: ${errorType}\n\n\n${e.message}\n\nFile Name: ${e.filename}\nLine Number: ${e.lineno}\nColumn Number: ${e.colno}\n\n${e.error?.stack}`;
    } else {
      if (e.reason.stack.toLowerCase().includes("file")) {
        validateText.textContent =
          "Invalid file name; please double check and try again";
        return;
      }
      text = `UNHANDLED REJECTION:\n\nType: ${errorType}\n\n${e.reason.stack}`;
    }

    errorLog.push(text);

    const blob = new Blob(
      [errorLog.join(`\n\n\n\n${"-".repeat(100)}\n\n\n\n`) + `\n\n\n\nUser Action History:\n\n${actionHistory.map((e, i) => { return `${i + 1}. ${e}` }).join('\n')}`],
      {
        type: "text/plain",
      }
    );

    const url = URL.createObjectURL(blob);

    importScheduleButton.toggleAttribute("disabled", true);
    importScheduleButton.textContent = "Error";

    message.classList.add("error", "show");
    message.innerHTML = `Uh oh! I ran into ${errorLog.length} error(s)! I do apologize for this.<br><br>Below is a log file that has been generated for you to download. If you would like to report this error (highly recommended), please do so in the Help & Feedback Hub (Click 'Help & Feedback' at the bottom to access). This would massively help the developer improve the extension to ensure it works for everyone, assuming you're using Banner.<br><br><a href=${url} download="errorlog.txt">Download Error Log</a`;
  }

  /**
   * Updates the cache and returns it
   * @returns The updated cache
   */
  async function updateCache() {
    const e = await chrome.storage?.local?.get(["lastUpdated"]);
    const lastUpdated = new Date(e?.lastUpdated ?? 0).getTime();
    changingLocal = true;
    await wait(150);
    if (
      Object.keys(e).length === 0 ||
      lastUpdated + CACHE_MAX_AGE <= Date.now()
    ) {
      await chrome.storage?.local?.set({
        info: await getJSON(
          "https://sir-jal.github.io/schedule-calendar-converter-extension/extension_info.json"
        ),
        lastUpdated: Date.now(),
      });

    }

    changingLocal = false;
    return await chrome.storage?.local?.get(["info"]);
  }

  /**
   * Fetches the current tab the user is on
   * @returns The current tab
   */
  async function getCurrentTab() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
  }

  /**
   * Fetches JSON data via API.
   * @param {string} fileName The name of the file or resource
   * @returns A json representation of the data fetched, null if no data is found
   */
  async function getJSON(fileName) {
    const request = await fetch(fileName);
    const json = await request.json();
    return json;
  }

  /**
   * Searches for a school using a search query. The function will search the schools not only by name but also buy aliases.
   * @param {string} query Search query
   * @returns an array of schools that matches the search query
   */
  function getSchools(query) {
    const schools = [];
    for (const school in links) {
      const aliases = links[school].aliases;
      if (
        school.toLowerCase().includes(query.toLowerCase()) ||
        aliases.some((e) => e.toLowerCase().includes(query.toLowerCase()))
      ) {
        schools.push(school);
      }
    }
    return schools;
  }

  /**
   * Creates an .ics event for a class
   * @param {object} course The course
   * @param {number} courseIndex The index at which the course is located; will be used for settings
   * @param {object} settings The per-class and general settings
   * @returns A string representation of an .ics event
   */
  function buildICSEvent(
    course,
    courseIndex,
    settings
  ) {

    console.log(course);
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

    // adding information to make importing easier
    lines.push(`courseTitle:${course.courseTitle}`, `displayName:${course.displayName}`, `prof:${course.prof.join(", ")}`, `days:${course.days}`, `startDate:${course.startDate}`, `endDate:${course.endDate}`, `startTime:${course.startTime}`, `endTime:${course.endTime}`, `section:${course.section}`, `buildingName:${course.buildingName}`, `roomNumber:${course.roomNumber}`, `waitlisted:${course.waitlisted}`, `courseCode:${course.courseCode}`, "END:VEVENT");

    console.log(course.startDate);

    return lines.join("\r\n");
  }

  /**
   * Creates an .ics file
   * @param {string[]} events Array of events
   * @returns A string representation of the .ics file
   */
  function buildICSFile(events) {
    return `BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nPRODID:-//Sir Jal//Calendar Extension importable//EN\n${events.join(
      "\n"
    )}\nEND:VCALENDAR`
      .split("\n")
      .join("\r\n");
  }

  /**
   * Create a download for .ics file
   * @param {string} content String representation of the .ics file
   * @returns A blob URL
   */
  function createDownload(content) {
    // self explanatory
    const blob = new Blob([content], { type: "text/calendar;charset=utf8" });
    const url = URL.createObjectURL(blob);


    return url;
  }

  /**
   * Pauses code for a certain amount of time
   * @param {number} time The amount of time, in miliseconds, to wait
   * @returns A promise that sets a timeout
   */
  async function wait(time) {
    return new Promise((res, rej) => {
      setTimeout(res, time);
    });
  }

  /**
   * Delays a function call
   * @param {number} time The amount of time, in miliseconds, to wait
   * @param {function} func The function to call after the delay
   * @param {*[]} args Arguments to pass into the function
   */
  function delay(time, func, ...args) {
    setTimeout(() => {
      func(args);
    }, time);
  }


  // formats date and time to YYYYMMDDTHHmmss format
  // assumes dateStr argument follows this format: MM/DD/YYYY

  /**
   * Formats a date and time to .ics dates
   * @param {string} dateStr The string representing the date. Use the format MM/DD/YYYY.
   * @param {string} timeStr The string representing the time. Can be 12 hour or 24 hour time.
   * @param {boolean} justDate Whether the formatted string should include just the date.
   * @returns A formatted string in the appropriate .ics format
   */
  function formatDate(dateStr, timeStr, justDate) {
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

  // formats days to .ics format. Wednesdays -> WE, Fridays -> FR

  /**
   * Formats a string pf days of the week to .ics format.
   * 
   * EXAMPLE: Wednesdays -> WE, Fridays -> FR, etc
   * @param {string} days A string containing days of the week separated by commas
   * @returns A string with only the first 2 letters of each day capitalized, split by commas
   */
  function formatDays(days) {
    const split = days.split(",");
    for (let i = 0; i < split.length; i++) {
      const day = split[i];
      const correctFormat = day.substring(0, 2).toUpperCase();
      split[i] = correctFormat;
    }

    return split.join(",");
  }

  /**
   * Change a setting
   * @param {string} setting The setting to modify
   * @param {number} index The index at which the setting will be modified. In other words, the class to modify the setting in. 
   * If this value is -1, the function will asume it is not a class setting.
   * @param {boolean} change The new value of the setting
   */
  function changeSetting(setting, index, change) {
    if (index !== -1) settings[setting][index] = change;
    else settings[setting] = change;
  }

  /**
   * Reads an imported .ics file and loads them up using loadClasses().
   * @param {string} text The .ics file (text) to read
   */
  async function readIcs(text = "") {

    const lines = text.split('\n');
    const firstEventStart = lines.findIndex(e => e.includes("BEGIN:VEVENT"));
    const lastEventEnd = lines.findLastIndex(e => e.includes("END:VEVENT"));
    let linesWithEvents = lines.slice(firstEventStart, lastEventEnd + 1);

    while (linesWithEvents.length > 0) {
      // event
      const eventStart = linesWithEvents.findIndex(e => e.includes("BEGIN:VEVENT"));
      const eventEnd = linesWithEvents.findIndex(e => e.includes("END:VEVENT"));
      const eventLines = linesWithEvents.slice(eventStart, eventEnd + 1);

      const parseableIndexStart = eventLines.findIndex(e => e.toLowerCase().includes("coursetitle"));
      const parseable = eventLines.slice(parseableIndexStart);

      console.log(parseableIndexStart)
      console.log(eventLines);
      const event = {};
      for (const line of parseable) {
        const firstColonIndex = line.indexOf(":");
        const property = line.substring(0, firstColonIndex);

        if (property === "END") break;

        let value = line.substring(firstColonIndex + 1);

        switch (property) {
          case "prof":
            value = value.trim().split(", ");
            break;
          case "waitlisted":
            value = value === "true" ? true : false;
            break;
        }
        event[property] = typeof value !== 'string' ? value : value.trim();

      }
      schedule = schedule === undefined ? [] : schedule;

      schedule.push(event);

      linesWithEvents = linesWithEvents.slice(eventEnd + 1);
      if (linesWithEvents.length <= 0) {
        break;
      }
    }

    inputFileButton.textContent = "Importing...";
    inputFileButton.disabled = true;
    importScheduleButton.disabled = true;
    await wait(1300);
    loadClasses(true);
  }

  /**
   * Loads the user's classes, whether via file import or script injection
   * @param {boolean} importing Whether or not the extension is importing a file. If false, this function will inject
   * fetchSchedule.js into the current user tab. 
   */
  async function loadClasses(importing = false) {
    const classesLoadedContainer = document.querySelector("#classLoadedContainer");
    const selectionContainer = document.querySelector("#selectionContainer");
    const selectAll = document.querySelector("#selectAll");
    const deselectAll = document.querySelector("#deselectAll");
    schoolSection.style.display = "none";

    selectAll.onclick = () => {
      console.log(settings);
      const selectBox = document.querySelector("#optionSelect");
      const value = selectBox.value;
      actionHistory.push(`User clicked on the Select All button with the Select Menu value: ${value}`);
      const index = optionsOverlap.indexOf(optionsOverlap.find(e => e[0] === value));



      for (let i = 0; i < schedule.length; i++) {
        if (schedule[i].days === "ASYNCHRONOUS") continue;
        if (schedule[i].waitlisted && !waitlistedCheckbox.checked) continue;
        changeSetting(value, i, true);
        document.querySelector(`#${value}${i}`).checked = true;

        if (index !== -1) optionsOverlap[index].forEach(e => {
          document.querySelector(`#${e}${i}`).disabled = false;
        })
      }
    };

    deselectAll.onclick = () => {
      const selectBox = document.querySelector("#optionSelect");
      const value = selectBox.value;
      actionHistory.push(`User clicked on the Deselect All button with the Select Menu value: ${value}`);
      const index = optionsOverlap.indexOf(optionsOverlap.find(e => e[0] === value));

      for (let i = 0; i < schedule.length; i++) {
        if (schedule[i].days === "ASYNCHRONOUS") continue;
        if (schedule[i].waitlisted && !waitlistedCheckbox.checked) continue;
        changeSetting(value, i, false);
        document.querySelector(`#${value}${i}`).checked = false;

        if (index !== -1) optionsOverlap[index].forEach(e => {
          document.querySelector(`#${e}${i}`).disabled = true;
        })
      }
    };

    // import classes into extension
    changeStep(4);
    importScheduleButton.textContent = "Fetching classes...";
    importScheduleButton.toggleAttribute("disabled", true);

    if (!importing) {
      const tab = await getCurrentTab();

      // injects function fetchSchedule into webpage
      chrome.scripting.executeScript({
        files: ["injected_scripts/fetchSchedule.js"],
        target: { tabId: tab.id },
      });

      await wait(1000); // 1 second delay
      if (injection_error) return;
    }
    message.classList.toggle('success', true);
    message.classList.toggle('error', false);
    message.classList.toggle("alert", false);

    inputFileContainer.style.display = "none";
    importScheduleButton.style.display = "";

    selectionContainer.style.display = "flex";

    classesLoadedContainer.style.display = "";

    resetPopUpButton.style.display = "";

    wrongSitePageContainer.style.display = "none";
    correctSitePageContainer.style.display = "";

    const classes = document.querySelector(".classes");
    classes.style.display = "flex";

    const waitlistedLabel = document.createElement("label");
    const waitlistedCheckbox = document.createElement("input");
    const waitlistedContainer = document.createElement("div");

    waitlistedCheckbox.type = "checkbox";
    waitlistedCheckbox.checked = true;
    waitlistedCheckbox.id = "includewaitlisted";

    waitlistedContainer.id = "waitlistedContainer";

    waitlistedLabel.textContent = "Include waitlisted courses";
    waitlistedLabel.setAttribute("for", "includewaitlisted");

    waitlistedContainer.classList.add("waitlistedContainer");
    waitlistedContainer.append(waitlistedCheckbox, waitlistedLabel);

    const courseOptions = [
      "Include course code",
      "Include professor names",
      "Only include primary professor",
      "Include section",
      "Include class location",
    ]; // options per class

    const convertToId = (str) => {
      return str.trim().replaceAll(" ", "").toLowerCase()
    };

    optionsOverlap.push([convertToId(courseOptions[1]), convertToId(courseOptions[2])]);

    courseOptions.forEach(
      (e) => (settings[convertToId(e)] = [])
    );
    const id = "includecourse";
    settings[id] = [];

    for (const course of schedule) {
      //
      //

      const {
        courseTitle,
        displayName,
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
        waitlisted,
        courseCode
      } = course;

      const asynchronous = days === "ASYNCHRONOUS";



      const index = schedule.indexOf(course);

      const clas = document.createElement("details");
      const summary = document.createElement("summary");
      const displayNameSpan = document.createElement("span");
      const courseCodeSpan = document.createElement("span");
      const checkbox = document.createElement("input");
      const options = document.createElement("div");
      const courseDetails = document.createElement("div");
      const br = document.createElement("br");

      const renameClass = (e, isKeyBoard = false) => {
        if (e.target.tagName !== "SPAN" && !isKeyBoard) return;
        if (editingName) return;
        actionHistory.push(`User double clicks Class #${index + 1} to rename it`);
        clas.open = true;

        const displayNameSpan = summary.querySelector('span.displayName');
        const courseCodeSpan = summary.querySelector("span.courseCode");
        const checkbox = summary.querySelector('input[type="checkbox"]')
        const text = document.createElement('input');

        text.type = "text";
        text.value = displayNameSpan.textContent;

        courseCodeSpan.replaceChildren(`${courseCode}: `, text);
        summary.replaceChildren(courseCodeSpan);
        text.focus();
        text.select();

        editingName = true;

        const handleSpaceBar = (e) => {
          if (e.key === " ") e.preventDefault();
        }


        const finalizeText = async (reset = false) => {
          const trimmed = text.value.trim()
          if (!reset && !/^\s*$/.test(text.value) && trimmed.toLowerCase() !== courseTitle.toLowerCase()) {
            actionHistory.push(`User renames Class #${index + 1} from ${displayNameSpan.textContent} to \`${trimmed}\``);
            displayNameSpan.textContent = trimmed;
          } else {
            actionHistory.push(`User resets Class #${index + 1}'s name from ${displayNameSpan.textContent} to \`${courseTitle}\``);
            displayNameSpan.textContent = courseTitle;
          }
          schedule[index].displayName = displayNameSpan.textContent;

          courseCodeSpan.replaceChildren(`${courseCode}: `, displayNameSpan);
          summary.replaceChildren(courseCodeSpan, checkbox);
          summary.removeEventListener('keyup', handleSpaceBar);


          editingName = false;

        }



        summary.addEventListener('keyup', handleSpaceBar);

        text.addEventListener('blur', () => {
          finalizeText()
        })
        text.addEventListener('keydown', async (e) => {
          if (!editingName) return;

          switch (e.key.toLowerCase()) {
            case "enter": {
              text.blur();
              e.preventDefault()
              break;
            }
          }

        })
      }

      summary.addEventListener('dblclick', renameClass)

      summary.addEventListener('keydown', async (e) => {
        if (keysToEditName.includes(e.key.toLowerCase())) {
          if (editingName) return;
          await wait(100);
          renameClass(e, true);
        }
      })

      if (asynchronous) clas.classList.add('notIncluded');



      checkbox.type = "checkbox";
      checkbox.checked = !asynchronous
      checkbox.id = id + index;

      const courseStr = `${displayName}`;

      displayNameSpan.classList.add("displayName");
      courseCodeSpan.classList.add("courseCode");
      displayNameSpan.textContent = courseStr;
      courseCodeSpan.textContent = `${courseCode}: `

      courseCodeSpan.append(displayNameSpan);
      summary.append(courseCodeSpan, checkbox);

      if (waitlisted) waitlistedCourses.push(checkbox.id);

      settings[id].push(checkbox.checked);

      clas.classList.add("class");
      options.classList.add("options");
      courseDetails.classList.add("classDetails");





      const hasLocation =
        buildingName !== "None" &&
        roomNumber !== "None" &&
        buildingName !== "NA" &&
        roomNumber !== "NA" &&
        buildingName !== "Online" &&
        roomNumber !== "Online" && !asynchronous;

      ;

      const infoObj = {
        asynchronous,
        waitlisted,
        "Course Code": courseCode,
        Section: section.toUpperCase(),
        Professors: prof.join(", "),
        "Class Active": `${startDate} - ${endDate}`,
        Days: days.replaceAll(",", ", "),
        Time: `${startTime} - ${endTime}`,
        Location: hasLocation ? `${buildingName} ${roomNumber}` : "No location found; likely online",

      }

      for (const [key, value] of Object.entries(infoObj)) {
        const div = document.createElement('div');
        const valueSpan = document.createElement('span');
        const keySpan = document.createElement('span');
        const b = document.createElement('b');

        if (key === "waitlisted") {
          if (!value) continue;
          div.append("This class is WAITLISTED. If included, this will be indicated by the prefix: [WL].");
          courseDetails.append(div);
          continue;
        } else if (key === "asynchronous") {
          if (!value) continue;
          div.append(`This class is likely asynchronous as the extension could not find a time/day. If you include this course in your .ics file, it will ONLY (1) create an all-day event on ${startDate}.`);
          courseDetails.append(div);
          continue;
        } else if (key === "Course Code") {
          if (!value) continue;
        }



        b.textContent = key + "";
        keySpan.append(b);
        valueSpan.textContent = value;

        div.append(keySpan, " ", valueSpan);
        courseDetails.append(div);
        if (key === "Class Active" && asynchronous) break;
      }

      // load in per-class options
      for (const option of courseOptions) {
        const id = option.trim().replaceAll(" ", "").toLowerCase();

        const optionElement = document.createElement("div");
        optionElement.classList.add("option");

        const label = document.createElement("label");
        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.checked = true;
        if (
          (option.includes("location") && (!hasLocation || asynchronous)) || (option.includes("professor") && prof[0] === "No professor")
        ) {
          checkbox.checked = false;
          checkbox.disabled = true;
        }
        if (option.includes('code') && !courseCode) {
          checkbox.disabled = true;
          checkbox.checked = false;
        }
        checkbox.name = id + index;
        checkbox.id = id + index;
        label.setAttribute("for", id + index);
        label.textContent = option;

        optionElement.append(checkbox, label);
        options.append(optionElement);

        settings[id].push(checkbox.checked);
      }

      clas.append(summary, br, courseDetails, options);
      classes.append(clas);
    }
    classes.append(waitlistedContainer);
    settings[waitlistedCheckbox.id] = waitlistedCheckbox.checked;


    message.textContent =
      "Classes successfully loaded. View the steps located at the bottom of the page to learn how to customize your .ics file.";

    message.classList.add("success", "show");


    importScheduleButton.textContent = "Export .ICS File";
    importScheduleButton.classList.add("export");
    importScheduleButton.toggleAttribute("disabled", false);
    actionHistory.push("User has imported schedule into extension");

    // const events = []; // contains all events (courses) for .ics file creation

    // for (const course of schedule) {
    //   const {
    //     courseTitle,
    //     days,
    //     time,
    //     startDate,
    //     endDate,
    //     startTime,
    //     endTime,
    //     buildingName,
    //     roomNumber,
    //     section,
    //   } = course;

    //   const event = buildICSEvent(
    //     courseTitle,
    //     buildingName,
    //     roomNumber,
    //     days,
    //     startDate,
    //     endDate,
    //     startTime,
    //     endTime,
    //     section
    //   );
    //   events.push(event);
    // }
    // // use events to build .ics file
    // const icsText = buildICSFile(events);
    // // creates "a" tag that links to the download
    // await createDownload(icsText, input.value || "schedule");

    // button.textContent = "Conversion Completed";

  }

  /**
   * Resets the extension's popup.
   */
  function resetPopup() {
    window.location.reload();
  }





  // PRELIMINARY








  // makes all "a" tags clickable via keyboard
  const aTags = Array.from(document.querySelectorAll('a'));

  for (const a of aTags) {
    a.addEventListener("keydown", (e) => {
      if (e.key === " ") {
        a.click();
      }
    })
  }


  // anti cache editing system

  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (revertingChanges) return;
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {

      if (!changingLocal) {
        if (key === "lastUpdated") {
          revertingChanges = true;
          chrome.storage.local.set({ "lastUpdated": oldValue });
          console.log(
            "CONSOLE CACHE CHANGE DETECTED - PLEASE DO NOT MODIFY THE CACHE. YOUR CHANGES HAVE BEEN REVERTED."
          );
        } else if (key === "info") {
          revertingChanges = true;
          chrome.storage.local.set({ "info": oldValue });
          console.log(
            "CONSOLE CACHE CHANGE DETECTED - PLEASE DO NOT MODIFY THE CACHE. YOUR CHANGES HAVE BEEN REVERTED."
          );
        } else {
          revertingChanges = true;
          await chrome.storage.local.remove(key);
          console.log(
            "LOCAL STORAGE CHANGE DETECTED - PLEASE DO NOT MODIFY LOCAL STORAGE. YOUR CHANGES HAVE BEEN REMOVED."
          );
        }
      }
      await wait(150);
    }

    revertingChanges = false;
  });

  // Display version information and update links for school searches (caching)
  window.addEventListener("load", async () => {
    const versionJson = await getJSON("../manifest.json");
    version.textContent = versionJson.version;

    const infoJson = await updateCache();
    links =
      infoJson.info?.banner_links ??
      (await getJSON(
        "https://sir-jal.github.io/schedule-calendar-converter-extension/extension_info.json"
      ));
  });

  // everything related to the steps pop up

  const closePopUp = async () => {
    stepsPopup.style.opacity = 0;
    await wait(140);
    popupOpen = false;
    stepsPopup.close();
  }

  document.querySelector('#closePopup').addEventListener('click', closePopUp)

  stepsButton.addEventListener("click", async () => {
    // so if a user is tabbing, it'll try to scroll to the next tabbable element which is NOT what i want to happen.
    // therefore, whatever the tabbed/focused element is will be blured to prevent the scroll.
    document.activeElement.blur();
    document.querySelector('#closePopup').focus();

    await wait(100);
    stepsPopup.showModal();

    const stepElement = document.querySelector(`#step${step}`);
    const stepTop = stepElement.offsetTop;
    const stepMargin = 10;

    stepsPopup.scroll({ top: 0 })
    // delay(400, () => { stepElement.scrollIntoView({ behavior: 'smooth' }) });
    delay(200, () => { stepsPopup.scroll({ top: stepTop - stepMargin, behavior: 'smooth' }) });
    stepsPopup.style.opacity = 1;

    await wait(200);

    popupOpen = true;
  });

  stepsPopup.style.opacity = 0;

  stepsPopup.onclick = async (e) => {
    const rect = stepsPopup.getBoundingClientRect();
    const clickedOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;

    if (clickedOutside) {
      closePopUp();

    }
  };
  changeStep(1);


  window.addEventListener("error", (e) => {
    handleError(e, "error");
  });
  window.addEventListener("unhandledrejection", (e) => {
    handleError(e, "promise");
  });








  // MAIN CODE









  const importScheduleButton = document.querySelector("#importSchedule");
  const message = document.querySelector(".message");

  let schedule; // this is set by fetchSchedule()

  getCurrentTab().then((tab) => {
    const currentUrl = new URL(tab.url);
    const path = currentUrl.pathname;
    const broaderPath = "/StudentRegistrationSsb/ssb/"; // used to direct the user to the path below
    const targetPath = [
      "/StudentRegistrationSsb/ssb/registrationHistory/registrationHistory"]; // this is banner's View Registration Information page, regardless of host name
    if (!targetPath.includes(path)) {
      if (!path.includes(broaderPath)) {
        wrongSitePageContainer.style.display = "";
        importScheduleButton.toggleAttribute("disabled", true);
        importScheduleButton.style.display = "none";
        message.classList.add("error", "show");
        schoolSection.style.display = "flex";

        schoolName.onblur = () => {
          const results = document.querySelector(".search-results");
          results.replaceChildren();

          let schoolInput = schoolName.value.trim();
          if (!schoolInput) {
            results.style.display = "none";
            return;
          }
          const schools = getSchools(schoolInput);
          if (schools.length === 0) {
            let div = document.createElement("div");
            div.textContent = `No results for ${schoolInput}. If you feel your school is missing, fill out the Help & Feedback form that is linked at the bottom of this page. In the meantime, go to your school's Banner registration page. If your school does not use Banner, this extension may not work for you.`;
            results.append(div);
          }


          for (const school of schools) {
            const div = document.createElement("div");
            const a = document.createElement('a');

            a.href = links[school].link;
            a.target = "_blank";
            a.textContent = school;
            a.tabIndex = 0;
            a.addEventListener("keydown", (e) => {
              if (e.key === " ") {
                a.click();
              }
            })

            div.appendChild(a);

            results.appendChild(div);
          }
          results.style.display = "block";
        };
      } else {
        correctSitePageContainer.style.display = "";
        importScheduleButton.toggleAttribute("disabled", true);
        message.textContent =
          "You seem to be on Banner. Please go to the 'View Registration Information' page.";
        message.classList.add("alert", "show");
      }

      return;
    } else {
      correctSitePageContainer.style.display = "";
    }
    // injects function checkForClasses into the webpage
    chrome.scripting.executeScript({
      files: ["injected_scripts/checkForClasses.js"],
      target: { tabId: tab.id },
    });
  });

  // listeners for chrome's messaging system
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // triggered by function checkForClasses
    if (msg === "noClass") {

      message.textContent =
        'Please click on "Schedule Details". If you have already done this, I am unable to see your classes. Try switching terms, clicking out and back in "schedule details", or refreshing the page. If nothing works, use the Help & Feedback form (at the bottom) to receive support.';
      changeStep(2);
      message.classList.add("show", "alert");
      importScheduleButton.toggleAttribute("disabled", true);
      return;
    }

    if (msg === "greenLight") {
      changeStep(3);
      return;
    }

    if (msg === "SCHEDULE FETCHING ATTEMPTED: NO CLASSES FOUND") {
      importScheduleButton.textContent = "No classes detected";
      message.classList.add("error", "show");
      message.classList.remove('alert');
      message.textContent =
        "No class detected! You may need to change your term. Otherwise, please try again later once you have registered for classes.";
      injection_error = true;
      return;
    }
    if (typeof msg === "object") {
      if (Object.keys(msg).includes("error")) {
        handleError(msg.error, "error", false);
        injection_error = true;
        return;
      }
    }

    // otherwise, message triggered by function fetchSchedule, which means we are receiving the schedule.

    schedule = msg;
  });
  //
  ///
  ///
  //
  //
  //
  //
  // this is used to detect when checkboxes are checked/unchecked.
  // this will update the settings object which will later be used when downloading the .ics file

  // this is an array of arrays that keep track of per-class settings that overlap each other.
  // in each array, the first element is always the setting that overlaps the others
  // if at any point the first element is unchecked, the rest of the settings will be disabled.
  const optionsOverlap = [];



  document.addEventListener("change", (event) => {
    if (
      event.target.tagName === "INPUT" &&
      event.target.getAttribute("type") === "checkbox"
    ) {
      const id = event.target.id;
      if (id.includes("waitlisted")) {

        changeSetting(id, -1, event.target.checked);

        for (const course of waitlistedCourses) {
          const leCheckBox = document.querySelector(`#${course}`);
          const index = parseInt(leCheckBox.id.match(/\d+/)[0]);
          leCheckBox.disabled = !event.target.checked;
          leCheckBox.checked = event.target.checked ? settings["includecourse"][index] : false;
        }
        return;
      }
      const index = parseInt(id.match(/\d+/)[0]);
      const setting = id.match(/\D+/)[0];

      const overlapIndex = optionsOverlap.indexOf(optionsOverlap.find(e => e[0] === setting))
      if (overlapIndex !== -1) {
        for (const overlap of optionsOverlap[overlapIndex].slice(1)) {

          const checkbox = document.querySelector(`#${overlap}${index}`);
          checkbox.disabled = !event.target.checked;

        }
      }


      actionHistory.push(`User changed the following setting: ${setting} at index ${index} with a new value of ${event.target.checked}`);
      changeSetting(setting, index, event.target.checked);

    }
  });




  ///
  ///
  ///
  ///
  ///
  // event listener for button(s)



  let validating = false;
  importScheduleButton.addEventListener("click", async () => {
    // this only runs when the button is clicked after the classes are imported
    if (importScheduleButton.classList.contains("export")) {
      // await wait(500);
      // if (validating) return;
      actionHistory.push("User attempted .ics export");
      const filtered = schedule.filter((e, i) => {
        return (
          settings[`includecourse`][i] &&
          (e.waitlisted ? settings["includewaitlisted"] : true)
        );
      });
      const events = [];

      for (const course of filtered) {
        const {
          courseTitle,
          displayName,
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
          waitlisted,
        } = course;

        const event = buildICSEvent(course, schedule.indexOf(course), settings);
        if (!event) continue;
        events.push(
          event
        );
      }


      const file = buildICSFile(events);



      const noClassesSelected = settings["includecourse"].every((e) => !e);
      const validateText = document.querySelector('#validation');
      if (noClassesSelected) {
        validateText.classList.add('message', 'show', 'error');
        return validateText.textContent = "At least one class needs to be selected to export";
      }

      validateText.textContent = "";
      validateText.classList.remove('show');
      chrome.downloads.download({
        url: createDownload(file),
        filename: `schedule.ics`,
        saveAs: true,
      });
    } else {
      inputFileButton.disabled = true;
      loadClasses();
    }
  });

  inputFileButton.addEventListener("click", async () => {
    const fileInput = document.querySelector("#icsfileinput");
    const msg = document.querySelector('#fileInputMessage');

    const file = fileInput.files.item(0)
    const fileType = file?.type;

    if (!file) {
      msg.classList.toggle('show', true);
      msg.textContent = "You have not provided a file.";
      return;
    }
    if (fileType !== "text/calendar") {
      msg.classList.toggle('show', true);
      msg.textContent = "The file you provided is not an .ics file.";
      return;
    }
    const reader = new FileReader();

    reader.onload = (event) => {
      msg.classList.toggle("show", false);
      const content = event.target.result;
      const lowercase = content.toLowerCase();
      if (lowercase.includes("sir jal//calendar extension")) {
        if (!lowercase.includes("importable")) {
          msg.textContent = "The .ics file you provided was exported using a version older than 2.0.0. You will have to export a new file. Ensure you are updated to the latest version.";
          msg.classList.toggle('show', true);
          return;
        }
      } else {
        msg.textContent = "The .ics file you provided wasn't created by this extension."
        msg.classList.toggle("show", true);
      }
      readIcs(content);


    }

    reader.readAsText(file);
  })



})();

