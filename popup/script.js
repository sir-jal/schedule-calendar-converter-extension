const input = document.querySelector("#fileName");
const version = document.querySelector(".version");
const docLink =
  "https://docs.google.com/document/d/1f6nR1gs8f4Ddj9vVLVmsOS5gwGHIQla28Q6va0HvfN0/edit?usp=sharing";
const errorLog = [];

// DISPLAY VERSION AND CHANGELOG

fetch("../manifest.json")
  .then((e) => {
    return e.json();
  })
  .then((e) => {
    version.innerHTML = `Version ${e.version}. Click <a href="${docLink}" target="_blank">here</a> to view changelog.`;
  });
//
//
//
//
//
// handles errors
function handleError(e, type, extensionError = true) {
  let text;
  const errorType = extensionError ? "extension-error" : "injection-error";

  if (type === "error") {
    text = `Type: ${errorType}\n\n\n${e.message}\n\nFile Name: ${e.filename}\nLine Number: ${e.lineno}\nColumn Number: ${e.colno}\n\n${e.error?.stack}`;
  } else {
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

// build an event in ics format
function buildICSEvent(
  title,
  buildingName,
  roomNumber,
  days,
  startdate,
  endDate,
  startTime,
  endTime,
  section
) {
  const uid = crypto.randomUUID();
  console.log("build ics event", title);
  const dayFormat = formatDays(days);
  const location = `Building: ${buildingName} | Room: ${roomNumber}`;

  const [month, day, year] = endDate.split("/");
  const [startMonth, startDay, startYear] = startdate.split("/");

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
    `SUMMARY:${title}, Section ${section.toUpperCase()}`,
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
    `LOCATION:${location}`,
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
async function createDownload(content, filename = "schedule") {
  // self explanatory
  const blob = new Blob([content], { type: "text/calendar;charset=utf8" });
  const url = URL.createObjectURL(blob);
  message.innerHTML = `<span> Your download is ready: </span> <span> <a href=${url} download="${filename}.ics">Download Schedule</a>.<br>You may now use the file to import your courses to your calendar.</span>`;
  message.classList.add("show", "success");

  return url;
}

// delay function, utilizing Promises
async function wait(time) {
  return new Promise((res, rej) => {
    setTimeout(res, time);
  });
}

// MAIN CODE

const button = document.querySelector("button"); // fetches the convert button, as it comes first and we are not using .querySelectorAll()
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
      // the error message is pre set upon the extension loading up (check HTML), hence no reason to set .textContent to anything
      message.classList.add("error", "show");
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
    message.classList.add("show", "alert");
    button.toggleAttribute("disabled", true);
    return;
  }
  console.log(typeof msg);

  if (typeof msg === "object") {
    if (Object.keys(msg).includes("error")) {
      handleError(msg, "error", false);
      return;
    }
  }

  // otherwise, message triggered by function fetchSchedule, which means we are receiving the schedule.
  schedule = msg;
});

// event listener for convert button
button.addEventListener("click", async () => {
  button.textContent = "Converting schedule...";
  button.toggleAttribute("disabled", true);

  const tab = await getCurrentTab();

  // injects function fetchSchedule into webpage
  chrome.scripting.executeScript({
    files: ["injected_scripts/fetchSchedule.js"],
    target: { tabId: tab.id },
  });

  await wait(1000); // 1 second delay
  const events = []; // contains all events (courses) for .ics file creation

  for (const course of schedule) {
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
    } = course;

    const event = buildICSEvent(
      courseTitle,
      buildingName,
      roomNumber,
      days,
      startDate,
      endDate,
      startTime,
      endTime,
      section
    );
    events.push(event);
  }
  // use events to build .ics file
  const icsText = buildICSFile(events);
  // creates "a" tag that links to the download
  await createDownload(icsText, input.value || "schedule");

  button.textContent = "Conversion Completed";
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
