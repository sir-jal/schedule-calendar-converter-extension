import { Course } from "./course.js";
import { getJSON } from "../utils/tools/getJSON.js";
import { Settings } from "../utils/tools/setting.js";
import { InvalidSettingError } from "./Errors/InvalidSettingError.js";
import { DEFAULT_SETTINGS } from "../utils/tools/config.js";

/**
 * A class representing a schedule, a list of courses. Contains methods that manages, filters, and indexes courses
 */
export class Schedule {
    #courses;
    #version;
    #settings = {};
    #id;

    /**
     * Creates a Schedule object
     * @param  {...Course} courses The courses to start with. Can be left blank.
     */
    constructor(...courses) {
        this.#courses = courses;

        getJSON(chrome.runtime.getURL("manifest.json")).then(e => {
            this.#version = e.version;
        })

        for (const setting of Settings.ScheduleSettings) {
            this.#settings[Settings.convertSettingToId(setting)] = true;
        }

        this.#id = "S" + crypto.randomUUID(); // the "S" prevents .querySelector errors in the case that the uuid starts with a number
    }
    /**
     * The version of the schedule. This corresponds with the version of the extension at the time this schedule was created
     * @returns {string}
     */
    get version() {
        return this.#version;
    }

    /**
     * The id of the schedule
     * @returns {string}
     */
    get id() {
        return this.#id;
    }

    /**
     * Change a class setting
     * @param {string} key 
     * @param {boolean} value
     * @throws If the key is invalid, meaning the key is not a setting, an error is thrown
    */
    setSetting(key, value) {
        const keys = Settings.ScheduleSettings.map(e => Settings.convertSettingToId(e));
        if (!keys.includes(key)) throw new InvalidSettingError(`Invalid key: ${key} is not a valid key for class settings`);
        this.#settings[key] = value;
    }

    /**
     * Gets a setting using its key
     *
     * @param {string} key
     * @returns {boolean} The value of the key; could be null/undefined
     */
    getSetting(key) {
        return this.#settings[key];
    }

    /**
     * Adds a course to the schedule
     * @param  {...Course} courses The course(s) to add
     */
    addCourse(...courses) {
        this.#courses.push(...courses);
    }

    /**
     * Returns only waitlisted courses. Does not affect the Schedule
     * @returns {Course[]} all waitlisted courses in the Schedule
     */
    getWaitlistedCourses() {
        return this.#courses.filter(e => e.isWaitlisted());
    }

    /**
     * Returns only courses with no meeting information. Does not affect the Schedule
     * @returns {Course[]} all courses without meeting information
     */
    getNoMeetingCourses() {
        return this.#courses.filter(e => e.hasNoMeetingInfo());
    }

    /**
     * Finds a course by its id
     * @param {string} id The id to search for
     * @returns {Course} The course with the search id; could be null/undefined
     */
    findCourseById(id) {
        return this.#courses.find(e => e.id === id);
    }

    /**
     * Returns the Course at the provided index
     * @param {number} index The index to get
     * @returns {Course} the course at the provided index; could be null/undefined
     */
    at(index) {
        return this.#courses[index];
    }

    /**
     * Finds a course by its id and returns its index
     * @param {string} id The id to search for
     * @returns {number} the index at which the course is located. an index of **-1** means the course could not be found
     */
    findCourseIndex(id) {
        return this.#courses.findIndex(e => e.id === id);
    }


    /**
     * Removes a course from the Schedule using its index
     * @param {number} index The target index of the class to be removed
     * @returns {boolean} whether or not the course was successfully removed
     */
    removeCourseByIndex(index) {
        this.#courses.splice(index, 1);
    }

    /**
     * Removes a course from the Schedule using its id
     * @param {string} id The id of the class to be removed
     * @returns {boolean} whether or not the class was successfully removed
     */
    removeCourseById(id) {
        const index = this.#courses.findIndex(e => e.id === id);
        this.#courses.splice(index, 1);
        return index !== -1;
    }

    /**
     * The length (number of courses) of the schedule
     */
    get length() {
        return this.#courses.length;
    }

    /**
     * Fetches all courses of the schedule
     * @returns {Course[]} the courses in the schedule
     */
    getCourses() {
        return this.#courses.slice(); // .slice() CLONES the array
    }

    /**
     * Fetches all included courses of the schedule
     * @returns {Course[]} the courses
     */
    getIncludedCourses() {
        return this.#courses.filter(e => e.getSetting("includecourse"));
    }

    /**
     * Converts the schedule to an .ICS file
     * 
     * @returns {string} The .ics file content
     */
    async toICS() {
        const included = this.getIncludedCourses();
        const filtered = this.#settings.includewaitlistedcourses ? included : included.filter(e => !e.isWaitlisted());
        const icsEvents = [];

        if (filtered.length === 0) return "ONE_CLASS_ERROR";
        for (const course of filtered) {
            const ics = await course.toICS();
            if (ics === "PARSING ERROR") {
                return ics;
            }

            icsEvents.push(ics);
        }

        const scheduleData = this.toJSON();

        return `BEGIN:VCALENDAR
X-SCHEDULE-DATA:${JSON.stringify(scheduleData)}
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
PRODID:-//Sir Jal//Calendar Extension importable//EN
${icsEvents.join("\n")}\nEND:VCALENDAR`.split("\n").join("\r\n");


    }

    /**
     * Converts the schedule to JSON (object)
     * @returns the json
     */
    toJSON() {
        const json = {
            version: this.version,
            id: this.id,
            settings: this.#settings,
            dataVersion: 2,
            courses: this.#courses.map(e => e.toJSON())
        };

        return json;
    }

    /**
     * Converts a JSON/object to a schedule object
     * 
     * @param {object} obj the object to convert
     * @returns {Schedule} the schedule
     */
    static fromJSON(json) {
        const schedule = new Schedule();

        try {
            var obj = typeof json === "string" ? JSON.parse(json) : json;
        } catch (e) {
            return schedule;
        }
        if (Object.keys(obj).length === 0) return schedule;

        const courses = [];


        for (const course of obj.courses) {
            const c = Course.fromJSON(course, obj.FORCE_PRESERVE);

            courses.push(c);
        }
        schedule.addCourse(...courses);

        for (const [key, value] of Object.entries(obj.settings)) {
            schedule.setSetting(key, value);
        }

        return schedule;
    }

    /**
     * Clears the schedule
     */
    clear() {
        const event = new CustomEvent("schedule-clear", {
            detail: {
                scheduleId: this.id,
            },
            bubbles: true,
            cancelable: false
        });

        document.dispatchEvent(event);
        this.#courses = [];
    }

    /**
     * Groups this schedule's courses.
     * 
     * @param {typeof DEFAULT_SETTINGS.courseCategorization} groupCritiera The criteria to group by. This is an object
     * that tells this function what to group
     * @returns {{[category: string]: Course[]}} The courses categorized by course code
     */
    groupCourses(groupCritiera) {

        const obj = { "No Meeting Time": [], "Waitlisted": [] };

        const courseMinimums = {
            "No Meeting Time": 1,
            "Waitlisted": 1,
            "Course Code": 2,
            "Uncategorized": -1
        };

        const {
            groupNoMeetingTime,
            groupWaitlistedCourses,
            groupCourseCode,
        } = groupCritiera;


        const lesCourses = this.#courses.slice();

        const uncategorized = [];
        for (const course of lesCourses) {
            const isNoMeeting = course.hasNoMeetingInfo();
            const isWaitlisted = course.isWaitlisted();

            if (isNoMeeting && groupNoMeetingTime) {
                obj["No Meeting Time"].push(course);
            } else if (isWaitlisted && groupWaitlistedCourses) {
                obj["Waitlisted"].push(course);

            } else if (groupCourseCode) {
                const courseCode = course.getCourseCode();
                const arr = obj[courseCode];
                if (arr) arr.push(course);
                else obj[courseCode] = [course];

            } else {
                uncategorized.push(course);
            }



        }

        const entries = Object.entries(obj);
        const mininumNonCompliant = entries.filter(e => {
            const category = e[0];
            const arr = e[1];
            const minimum = courseMinimums[category] ?? courseMinimums["Course Code"];
            if (minimum === -1) return false;

            return arr.length < minimum;
        });

        for (const [category, courses] of mininumNonCompliant) {
            uncategorized.push(...courses);
            delete obj[category];
        }
        return { ...obj, "Uncategorized": uncategorized };
    }
}
