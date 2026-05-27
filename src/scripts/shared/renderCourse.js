import { Course } from "../../classes/course.js";
import { wait } from "../../utils/timeRelatedUtils.js";

/**
 * Renders a course into the DOM.
 * @param {Course} course the course to render
 */
export function renderCourse(course) {
    const keysToEditName = ["e", "f2"];
    let editingName;
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
        asynchronous
    } = course.getAllDetails();

    const clas = document.createElement("details");
    const summary = document.createElement("summary");
    const displayNameSpan = document.createElement("span");
    const courseCodeSpan = document.createElement("span");
    const checkbox = document.createElement("input");
    const options = document.createElement("div");
    const courseDetails = document.createElement("div");
    const br = document.createElement("br");
    const classes = document.querySelector(".classes");
    const existingClasses = Array.from(document.querySelectorAll(".class"));
    const index = existingClasses.length;

    const renameClass = (e, isKeyBoard = false) => {

        if (e.target.tagName !== "SPAN" && !isKeyBoard) return;
        if (editingName) return;

        const displayNameSpan = summary.querySelector('span.displayName');
        const courseCodeSpan = summary.querySelector("span.courseCode");
        const checkbox = summary.querySelector('input[type="checkbox"]')
        const text = document.createElement('input');
        if (!checkbox.checked) return;

        summary.classList.toggle("nameEdit", true);

        // actionHistory.push(`User double clicks Class #${index + 1} to rename it`);
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
                // actionHistory.push(`User renames Class #${index + 1} from ${displayNameSpan.textContent} to \`${trimmed}\``);
                displayNameSpan.textContent = trimmed;
            } else {
                // actionHistory.push(`User resets Class #${index + 1}'s name from ${displayNameSpan.textContent} to \`${courseTitle}\``);
                displayNameSpan.textContent = courseTitle;
            }
            course.setDisplayName(displayNameSpan.textContent);

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


    // configure checkbox
    checkbox.type = "checkbox";
    checkbox.checked = !asynchronous;
    checkbox.id = "includecourse" + index;
    checkbox.classList.add("courseCheckbox");

    // add course code + name
    const courseStr = displayName;

    displayNameSpan.classList.add("displayName");
    courseCodeSpan.classList.add("courseCode");
    displayNameSpan.textContent = courseStr;
    courseCodeSpan.textContent = `${courseCode}: `

    courseCodeSpan.append(displayNameSpan);
    summary.append(courseCodeSpan, checkbox);

    if (waitlisted) waitlistedCourses.push(checkbox.id);

    course.setSetting("includecourse", checkbox.checked);

    clas.classList.add("class");
    options.classList.add("options");
    courseDetails.classList.add("classDetails");





    const hasLocation = !course.isOnline() && !asynchronous;


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
    for (const option of Course.CourseSettings) {
        const id = option.trim().replaceAll(" ", "").toLowerCase();

        const optionElement = document.createElement("div");
        optionElement.classList.add("option");

        const label = document.createElement("label");
        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.checked = true;
        if (
            ((option.includes("location") && (!hasLocation || asynchronous))) ||
            ((option.includes("professor") && prof[0] === "No professor")) ||
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

        course.setSetting(id, checkbox.checked);
    }


    clas.append(summary, br, courseDetails, options);
    classes.append(clas);
    if (asynchronous) {
        course.setSetting("includecourse", false);
    }
}