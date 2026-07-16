"use strict";

import { Course, Schedule } from "../../classes/index.js";
import { renderCourse, renderSchedule, updateCourseSetting, updateUI, addSettingListener } from "../../scripts/shared/index.js";
import { wait, delay } from "../../utils/tools/timeRelatedUtils.js";
import { getJSON } from "../../utils/tools/getJSON.js";
import { createDownload } from "../../utils/tools/download.js";
import { createExportButton } from "../../utils/components/exportButton.js";
import { createBulkSettings } from "../../utils/components/bulkSettings.js";
import { createScheduleSettings } from "../../utils/components/scheduleSettings.js";
import { clearSessionStorage, updateSessionStorage, updateInfoCache } from "../../utils/tools/storage.js";
import { ExtensionSettingsManager } from "../../utils/tools/config.js";

(async () => {

  const extSettings = await ExtensionSettingsManager.getAll();



  // (() => {
  // DEFINING GLOBAL VARIABLES
  const version = document.querySelector("#versionNumber");


  const inputFileContainer = document.querySelector(".fileInputContainer");


  const webpageButton = document.querySelector("#webpageButton");


  document.addEventListener('keypress', e => {
    if (e.key.toLowerCase() === " " || e.key.toLowerCase() === "enter") {
      if (document.activeElement.id === webpageButton.id) {
        webpageButton.click();
      }
    }
  })

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
  const wrongSitePageContainer = document.querySelector("#notOnWebsitePage")


  const message = document.querySelector(".message");

  let schedule = new Schedule(); // this is configured by fetchSchedule();


  let injection_error = false;
  let step = 1;
  let links = {};
  let changingLocal = false;
  let editingName = false;
  let popupOpen = false;
  let revertingChanges = false;
  let classesLoaded = false;






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

    message.replaceChildren();

    const url = URL.createObjectURL(blob);

    const contentContainer = document.createElement("div");
    contentContainer.classList.add("content");

    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("buttonContainer");

    const copyScheduleHTMLButton = document.createElement("button");
    copyScheduleHTMLButton.textContent = "Copy schedule HTML";

    const downloadLogButton = document.createElement("button");
    downloadLogButton.textContent = "Download error log";

    downloadLogButton.addEventListener("click", async e => {
      chrome.downloads.download({
        url,
        filename: "errorlog.txt",
      });
    })

    buttonContainer.append(downloadLogButton);

    if (errorType === "injection-error" || errorLog.some(e => e.includes("injection-error"))) {
      copyScheduleHTMLButton.addEventListener("click", async e => {
        const tab = await getCurrentTab();
        const currentUrl = new URL(tab.url);
        const path = currentUrl.pathname;
        const isDebugging = path.includes("debugging");
        if (isDebugging) return;
        chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
          if (msg.title === "OUTER_HTML_CONTENT") {
            navigator.clipboard.writeText(msg.body);
            const prev = copyScheduleHTMLButton.textContent;
            copyScheduleHTMLButton.textContent = "Copied!";
            await wait(1000);
            copyScheduleHTMLButton.textContent = prev;

          }
        })
        chrome.scripting.executeScript({
          files: ["src/injected_scripts/copyScheduleHTML.js"],
          target: { tabId: tab.id },
        });


      })
      buttonContainer.append(copyScheduleHTMLButton);
    }

    importScheduleButton.toggleAttribute("disabled", true);
    importScheduleButton.textContent = "Error";

    message.classList.add("error", "show");
    message.classList.toggle("success", false);
    contentContainer.innerHTML = `Uh oh! I ran into ${errorLog.length} error(s)! 
    You may download the log file to send to the developer when you submit a ticket via the Help & Feedback hub 
    (see webpage).<br><br>
    If an error happened during injection, you may copy the schedule html content to send to the developer to help debug your
    issue. The html content does NOT contain any personal information; it contains the same schedule information the extension
    can see.`

    message.append(contentContainer, buttonContainer);
  }

  /**
   * Fetches the current tab the user is on
   * @returns The current tab
   */
  async function getCurrentTab() {
    const queryOptions = { active: true, currentWindow: true };
    const [tab] = await chrome.tabs.query(queryOptions);
    return tab;
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
   * Loads the user's classes, whether via session recovery or script injection 
   */
  async function loadClasses(fromCache = false) {

    schoolSection.style.display = "none";


    message.classList.toggle('success', true);
    message.classList.toggle('error', false);
    message.classList.toggle("alert", false);


    wrongSitePageContainer.style.display = "none";
    correctSitePageContainer.style.display = "";


    const icsGuide = chrome.runtime.getURL("src/pages/webpages/guide/customization.html");

    message.innerHTML =
      `Classes successfully loaded. View <a href="${icsGuide}" target=_blank>this guide</a> to learn how to customize your file.`;

    message.classList.add("success", "show");




    document.querySelector(".buttonContainer").remove();
    document.querySelector("#recoverMessage")?.classList.toggle("show", false);

    actionHistory.push("User has imported schedule into extension");

    addSettingListener(schedule);
    const scheduleElement = await renderSchedule(schedule, !fromCache);

    correctSitePageContainer.append(scheduleElement);

    document.querySelector(".buttonContainer").append(webpageButton);
    webpageButton.style.display = "";

    classesLoaded = true;

    await wait(750);

    document.addEventListener("course-change", async e => {
      if (e.detail.isBulk) return;

      changingLocal = true;

      await wait(400);
      await updateSessionStorage(schedule);
      await wait(400);

      changingLocal = false;
    })
    document.addEventListener("course-bulk-settings", async e => {
      changingLocal = true;

      await wait(400);
      if (extSettings.scheduleBehavior.restorePopupProgress !== "NEVER") await updateSessionStorage(schedule);
      await wait(400);

      changingLocal = false;
    })

    webpageButton.addEventListener('click', async () => {
      await chrome.storage.session.set({ scheduleToImport: { FORCE_PRESERVE: true, ...schedule.toJSON() } });
      await clearSessionStorage();
      window.open(chrome.runtime.getURL("src/pages/webpages/import/index.html?extensionDirect=true"), "_blank");
    })

  }

  async function detectSchedule() {
    const loadedSchedule = await chrome.storage.session.get(["loadedSchedule"]);
    if (Object.keys(loadedSchedule).length === 0 || extSettings.scheduleBehavior.restorePopupProgress === "NEVER") {
      await clearSessionStorage();
      return;
    }


    const theSchedule = loadedSchedule.loadedSchedule;



    const continueButton = document.createElement("button");
    const doneButton = document.createElement("button");
    const container = document.createElement('div');

    container.id = "messageButtonContainer";

    doneButton.textContent = "Discard"
    doneButton.id = "doneButton";

    continueButton.textContent = "Continue";
    continueButton.id = "continueButton"

    container.append(continueButton, doneButton);

    const recoverMessage = document.createElement("div");

    recoverMessage.style = extSettings.scheduleBehavior.restorePopupProgress === "ASK" ? "" : "display: none;";
    recoverMessage.classList.add("message", "show", "alert");
    recoverMessage.id = "recoverMessage";
    recoverMessage.textContent = "The schedule you imported last time is still available. Wanna continue where you left off?";
    recoverMessage.append(container);

    message.insertAdjacentElement("afterend", recoverMessage);

    const recoverSession = () => {
      schedule = Schedule.fromJSON(theSchedule);
      loadClasses(true);
      container.remove();
      recoverMessage.remove();
    }

    continueButton.addEventListener('click', recoverSession);

    if (extSettings.scheduleBehavior.restorePopupProgress === "ALWAYS") continueButton.click();

    await wait(700);
    doneButton.addEventListener("click", async () => {
      await chrome.storage.session.remove("loadedSchedule");
      recoverMessage.remove();

      // message.classList.forEach(e => {
      //   message.classList.remove(e);
      // })
      // await wait(1000);
      // oldClasslist.forEach(e => {
      //   message.classList.toggle(e, true);
      // })
      // message.textContent = oldMsg;
    })



  }



  const importScheduleButton = document.querySelector("#importSchedule");


  importScheduleButton.addEventListener("click", async () => {
    // this only runs when the button is clicked after the classes are imported

    const tab = await getCurrentTab();
    const currentUrl = new URL(tab.url);
    const path = currentUrl.pathname;
    const isDebugging = path.includes("debugging");
    const scriptToInject = "src/injected_scripts/fetchSchedule.js";
    // injects function fetchSchedule into webpage
    chrome.scripting.executeScript({
      files: [scriptToInject],
      target: { tabId: tab.id },
    });

    importScheduleButton.setAttribute("disabled", true);

    await wait(1000); // 1 second delay
    if (injection_error) return;

    changeStep(4);

    loadClasses();
  });

  /**
   * Resets the extension's popup.
   */
  async function resetPopup() {
    await wait(200)
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


  // everything related to the steps pop up

  const closePopUp = async () => {
    stepsPopup.style.opacity = 0;
    await wait(140);
    popupOpen = false;
    stepsPopup.close();
  }

  document.querySelector('#closePopup').addEventListener('click', closePopUp)


  window.addEventListener("error", (e) => {
    handleError(e, "error");
  });
  window.addEventListener("unhandledrejection", (e) => {
    handleError(e, "promise");
  });






  // MAIN CODE









  // const importScheduleButton = document.querySelector("#importSchedule");



  getCurrentTab().then((tab) => {
    const currentUrl = new URL(tab.url);
    const path = currentUrl.pathname;
    const broaderPath = "/StudentRegistrationSsb/ssb/"; // used to direct the user to the path below
    // this is banner's View Registration Information page, regardless of host name
    const targetPath = ["/StudentRegistrationSsb/ssb/registrationHistory/registrationHistory"];
    const isDebugging = path.includes("debugging");

    if (!targetPath.includes(path) && !isDebugging) {
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
            div.textContent = `No results for ${schoolInput}.If you feel your school is missing, fill out the Help & Feedback form that is linked at the bottom of this page.In the meantime, go to your school's Banner registration page. If your school does not use Banner, this extension may not work for you.`;
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

  chrome.runtime.onMessage.addListener((received, sender, sendResponse) => {
    const title = received.title;
    const msg = received.body;

    if (title === "PARSED_SCHEDULE") {
      msg.forEach(e => {
        schedule.addCourse(new Course(e));
      });
    }
    // triggered by function checkForClasses
    if (msg === "noClass") {

      message.textContent =
        'Please click on "Schedule Details". If you have already done so, I cannot detect any classes.';
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

    if (title === "INJECTION_ERROR") {
      handleError(msg, "error", false);
      injection_error = true;
      return;
    }

    // otherwise, message triggered by function fetchSchedule, which means we are receiving the schedule.


  });

  const optionsOverlap = [];







  ///
  ///
  ///
  ///
  ///
  // event listener for button(s)

  detectSchedule();

  const infoJson = await updateInfoCache();
  links =
    infoJson.info?.banner_links ??
    await getJSON("https://sir-jal.github.io/schedule-calendar-converter-extension/extension_info.json");

})()

// })();
