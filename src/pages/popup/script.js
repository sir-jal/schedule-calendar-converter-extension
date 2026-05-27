"use strict";

import { Course } from "../../classes/course.js";
import { renderCourse } from "../../scripts/shared/renderCourse.js";
import { Schedule } from "../../classes/schedule.js";
import { wait, delay } from "../../utils/timeRelatedUtils.js";
import { handleCheckmarkChange } from "../../scripts/shared/handleCheckmarkChange.js";

// (() => {
// DEFINING GLOBAL VARIABLES
const version = document.querySelector("#versionNumber");


const inputFileContainer = document.querySelector(".fileInputContainer");
const inputFileButton = document.querySelector("#importFile");

const resetPopUpButton = document.querySelector("#refreshPopup");
const popUpButtonIcon = document.querySelector("#refreshPopup i");

resetPopUpButton.addEventListener('click', resetPopup);

const stepsButton = document.querySelector("#stepsButton");
const stepsPopup = document.querySelector("#stepsPopup");

const schoolName = document.querySelector("#school-name");
const schoolSection = document.querySelector(".school-search");

const settings = {};
const docLink =
  "https://docs.google.com/document/d/1f6nR1gs8f4Ddj9vVLVmsOS5gwGHIQla28Q6va0HvfN0/edit?usp=sharing";
const errorLog = [];


const validateText = document.querySelector("p#validation");

const CACHE_MAX_AGE = 1000 * 60 // * 60 * 24 * 3; // 3 days
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
 * 
 * @param {boolean} force Whether or not to force the cache update
 * @returns The updated cache
 */
async function updateCache(force = false) {
  const e = await chrome.storage?.local?.get(["lastUpdated"]);
  const lastUpdated = new Date(e?.lastUpdated ?? 0).getTime();
  changingLocal = true;
  await wait(150);
  if (
    Object.keys(e).length === 0 ||
    lastUpdated + CACHE_MAX_AGE <= Date.now() || force
  ) {
    await chrome.storage?.local?.set({
      info: await getJSON(
        "../../../extension_info.json"
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
 * Searches for a school using a search query. The function will search the schools not only by name but also by aliases.
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
 * Reads an imported .ics file and loads them up using loadClasses().
 * @param {string} text The .ics file (text) to read
 */
async function readIcs(text = "") {

  const lines = text.split('\n');
  const firstEventStart = lines.findIndex(e => e.includes("BEGIN:VEVENT"));
  const lastEventEnd = lines.findLastIndex(e => e.includes("END:VEVENT"));
  let linesWithEvents = lines.slice(firstEventStart, lastEventEnd + 1);
  const msg = document.querySelector('#fileInputMessage');


  while (linesWithEvents.length > 0) {
    // event
    const eventStart = linesWithEvents.findIndex(e => e.includes("BEGIN:VEVENT"));
    const eventEnd = linesWithEvents.findIndex(e => e.includes("END:VEVENT"));
    const eventLines = linesWithEvents.slice(eventStart, eventEnd + 1);

    const parseableIndexStart = eventLines.findIndex(e => e.toLowerCase().includes("coursetitle"));
    const parseable = eventLines.slice(parseableIndexStart);

    const event = {};
    for (const line of parseable) {
      const firstColonIndex = line.indexOf(":");
      const property = line.substring(0, firstColonIndex);

      if (property === "END") break;

      let value = line.substring(firstColonIndex + 1).trim();

      switch (property) {
        case "prof":
          value = value.split(", ");
          break;
        case "waitlisted":
          value = value.toLowerCase() === "true" ? true : false;
          break;
      }
      event[property] = value;

    }

    const course = new Course(event);

    if (Object.keys(event).length !== 0) schedule.addCourse(course);
    linesWithEvents = linesWithEvents.slice(eventEnd + 1);
    if (linesWithEvents.length <= 0) {
      break;
    }
  }

  if (schedule.length === 0) {
    msg.textContent = "The .ics file you provided contained no valid events. Please double check the file or export the file again. If issues persist, that likely means the extension is exporting the file incorrectly and it needs to be reported via the Help & Feedback form.";
    msg.classList.toggle("show", true);
    return;
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

  /**
   * Mass changes all settings
   * @param {boolean} booleanValue The value for the mass change, either true or false
   */
  const massChange = (booleanValue) => {
    const selectBox = document.querySelector("#optionSelect");
    const settingToChange = selectBox.value;
    const index = optionsOverlap.indexOf(optionsOverlap.find(e => e[0] === settingToChange));

    actionHistory.push(`User clicked on the ${booleanValue ? "Select" : "Deselect"} All button with the Select Menu value: ${settingToChange}`);



    for (let i = 0; i < schedule.length; i++) {
      const course = schedule.getAtIndex(i);
      if (course.isAsync()) continue;

      const checkbox = document.querySelector(`#${settingToChange}${i}`);
      if (checkbox.disabled) continue;


      course.setSetting(settingToChange, booleanValue);

      checkbox.checked = booleanValue;

      handleCheckmarkChange(false, schedule, checkbox);

    }
  }

  selectAll.onclick = () => {
    massChange(true);
  };

  deselectAll.onclick = () => {
    massChange(false);
  };

  // import classes into extension
  importScheduleButton.textContent = "Fetching classes...";
  importScheduleButton.toggleAttribute("disabled", true);

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

  classesLoadedContainer.append(waitlistedContainer);

  const courseOptions = Course.CourseSettings; // options per class

  const convertToId = (str) => {
    return str.trim().replaceAll(" ", "").toLowerCase()
  };

  optionsOverlap.push([convertToId(courseOptions[1]), convertToId(courseOptions[2])]);

  courseOptions.forEach(
    (e) => (settings[convertToId(e)] = [])
  );
  const id = "includecourse";
  settings[id] = [];

  for (const course of schedule.getCourses()) {
    renderCourse(course);
    handleCheckmarkChange(
      null, schedule, document.querySelector(`#includecourse${schedule.findCourseIndex(course.getId())}`)
    );
  }
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

const importScheduleButton = document.querySelector("#importSchedule");


importScheduleButton.addEventListener("click", async () => {
  // this only runs when the button is clicked after the classes are imported
  if (importScheduleButton.classList.contains("export")) {
    // await wait(500);
    // if (validating) return;
    actionHistory.push("User attempted .ics export");

    const noClassesSelected = schedule.getIncludedCourses().length === 0;
    const validateText = document.querySelector('#validation');
    if (noClassesSelected) {
      validateText.classList.add('message', 'show', 'error');
      return validateText.textContent = "At least one class needs to be selected to export";
    }


    const file = schedule.toICS(settings["includewaitlisted"]);





    validateText.textContent = "";
    validateText.classList.toggle("message", false);
    chrome.downloads.download({
      url: createDownload(file),
      filename: `schedule.ics`,
      saveAs: true,
    });
  } else {

    const tab = await getCurrentTab();

    // injects function fetchSchedule into webpage
    chrome.scripting.executeScript({
      files: ["src/injected_scripts/fetchSchedule.js"],
      target: { tabId: tab.id },
    });

    await wait(1000); // 1 second delay
    if (injection_error) return;

    changeStep(4);

    inputFileButton.disabled = true;
    loadClasses();
  }
});

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
  const versionJson = await getJSON("../../../manifest.json");
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









// const importScheduleButton = document.querySelector("#importSchedule");
const message = document.querySelector(".message");

const schedule = new Schedule(); // this is configured by fetchSchedule()

getCurrentTab().then((tab) => {
  const currentUrl = new URL(tab.url);
  const path = currentUrl.pathname;
  const broaderPath = "/StudentRegistrationSsb/ssb/"; // used to direct the user to the path below
  // this is banner's View Registration Information page, regardless of host name
  const targetPath = ["/StudentRegistrationSsb/ssb/registrationHistory/registrationHistory"];

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
    files: ["src/injected_scripts/checkForClasses.js"],
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

  msg.forEach(e => {
    schedule.addCourse(new Course(e));
  });
});

const optionsOverlap = [];


document.addEventListener("change", e => {
  handleCheckmarkChange(e, schedule);
})




///
///
///
///
///
// event listener for button(s)



let validating = false;


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
      if (lowercase.trim().length === 0) {
        msg.textContent = "The .ics file you provided is empty.";
      } else {
        msg.textContent = "The .ics file you provided wasn't created by this extension."
      }
      msg.classList.toggle("show", true);
      return;
    }
    readIcs(content);


  }

  reader.readAsText(file);
})



// })();
