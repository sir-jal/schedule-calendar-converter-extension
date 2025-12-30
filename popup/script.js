(() => {
  // DEFINING GLOBAL VARIABLES

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
  const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 3; // 3 days
  const actionHistory = [] // may help with replicating errors and debugging
  const colors = ["green", "blue", "yellow", "aqua", "red", "orange", "teal", "purple", "brown", "beige", "white", "bisque", "maroon", "magenta"];
  const keysToEditName = ["e", "f2"];
  let injection_error = false;
  let step = 1;
  let links = {};
  let changingLocal = false;
  let editingName = false;


  let popupOpen = false;
  let revertingChanges = false;





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
    await wait(500);
    popupOpen = false;
    stepsPopup.close();
  }

  document.querySelector('#closePopup').addEventListener('click', closePopUp)

  stepsButton.addEventListener("click", async () => {
    stepsPopup.showModal();
    stepsPopup.scrollTo({ top: 0 })
    stepsPopup.style.opacity = 1;
    await wait(500);
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

    const blob = new Blob(
      [errorLog.join(`\n\n\n\n${"-".repeat(100)}\n\n\n\n`) + `\n\n\n\nUser Action History:\n\n${actionHistory.map((e, i) => { return `${i + 1}. ${e}` }).join('\n')}`],
      {
        type: "text/plain",
      }
    );

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
    const includeProfName = settings[`includeprofessornames`][courseIndex];
    const includeSection = settings[`includesection`][courseIndex];
    const includeLocation = settings[`includeclasslocation`][courseIndex];
    const onlyPrimaryProfessor =
      includeProfName && settings["onlyincludeprimaryprofessor"][courseIndex];
    const asynchronous = days === "ASYNCHRONOUS"

    const uid = crypto.randomUUID();

    const dayFormat = formatDays(days);
    const location =
      buildingName !== "None" &&
        roomNumber !== "None" &&
        buildingName !== "NA" &&
        roomNumber !== "NA" &&
        buildingName !== "Online" &&
        roomNumber !== "Online" && !asynchronous
        ? `${buildingName} ${roomNumber}`
        : "No location found";

    // const [month, day, year] = endDate.split("/");


    const [endDateObj, startDateObj] = [new Date(endDate), new Date(startdate)];
    // const [startMonth, startDay, startYear] = startdate.split("/");
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


    const today = new Date();
    const chosenColor = colors.pop();

    // build .ics event manually, since an .ics file is just plain text.
    // I'm using an array here to properly do the spacing, as seen in lines.join("\r\n"). using a template literal otherwise would have resulted in problems, especially
    // in google calendar.
    // .ics date format: YYYYMMDDTHHmmss, which is what formatDate() is converting the time to.

    let lines;

    if (asynchronous) {
      lines = [
        `BEGIN:VEVENT`,
        `UID:${uid}`,
        `DTSTAMP:${today.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"}`,
        `COLOR:${chosenColor}`,
        `SUMMARY:${waitlisted ? "(WAITLISTED) " : ""}${title}` +
        (includeSection ? `, Section ${section.toUpperCase()}` : ""),
        `DESCRIPTION:${includeProfName
          ? `No meeting time; asynchronous\\nProfessor(s): ${onlyPrimaryProfessor ? prof[0] : prof.join(", ")}`
          : "No meeting time; asynchronous"
        }`,
        `DTSTART;TZID=America/New_York:${formatDate(
          `${(startDateObj.getMonth() + 1)
            .toString()
            .padStart(2, "0")}/${startDateObj
              .getDate()
              .toString()
              .padStart(2, "0")}/${startDateObj.getFullYear()}`,
          "12:00  AM"
          , true)}`,
        `END:VEVENT`,
      ];
    } else {
      const difference = indices[dayFormat.split(",")[0]] - startDateObj.getDay();
      startDateObj.setDate(startDateObj.getDate() + difference);
      lines = [
        `BEGIN:VEVENT`,
        `UID:${uid}`,
        `DTSTAMP:${today.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"}`,
        `COLOR:${chosenColor}`,
        `SUMMARY:${waitlisted ? "(WAITLISTED) " : ""}${title}` +
        (includeSection ? `, Section ${section.toUpperCase()}` : ""),
        `DESCRIPTION:${includeProfName
          ? `Professor(s): ${onlyPrimaryProfessor ? prof[0] : prof.join(", ")}`
          : ""
        }`,
        `DTSTART;TZID=America/New_York:${formatDate(
          `${(startDateObj.getMonth() + 1)
            .toString()
            .padStart(2, "0")}/${startDateObj
              .getDate()
              .toString()
              .padStart(2, "0")}/${startDateObj.getFullYear()}`,
          startTime
        )}`,
        `DTEND;TZID=America/New_York:${formatDate(
          `${(startDateObj.getMonth() + 1)
            .toString()
            .padStart(2, "0")}/${startDateObj
              .getDate()
              .toString()
              .padStart(2, "0")}/${startDateObj.getFullYear()}`,
          endTime
        )}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${dayFormat};UNTIL=${endDateObj.getFullYear()}${(
          endDateObj.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}${endDateObj
            .getDate()
            .toString()
            .padStart(2, "0")}T235959Z`,
        `LOCATION:` + (includeLocation ? `${location}` : ""),
        `END:VEVENT`,
      ];
    }
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


    return url;
  }

  // validates the file name as an error can occur otherwise
  function nameValidation(name) {
    const nonoChars = `< > : " / \\ | ? *`.split(" ");
    const nonoStart = ".".split(" ");

    const hasNonoChars = nonoChars.some((e) => name.includes(e));
    const startsWithNoNo = nonoStart.some((e) => name.trim().startsWith(e));

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
        };
      } else {
        button.toggleAttribute("disabled", true);
        message.textContent =
          "You seem to be on Banner. Please go to a page where you can view your schedule.";
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
      message.textContent =
        'Please click on "Schedule Details". If you have already done this, I am unable to see your classes. Try switching terms, clicking out and back in "schedule details", or refreshing the page. If nothing works, use the feedback form to receive support.';
      changeStep(2);
      message.classList.add("show", "alert");
      button.toggleAttribute("disabled", true);
      return;
    }

    if (msg === "greenLight") {
      changeStep(3);
    }

    if (msg === "SCHEDULE FETCHING ATTEMPTED: NO CLASSES FOUND") {
      button.textContent = "No classes detected";
      message.classList.add("error", "show");
      message.textContent =
        "No class detected! You may need to change your term. Otherwise, please try again later once you have registered for this class.";
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
  document.addEventListener("change", (event) => {
    if (
      event.target.tagName === "INPUT" &&
      event.target.getAttribute("type") === "checkbox"
    ) {
      const id = event.target.id;
      if (id.includes("waitlisted")) {
        settings[id] = event.target.checked;
        return;
      }
      const index = parseInt(id.match(/\d+/)[0]);
      const setting = id.match(/\D+/)[0];
      actionHistory.push(`User changed the following setting: ${setting} at index ${index} with a new value of ${event.target.checked}`);
      settings[setting][index] = event.target.checked;

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

        const event = buildICSEvent(
          schedule.indexOf(course),
          displayName,
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
        );
        if (!event) continue;
        events.push(
          event
        );
      }


      const file = buildICSFile(events);



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
        actionHistory.push(`User clicked on the Select All button with the Select Menu value: ${value}`);


        for (let i = 0; i < schedule.length; i++) {
          if (schedule[i].days === "ASYNCHRONOUS") continue;
          settings[value][i] = true;
          document.querySelector(`#${value}${i}`).checked = true;
        }
      };

      deselectAll.onclick = () => {
        const selectBox = document.querySelector("#optionSelect");
        const value = selectBox.value;
        actionHistory.push(`User clicked on the Deselect All button with the Select Menu value: ${value}`);

        for (let i = 0; i < schedule.length; i++) {
          if (schedule[i].days === "ASYNCHRONOUS") continue;
          settings[value][i] = false
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
      if (injection_error) return;

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
        "Include professor names",
        "Only include primary professor",
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

        const asynchronous = days === "ASYNCHRONOUS";


        const index = schedule.indexOf(course);

        const clas = document.createElement("details");
        const summary = document.createElement("summary");
        const span = document.createElement("span");
        const checkbox = document.createElement("input");
        const options = document.createElement("div");
        const courseDetails = document.createElement("div");
        const br = document.createElement("br");

        const renameClass = (e, isKeyBoard = false) => {
          if (e.target.tagName !== "SPAN" && !isKeyBoard) return;
          if (editingName) return;
          actionHistory.push(`User double clicks Class #${index + 1} to rename it`);
          clas.open = true;

          const span = summary.querySelector('span');
          const checkbox = summary.querySelector('input[type="checkbox"]')
          const text = document.createElement('input');

          text.type = "text";
          text.value = span.textContent;

          summary.replaceChildren(text, checkbox)
          text.focus();
          text.select();

          editingName = true;

          const handleSpaceBar = (e) => {
            if (e.key === " ") e.preventDefault()
          }

          const finalizeText = async (reset = false) => {
            const trimmed = text.value.trim()
            if (!reset && !/^\s*$/.test(text.value)) {
              actionHistory.push(`User renames Class #${index + 1} from ${span.textContent} to \`${trimmed}\``);
              span.textContent = trimmed;
            } else {
              actionHistory.push(`User resets Class #${index + 1}'s name from ${span.textContent} to \`${courseTitle}\``);
              span.textContent = courseTitle;
            }
            schedule[index].displayName = span.textContent;

            summary.replaceChildren(span, checkbox);
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
        const courseStr = `${courseTitle}`;



        span.textContent = courseStr;

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

        summary.append(span, checkbox);

        const infoObj = {
          asynchronous,
          waitlisted,
          Section: section.toUpperCase(),
          Professors: prof.join(", "),
          "Class Active": `${startDate} - ${endDate}`,
          Days: days.replaceAll(",", ", "),
          Time: `${startTime} - ${endTime}`,
          Location: hasLocation ? `${buildingName} ${roomNumber}` : "No location found; likely online",

        }

        for (const [key, value] of Object.entries(infoObj)) {
          const div = document.createElement('div');
          const b = document.createElement('b');

          if (key === "waitlisted") {
            if (!value) continue;
            div.append("This class is WAITLISTED");
            courseDetails.append(div);
            continue;
          } else if (key === "asynchronous") {
            if (!value) continue;
            div.append(`This class is likely asynchronous as the extension could not find a time/day. If you include this course in your .ics file, it will ONLY (1) create an all-day event on ${startDate}.`);
            courseDetails.append(div);
            continue;
          }



          b.textContent = key + ":";
          div.append(b, " ", value);
          courseDetails.append(div);
          if (key === "Class Active" && asynchronous) break;
        }

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
            (option.includes("professor") && prof[0] === "No professor")
          )
            checkbox.checked = false;

          if (option.includes('location') && asynchronous) checkbox.disabled = true;
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


      message.textContent =
        "Classes successfully loaded. Check the steps located at the bottom of the page to learn how to customize your .ics file.";

      message.classList.add("success", "show");

      fileName.style.display = "flex";


      button.textContent = "Export .ICS File";
      button.classList.add("export");
      button.toggleAttribute("disabled", false);
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
  });

  // formats date and time to YYYYMMDDTHHmmss format
  // assumes dateStr argument follows this format: MM/DD/YYYY
  function formatDate(dateStr, timeStr, justDate) {
    const [month, day, year] = dateStr.split("/");

    // turn time to 24h time
    const [time, AMPM] = timeStr.split("  ");
    let [hour, minute] = time.split(":");

    if (AMPM === "PM" && hour !== "12") {
      hour = parseInt(hour) + 12; // add 12 to hour to convert to 24 hr time; example: 6 pm + 12 = 18:00
    }

    if (AMPM === "AM" && hour === "12") {
      hour = "00";
    }
    return justDate ? `${year}${month}${day}` : `${year}${month}${day}T${hour.toString().padStart(2, "0")}${minute.toString().padStart(2, "0")}00`;
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

  function cutOffString(str, charLimit) {
    if (str.length > charLimit) return str.substring(0, charLimit + 1) + " ...";
    return str;
  }
})();

