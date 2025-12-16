const fileName = document.querySelector(".fileName");
const fileNameInput = document.querySelector("#fileName");
const version = document.querySelector("#versionNumber");
const schoolName = document.querySelector("#school-name");
const schoolSection = document.querySelector(".school-search");
const settings = {};
const docLink =
  "https://docs.google.com/document/d/1f6nR1gs8f4Ddj9vVLVmsOS5gwGHIQla28Q6va0HvfN0/edit?usp=sharing";
const errorLog = [];
const stepsButton = document.querySelector("#stepsButton");
const stepsPopup = document.querySelector("#stepsPopup");
const validateText = document.querySelector("p#validation");
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days
let step = 1;
let links = {};

let popupOpen = false;

// Display version information and update links for school searches (caching)

async function updateCache() {
  const e = await chrome.storage?.local?.get(["lastUpdated"]);
  const lastUpdated = new Date(e?.lastUpdated ?? 0).getTime();
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
    console.log("cache updated");
  }
  console.log("cache update attempted");
}

async function getCache() {
  return await chrome.storage?.local?.get(["info"]);
}
window.onload = async () => {
  const versionJson = await getJSON("../manifest.json");
  version.textContent = versionJson.version;

  await updateCache();
  const infoJson = await getCache();
  if (infoJson.version !== versionJson.json) {
    version.textContent = versionJson.version + " (UPDATE TO THE LATEST!)";
  }
  links =
    infoJson.info?.banner_links ??
    (await getJSON(
      "https://sir-jal.github.io/schedule-calendar-converter-extension/extension_info.json"
    ));
};

// everything related to the steps pop up

stepsButton.addEventListener("click", async () => {
  stepsPopup.showModal();
  stepsPopup.style.opacity = 1;
  await wait(500);
  popupOpen = true;
});

stepsPopup.style.opacity = 0;

document.onclick = async (e) => {
  if (popupOpen && e.target.id === "stepsPopup") {
    popupOpen = false;
    stepsPopup.style.opacity = 0;
    await wait(400);
    stepsPopup.close();
  }
};
changeStep(1);

//
//
//
//
//
// handles errors

function changeStep(num) {
  const steps = document.querySelectorAll(".step");
  const maxSteps = steps.length;
  if (maxSteps < num) return;
  document.querySelector(`#step${step}`).classList.remove("current");
  step = num;

  for (let i = 1; i < num; i++) {
    const leStep = document.querySelector(`#step${i}`);
    leStep.classList.add("past");
  }
  document.querySelector(`#step${step}`).classList.add("current");
}

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

  const blob = new Blob([errorLog.join(`\n\n\n\n${"-".repeat(100)}\n\n\n\n`)], {
    type: "text/plain",
  });

  const url = URL.createObjectURL(blob);

  button.toggleAttribute("disabled", true);
  button.textContent = "Error";

  message.classList.add("error", "show");
  message.innerHTML = `Uh oh! I ran into ${errorLog.length} error(s)! I do apologize for this.<br><br>Below is a log file that has been generated for you to download. If you would like to report this error (highly recommended), please do so in the feedback form (Click 'Give feedback' to access). This would massively help the developer improve the extension to ensure it works for everyone, assuming you're using Banner.<br><br><a href=${url} download="errorlog.txt">Download Error Log</a`;
}

window.addEventListener("error", (e) => {
  handleError(e, "error");
});
window.addEventListener("unhandledrejection", (e) => {
  handleError(e, "promise");
});

// FUNCTIONS

// get current tab
async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

// get json from .json files
async function getJSON(fileName) {
  const request = await fetch(fileName);
  const json = await request.json();
  return json;
}

// search schools
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

// build an event in ics format
function buildICSEvent(
  courseIndex,
  title,
  buildingName,
  roomNumber,
  days,
  startdate,
  endDate,
  startTime,
  endTime,
  section,
  prof,
  waitlisted,
  settings
) {
  // figure out settings
  const includeProfName = settings[`includeprofessorname`][courseIndex];
  const includeSection = settings[`includesection`][courseIndex];
  const includeLocation = settings[`includeclasslocation`][courseIndex];

  const uid = crypto.randomUUID();
  console.log("build ics event", title);
  const dayFormat = formatDays(days);
  const location =
    buildingName !== "None" &&
    roomNumber !== "None" &&
    buildingName !== "NA" &&
    roomNumber !== "NA" &&
    buildingName !== "Online" &&
    roomNumber !== "Online"
      ? `${buildingName} ${roomNumber}`
      : "No location found";

  const [month, day, year] = endDate.split("/");
  const [startMonth, startDay, startYear] = startdate.split("/");

  let [profLast, profFirst] = prof.split(", ");
  if (profLast === "No professor") {
    profFirst = "No professor";
    profLast = "";
  }

  const startDate = new Date(
    `${startYear}-${startMonth}-${parseInt(startDay) + 1}`
  );
  // this is used to offset the days from the start date of the class. otherwise, every class will appear on the start date in iCloud maps.
  const indices = {
    SU: 0,
    MO: 1,
    TU: 2,
    WE: 3,
    TH: 4,
    FR: 5,
    SA: 6,
  };
  const difference = indices[dayFormat.split(",")[0]] - startDate.getDay();
  startDate.setDate(startDate.getDate() + difference);

  const today = new Date();

  // build .ics event manually, since an .ics file is just plain text.
  // I'm using an array here to properly do the spacing, as seen in lines.join("\r\n"). using a template literal otherwise would have resulted in problems, especially
  // in google calendar.
  // .ics date format: YYYYMMDDTHHmmss, which is what formatDate() is converting the time to.
  const lines = [
    `BEGIN:VEVENT`,
    `UID:${uid}`,
    `DTSTAMP:${today.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"}`,
    `SUMMARY:${waitlisted ? "(WAITLISTED) " : ""}${title}` +
      (includeSection ? `, Section ${section.toUpperCase()}` : ""),
    `DTSTART;TZID=America/New_York:${formatDate(
      `${(startDate.getMonth() + 1).toString().padStart(2, "0")}/${startDate
        .getDate()
        .toString()
        .padStart(2, "0")}/${startDate.getFullYear()}`,
      startTime
    )}`,
    `DTEND;TZID=America/New_York:${formatDate(
      `${(startDate.getMonth() + 1).toString().padStart(2, "0")}/${startDate
        .getDate()
        .toString()
        .padStart(2, "0")}/${startDate.getFullYear()}`,
      endTime
    )}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${dayFormat};UNTIL=${year}${month}${day}T235959Z`,
    `LOCATION:` +
      (includeLocation ? `${location}` : "") +
      (includeLocation && includeProfName ? " | " : "") +
      (includeProfName ? `${profFirst} ${profLast}` : ""),
    `END:VEVENT`,
  ];
  return lines.join("\r\n");
}

function buildICSFile(events) {
  // simply creates a calendar with the previously created events in it.
  return `BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nPRODID:-//Sir Jal//Calendar Extension 1.0//EN\nBEGIN:VTIMEZONE\nTZID:America/New_York\nX-LIC-LOCATION:America/New_York\nBEGIN:DAYLIGHT\nTZOFFSETFROM:-0500\nTZOFFSETTO:-0400\nTZNAME:EDT\nDTSTART:19700308T020000\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU\nEND:DAYLIGHT\nBEGIN:STANDARD\nTZOFFSETFROM:-0400\nTZOFFSETTO:-0500\nTZNAME:EST\nDTSTART:19701101T020000\nRRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU\nEND:STANDARD\nEND:VTIMEZONE\n${events.join(
    "\n"
  )}\nEND:VCALENDAR`
    .split("\n")
    .join("\r\n");
}

// creates a download
function createDownload(content) {
  // self explanatory
  const blob = new Blob([content], { type: "text/calendar;charset=utf8" });
  const url = URL.createObjectURL(blob);
  console.log(url);

  return url;
}

// validates the file name as an error can occur otherwise
function nameValidation(name) {
  const nonoChars = `< > : " / \\ | ? *`.split(" ");
  const nonoStart = ".".split(" ");

  const hasNonoChars = nonoChars.some((e) => name.includes(e));
  const startsWithNoNo = nonoStart.some((e) => name.trim().startsWith(e));
  console.log(nonoChars, name.split(""));

  if (hasNonoChars)
    return [
      false,
      `Cannot have the following characters in File Name: ${nonoChars.join(
        ", "
      )}`,
    ];
  if (name.trim().startsWith("."))
    return [false, "Cannot start File Name with a period"];

  return [true, "Yes"];
}

// delay function, utilizing Promises
async function wait(time) {
  return new Promise((res, rej) => {
    setTimeout(res, time);
  });
}

// MAIN CODE

const button = document.querySelector("#importSchedule"); // fetches the convert button, as it comes first and we are not using .querySelectorAll()
const message = document.querySelector(".message"); // fetches the status message

let schedule; // this is set by fetchSchedule()

getCurrentTab().then((tab) => {
  const currentUrl = new URL(tab.url);
  const path = currentUrl.pathname;
  const broaderPath = "/StudentRegistrationSsb/ssb/"; // used to direct the user to the path below
  const targetPath = [
    "/StudentRegistrationSsb/ssb/registrationHistory/registrationHistory",
    "/StudentRegistrationSsb/ssb/classRegistration/classRegistration",
  ]; // this is banner's View Registration Information page, regardless of host name
  if (!targetPath.includes(path)) {
    if (!path.includes(broaderPath)) {
      button.toggleAttribute("disabled", true);
      button.style.display = "none";
      message.classList.add("error", "show");
      schoolSection.style.display = "flex";

      schoolName.onblur = () => {
        const results = document.querySelector(".search-results");
        results.replaceChildren();

        let schoolInput = schoolName.value.trim();
        if (!schoolInput) {
          return;
        }
        const schools = getSchools(schoolInput);
        if (schools.length === 0) {
          let div = document.createElement("div");
          div.textContent = `No results for ${schoolInput}. If you feel your school is missing, fill out the feedback form that is linked at the bottom of this page. In the meantime, go to your school's Banner registration page. If your school does not use Banner, this extension may not work for you.`;
          results.append(div);
        }

        for (const school of schools) {
          let div = document.createElement("div");
          div.innerHTML = `<a href="${links[school].link}" target=_blank>${school}</a>`;
          results.appendChild(div);
        }
      };
    } else {
      button.toggleAttribute("disabled", true);
      message.textContent =
        "You seem to be on the correct website. Please go to a page where you can view your schedule.";
      message.classList.add("alert", "show");
    }

    return;
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
    message.textContent = 'Please click on "Schedule Details".';
    changeStep(2);
    message.classList.add("show", "alert");
    button.toggleAttribute("disabled", true);
    return;
  }

  if (msg === "greenLight") {
    changeStep(3);
  }

  if (typeof msg === "object") {
    if (Object.keys(msg).includes("error")) {
      handleError(msg, "error", false);
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
document.addEventListener("change", (event) => {
  console.log(event.target.tagName, event.target.getAttribute("type"));
  if (
    event.target.tagName === "INPUT" &&
    event.target.getAttribute("type") === "checkbox"
  ) {
    const id = event.target.id;
    if (id.includes("waitlisted")) {
      settings[id] = event.target.checked;
      return;
    }
    const index = parseInt(id[id.length - 1]);
    settings[id.substring(0, id.length - 1)][index] = event.target.checked;
    console.log(settings);
  }
});
///
///
///
///
///
// event listener for button
let validating = false;
button.addEventListener("click", async () => {
  // this only runs when the button is clicked after the classes are imported
  if (button.classList.contains("export")) {
    // await wait(500);
    // if (validating) return;
    const filtered = schedule.filter((e, i) => {
      return (
        settings[`includecourse`][i] &&
        (e.waitlisted ? settings["includewaitlisted"] : true)
      );
    });
    const events = [];
    console.log(filtered);
    for (const course of filtered) {
      const {
        courseTitle,
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
      events.push(
        buildICSEvent(
          schedule.indexOf(course),
          courseTitle,
          buildingName,
          roomNumber,
          days,
          startDate,
          endDate,
          startTime,
          endTime,
          section,
          prof,
          waitlisted,
          settings
        )
      );
    }

    console.log(events);
    const file = buildICSFile(events);

    console.log(file);

    const valid = nameValidation(fileNameInput.value.trim());
    const noClassesSelected = settings["includecourse"].every((e) => !e);

    if (noClassesSelected)
      return (validateText.textContent =
        "At least one class needs to be selected to export");
    if (!valid[0]) return (validateText.textContent = valid[1]);

    validateText.textContent = "";
    chrome.downloads.download({
      url: createDownload(file),
      filename: `${fileNameInput.value.trim() || "schedule"}.ics`,
      saveAs: false,
    });
  } else {
    const selectionContainer = document.querySelector("#selectionContainer");
    const selectAll = document.querySelector("#selectAll");
    const deselectAll = document.querySelector("#deselectAll");

    selectAll.onclick = () => {
      const selectBox = document.querySelector("#optionSelect");
      const value = selectBox.value;

      settings[value].fill(true, 0);
      for (let i = 0; i < schedule.length; i++) {
        document.querySelector(`#${value}${i}`).checked = true;
      }
    };

    deselectAll.onclick = () => {
      const selectBox = document.querySelector("#optionSelect");
      const value = selectBox.value;

      settings[value].fill(false, 0);
      for (let i = 0; i < schedule.length; i++) {
        document.querySelector(`#${value}${i}`).checked = false;
      }
    };

    // import classes into extension
    changeStep(4);
    button.textContent = "Importing classes...";
    button.toggleAttribute("disabled", true);

    const tab = await getCurrentTab();

    // injects function fetchSchedule into webpage
    chrome.scripting.executeScript({
      files: ["injected_scripts/fetchSchedule.js"],
      target: { tabId: tab.id },
    });

    await wait(1000); // 1 second delay

    selectionContainer.style.display = "flex";
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
      "Include professor name",
      "Include section",
      "Include class location",
    ]; // options per class

    courseOptions.forEach(
      (e) => (settings[e.trim().replaceAll(" ", "").toLowerCase()] = [])
    );
    const id = "includecourse";
    settings[id] = [];
    for (const course of schedule) {
      //
      //
      const {
        courseTitle,
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

      const index = schedule.indexOf(course);

      const clas = document.createElement("details");
      const summary = document.createElement("summary");
      const span = document.createElement("span");
      const checkbox = document.createElement("input");
      const options = document.createElement("div");
      const courseDetails = document.createElement("div");
      const br = document.createElement("br");

      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.id = id + index;

      span.textContent = `${courseTitle} Section ${section.toUpperCase()}`;

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
        roomNumber !== "Online";

      summary.append(span, checkbox);

      courseDetails.innerHTML = `${
        waitlisted ? "WAITLISTED" : ""
      }<div>Professor: ${prof}</div> <div>Days: ${days.replace(
        ",",
        ", "
      )}</div> <div>Time: ${startTime} - ${endTime}</div><div>Location: ${
        hasLocation
          ? `${buildingName} ${roomNumber}`
          : "No location found; likely online"
      }</div>`;

      // load in per-class options
      for (const option of courseOptions) {
        const id = option.trim().replaceAll(" ", "").toLowerCase();

        const element = document.createElement("div");
        element.classList.add("option");

        const label = document.createElement("label");
        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.checked = true;
        if (
          (option.includes("location") && !hasLocation) ||
          (option.includes("professor") && prof === "No professor")
        )
          checkbox.checked = false;

        checkbox.name = id + index;
        checkbox.id = id + index;

        label.setAttribute("for", id + index);
        label.textContent = option;

        element.append(checkbox, label);
        options.append(element);

        settings[id].push(checkbox.checked);
      }

      clas.append(summary, br, courseDetails, options);
      classes.append(clas);
    }
    classes.append(waitlistedContainer);
    settings[waitlistedCheckbox.id] = waitlistedCheckbox.checked;

    message.classList.add("success", "show");

    fileName.style.display = "flex";

    message.textContent =
      "Classes successfully loaded. You may now customize your .ics file. You may chose to exclude certain classes or exclude certain parts of a class using the checkboxes.";

    button.textContent = "Export .ICS File";
    button.classList.add("export");
    button.toggleAttribute("disabled", false);

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
});

// formats date and time to YYYYMMDDTHHmmss format
// assumes dateStr argument follows this format: MM/DD/YYYY
function formatDate(dateStr, timeStr) {
  const [month, day, year] = dateStr.split("/");

  // turn time to 24h time
  const [time, AMPM] = timeStr.split("  ");
  let [hour, minute] = time.split(":");

  if (AMPM === "PM" && hour !== "12") {
    hour = parseInt(hour) + 12; // add 12 to hour to convert to 24 hr time; example: 6 pm + 12 = 18:00
  }
  return `${year}${month}${day}T${hour}${minute}00`;
}

// formats days to .ics format. Wednesdays -> WE, Fridays -> FR
function formatDays(days) {
  const split = days.split(",");
  for (let i = 0; i < split.length; i++) {
    const day = split[i];
    const correctFormat = day.substring(0, 2).toUpperCase();
    split[i] = correctFormat;
  }

  return split.join(",");
}
