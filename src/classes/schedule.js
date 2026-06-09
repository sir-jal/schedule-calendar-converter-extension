import { Course } from "./course.js";
import { getJSON } from "../utils/tools/getJSON.js";

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

        getJSON("../../../manifest.json").then(e => {
            this.#version = e.version;
        })

        for (const setting of Schedule.Settings) {
            this.#settings[Course.convertSettingToId(setting)] = true;
        }

        this.#id = "S" + crypto.randomUUID(); // prevents .querySelector errors
    }

    static get Settings() {
        return ["Include waitlisted courses"];
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
        const keys = Object.keys(this.#settings);
        if (!keys.includes(key)) throw new Error(`Invalid key: ${key} is not a valid key for class settings`);
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
     * Returns only asynchronous courses. Does not affect the Schedule
     * @returns {Course[]} all asynchronous courses in the Schedule
     */
    getAsyncCourses() {
        return this.#courses.filter(e => e.isAsync());
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
    getAtIndex(index) {
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
    toICS() {
        const included = this.getIncludedCourses();
        const filtered = this.#settings.includewaitlistedcourses ? included : included.filter(e => !e.isWaitlisted());
        const icsEvents = filtered.map(e => e.toICS());
        return `BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nPRODID:-//Sir Jal//Calendar Extension importable//EN\n${icsEvents.join(
            "\n"
        )}\nEND:VCALENDAR`
            .split("\n")
            .join("\r\n");
    }

    /**
     * Converts the schedule to JSON (object)
     * @returns {object} the json
     */
    toJSON() {
        const json = {
            version: this.version,
            courses: this.#courses.map(e => e.toJSON()),
            settings: this.#settings
        };

        return json;
    }

    /**
     * Converts a JSON/object to a schedule object
     * 
     * @param {object} obj the object to convert
     * @returns {Schedule} the schedule
     */
    static fromJSON(obj) {
        const schedule = new Schedule();
        const courses = [];


        for (const course of obj.courses) {
            const c = Course.fromJSON(course);

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
        this.#courses = [];
    }
}