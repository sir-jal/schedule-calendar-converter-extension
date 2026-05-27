import { Course } from "./course.js";

/**
 * A class representing a schedule, a list of courses. Contains methods that manages, filters, and indexes courses
 */
export class Schedule {
    #courses;
    #version;

    /**
     * Creates a Schedule object
     * @param  {...Course} courses The courses to start with. Can be left blank.
     */
    constructor(...courses) {
        this.#courses = courses;
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
        return this.#courses.find(e => e.getId() === id);
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
        return this.#courses.findIndex(e => e.getId() === id);
    }


    /**
     * Removes a course from the Schedule using its index
     * @param {number} index The target index of the class to be removed
     */
    removeCourseByIndex(index) {
        this.#courses.splice(index, 1);
    }

    /**
     * Removes a course from the Schedule using its id
     * @param {string} id The id of the class to be removed
     */
    removeCourseById(id) {
        this.#courses.splice(this.#courses.findIndex(e => e.getId() === id), 1);
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
        return this.#courses.slice();
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
    toICS(includeWaitlisted = false) {
        debugger;
        const included = this.#courses.filter(e => e.getSetting("includecourse"));
        const filtered = includeWaitlisted ? included : included.filter(e => !e.isWaitlisted());
        const icsEvents = filtered.map(e => e.toICS());
        return `BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nPRODID:-//Sir Jal//Calendar Extension importable//EN\n${icsEvents.join(
            "\n"
        )}\nEND:VCALENDAR`
            .split("\n")
            .join("\r\n");
    }
}