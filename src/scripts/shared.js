(() => {
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



    // formats days to .ics format. Wednesdays -> WE, Fridays -> FR


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

            schedule = schedule === undefined ? [] : schedule;

            if (Object.keys(event).length !== 0) schedule.push(event);

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
                if (schedule[i].days === "ASYNCHRONOUS") continue;

                const checkbox = document.querySelector(`#${settingToChange}${i}`);
                if (checkbox.disabled) continue;

                changeSetting(settingToChange, i, booleanValue);

                checkbox.checked = booleanValue;

                handleCheckmarkChange(false, checkbox);

            }
        }

        selectAll.onclick = () => {
            massChange(true);
        };

        deselectAll.onclick = () => {
            massChange(false);
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

                const displayNameSpan = summary.querySelector('span.displayName');
                const courseCodeSpan = summary.querySelector("span.courseCode");
                const checkbox = summary.querySelector('input[type="checkbox"]')
                const text = document.createElement('input');
                if (!checkbox.checked) return;

                summary.classList.toggle("nameEdit", true);

                actionHistory.push(`User double clicks Class #${index + 1} to rename it`);
                clas.open = true;





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
                    summary.classList.toggle("nameEdit", false);


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


            // add checkbox

            checkbox.type = "checkbox";
            checkbox.checked = !asynchronous
            checkbox.id = id + index;
            checkbox.classList.add('courseCheckbox');



            // add course code + name
            const courseStr = displayName;

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
                "Section": section.toUpperCase(),
                "Professors": prof.join(", "),
                "Class Active": `${startDate} - ${endDate}`,
                "Days": days.replaceAll(",", ", "),
                "Time": `${startTime} - ${endTime}`,
                "Location": hasLocation ? `${buildingName} ${roomNumber}` : "No location found; likely online",

            }

            // adds the class deatils
            for (const [key, value] of Object.entries(infoObj)) {
                const div = document.createElement('div');
                const valueSpan = document.createElement('span');
                const keySpan = document.createElement('span');
                const b = document.createElement('b');

                if (!value) continue;

                if (key === "waitlisted") {
                    div.append("This class is WAITLISTED. If included, this will be indicated by the prefix: [WL].");
                    courseDetails.append(div);
                    continue;
                } else if (key === "asynchronous") {
                    div.append(`This class is likely asynchronous as the extension could not find a time/day. If you include this course in your .ics file, it will ONLY (1) create an all-day event on ${startDate}.`);
                    courseDetails.append(div);
                    continue;
                } else if (key === "Course Code") {
                }



                b.textContent = key + "";
                keySpan.append(b);
                keySpan.classList.add('classDetailKey');

                valueSpan.textContent = value;
                valueSpan.classList.add('classDetailValue');

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
                    (option.includes("location") && (!hasLocation || asynchronous)) ||
                    (option.includes("professor") && prof[0] === "No professor") ||
                    (option.includes('code') && !courseCode)
                ) {
                    checkbox.checked = false;
                    checkbox.disabled = true;
                    checkbox.classList.add("disabled");
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
            if (asynchronous) handleCheckmarkChange(null, checkbox);
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


    // Display version information and update links for school searches (caching)
    window.addEventListener("load", async () => {
        const versionJson = await getJSON("../../manifest.json");
        version.textContent = versionJson.version;
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

    let schedule = []; // this is set by fetchSchedule()

    const optionsOverlap = [];

    /**
     * Handles when a checkmark is changed
     * @param {Event} event The event to handle
     * @param {*} checkbox You must provide the checkbox element if the function is being called outside of an event listener
     */
    function handleCheckmarkChange(event, checkbox = null) {
        const element = checkbox ?? event.target;
        if (
            element.tagName === "INPUT" &&
            element.getAttribute("type") === "checkbox"
        ) {
            const id = element.id;
            if (id.includes("waitlisted")) {

                changeSetting(id, -1, element.checked);

                for (const course of waitlistedCourses) {
                    const leCheckBox = document.querySelector(`#${course}`);
                    const index = parseInt(leCheckBox.id.match(/\d+/)[0]);
                    settings["includecourse"][index] = element.checked;

                    leCheckBox.disabled = !element.checked;
                    leCheckBox.checked = element.checked ? settings["includecourse"][index] : false;


                    handleCheckmarkChange(null, leCheckBox);
                }
                return;
            }

            const index = parseInt(id.match(/\d+/)[0]);
            if (element.classList.contains("courseCheckbox")) {
                const leClass = document.querySelectorAll('.class')[index];
                const checkboxes = Array.from(leClass.querySelectorAll('.option input[type="checkbox"]'));

                for (const checkbox of checkboxes) {
                    if (checkbox.classList.contains("disabled")) continue;
                    checkbox.disabled = !element.checked;
                }
            }

            const setting = id.match(/\D+/)[0];

            const overlapIndex = optionsOverlap.indexOf(optionsOverlap.find(e => e[0] === setting))
            if (overlapIndex !== -1) {
                for (const overlap of optionsOverlap[overlapIndex].slice(1)) {

                    const checkbox = document.querySelector(`#${overlap}${index}`);
                    checkbox.disabled = !element.checked;

                }
            }


            actionHistory.push(`User changed the following setting: ${setting} at index ${index} with a new value of ${element.checked}`);
            changeSetting(setting, index, element.checked);

        }
    }

    document.addEventListener("change", handleCheckmarkChange)




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
            validateText.classList.toggle("message", false);
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



})();
