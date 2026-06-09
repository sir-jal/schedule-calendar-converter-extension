import { formatDays, formatDate } from "../utils/tools/formatting.js";
import { Schedule } from "./schedule.js";

/**
 * A class representing a course. Contains methods and constants useful for managing a course
 */
export class Course {
    #courseTitle;
    #displayName;
    #courseCode;
    #days;
    #time;
    #startDate;
    #endDate;
    #startTime;
    #endTime;
    #buildingName;
    #roomNumber;
    #section
    #prof
    #waitlisted;
    #id;

    #settings = {
        includecoursecode: true,
        includeclasslocation: true,
        includesection: true,
        onlyincludeprimaryprofessor: true,
        includeprofessornames: true,
        includecourse: true
    }


    /**
     * Course settings that apply to every course
     */
    static get CourseSettings() {
        return [
            "Include course",
            "Include course code",
            "Include professor names",
            "Only include primary professor",
            "Include section",
            "Include class location",
        ];
    }

    /**
     * An array of string arrays that represent course settings that overlap each other
     * 
     * Setting A overlaps Setting B if Setting A is required for Setting B to function.
     * 
     */
    static get SettingOverwrites() {
        return [
            ["includeprofessornames", "onlyincludeprimaryprofessor"]
        ]
    }

    /**
     * Converts a setting (string) to an id by trimming it, removing all spaces, and lowercasing all characters
     * @param {string} setting The setting to convert
     * @returns {string} The id
     */
    static convertSettingToId(setting) {
        return setting.trim().replaceAll(" ", "").toLowerCase();
    }

    /**
     * Creates a course object
     * @param {object} data The class object
     */
    constructor(data) {
        this.#courseTitle = data.courseTitle;
        this.#displayName = data.displayName ?? data.courseTitle;
        this.#courseCode = data.courseCode;
        this.#days = data.days;
        this.#startDate = data.startDate;
        this.#endDate = data.endDate;
        this.#startTime = data.startTime;
        this.#endTime = data.endTime;
        this.#time = `${this.#startTime} - ${this.#endTime}`;
        this.#buildingName = data.buildingName;
        this.#roomNumber = data.roomNumber;
        this.#section = data.section;
        this.#prof = data.prof;
        this.#waitlisted = data.waitlisted;
        this.#id = data.id ?? crypto.randomUUID();
    }

    /**
     * Checks if the class is asynchronous. 
     * A class is asynchronous if the class doesn't have a meet time or weekday(s)
     *
     * @returns {boolean} A boolean value; whether or not the class is async
     */
    isAsync() {
        const isAsyncTimeDay = (!this.#endTime && !this.#startTime) || !this.#days;
        const isAsyncText = this.#endTime === "ASYNCHRONOUS";
        return isAsyncText || isAsyncTimeDay;
    }

    /**
     * Checks if the class is waitlisted
     * @returns {boolean} A boolean value; whether or not the class is waitlisted
     */
    isWaitlisted() {
        return this.#waitlisted;
    }


    /**
    * Sets the display name
    * @param {string} name The new name
    */
    setDisplayName(name) {
        this.#displayName = name;
    }

    /**
     * 
     * @returns {string}
     */
    getDisplayName() {
        return this.#displayName;
    }

    /**
     * 
     * @returns {string}
     */
    getCourseTitle() {
        return this.#courseTitle;
    }

    /**
     * 
     * @returns {string}
     */
    getCourseCode() {
        return this.#courseCode;
    }

    /**
     * 
     * @returns {string}
     */
    getDays() {
        return this.#days;
    }

    /**
     * 
     * @returns {string}
     */
    getTime() {
        return this.#time;
    }

    /**
     * 
     * @returns {string}
     */
    getStartDate() {
        return this.#startDate;
    }

    /**
     * 
     * @returns {string}
     */
    getEndDate() {
        return this.#endDate;
    }

    /**
     * 
     * @returns {string}
     */
    getStartTime() {
        return this.#startTime;
    }

    /**
     * 
     * @returns {string}
     */
    getEndTime() {
        return this.#endTime;
    }

    /**
     * 
     * @returns {string}
     */
    getBuildingName() {
        return this.#buildingName;
    }

    /**
     * 
     * @returns {string}
     */
    getRoomNumber() {
        return this.#roomNumber;
    }

    /**
     * 
     * @returns {string}
     */
    getSection() {
        return this.#section;
    }

    /**
     * 
     * @returns {string[]}
     */
    getProf() {
        return this.#prof;
    }

    /**
     * 
     * @returns {string}
     */
    get id() {
        return this.#id;
    }

    /**
     * Converts the course to JSON (object)
     * @returns {object} the json
     */
    toJSON() {
        return {
            courseTitle: this.getCourseTitle(),
            displayName: this.getDisplayName(),
            courseCode: this.getCourseCode(),
            days: this.getDays(),
            time: this.getTime(),
            startDate: this.getStartDate(),
            endDate: this.getEndDate(),
            startTime: this.getStartTime(),
            endTime: this.getEndTime(),
            buildingName: this.getBuildingName(),
            roomNumber: this.getRoomNumber(),
            section: this.getSection(),
            prof: this.getProf(),
            waitlisted: this.isWaitlisted(),
            asynchronous: this.isAsync(),
            settings: this.#settings,
            id: this.#id
        }
    }

    /**
     * Converts a JSON/object to a course object
     * 
     * @param {object} obj the object to convert
     * @returns {Course} the schedule
     */
    static fromJSON(obj) {
        const course = new Course(obj);

        for (const [key, value] of Object.entries(obj.settings)) {
            course.setSetting(key, value);
        }

        return course;
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
     * Returns the course's settings
     * @returns {object} The settings
     */
    getAllSettings() {
        return { ...this.#settings };
    }

    /**
     * 
     *
     * @returns {boolean} Whether or not the class is online
     */
    isOnline() {
        return (
            (this.#buildingName === "None" && this.#roomNumber === "None") ||
            (this.#buildingName === "NA" && this.#roomNumber === "NA") ||
            (this.#buildingName === "Online" && this.#roomNumber === "Online"))
            || this.isAsync();
    }

    /**
     * Converts the course into an .ics event. An empty string will be returned if the class is not included, unless forced
     * 
     * @param {boolean} force Whether or not to force the conversion regardless of if
     * the course is being included. Defaults to **`false`** 
     * @returns {string} The course as an .ics event
     */
    toICS(force = false) {
        if (!this.getSetting("includecourse") && !force) return "";

        const includeCourseCode = this.getSetting("includecoursecode");
        const includeProfName = this.getSetting("includeprofessornames");
        const includeSection = this.getSetting("includesection");
        const includeLocation = this.getSetting("includeclasslocation");
        const onlyPrimaryProfessor =
            includeProfName && this.getSetting("onlyincludeprimaryprofessor");
        const asynchronous = this.isAsync();

        const dayFormat = formatDays(this.getDays());
        const location = !this.isOnline() ? `${this.#buildingName}\\, Room ${this.#roomNumber}` : "No location found";


        const [endDateObj, startDateObj] = [new Date(this.#endDate), new Date(this.#startDate)];

        // this is used to offset the days from the start date of the class. 
        // otherwise, every class will appear on the start date in iCloud calendar.
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

        const description = () => {
            let desc = "";
            if (asynchronous) desc += "No meeting time; asynchronous";
            if (includeProfName) {
                if (asynchronous) desc += "\\n"
                desc += `Professor(s): ${onlyPrimaryProfessor ? this.#prof[0] : this.#prof.join(", ")}`;
            }
            return desc;
        }

        let lines = [];
        lines.push(
            "BEGIN:VEVENT",
            `UID:${this.#id}`,
            `DTSTAMP:${today.toISOString().replace(/[-:]/g, "").split(".")[0]}`,
            `SUMMARY:${this.#waitlisted ? "[WL] " : ""}${includeCourseCode ? `${this.#courseCode}: ` : ""}${this.#displayName}` + (includeSection ? ` (${this.#section.toUpperCase()})` : ""),
            `DESCRIPTION:${description()}`
        )

        if (asynchronous) {
            lines.push(
                `DTSTART:${formatDate(
                    `${(startDateObj.getMonth() + 1).toString().padStart(2, "0")}/${startDateObj.getDate().toString().padStart(2, "0")}/${startDateObj.getFullYear()}`,
                    "12:00  AM", true)}`,
                //
                `DTEND:${formatDate(
                    `${(startDateObj.getMonth() + 1).toString().padStart(2, "0")}/${(startDateObj.getDate() + 1).toString().padStart(2, "0")}/${startDateObj.getFullYear()}`,
                    "12:00  AM", true)}`,
            )
        } else {
            const difference = indices[dayFormat.split(",")[0]] - startDateObj.getDay();
            startDateObj.setDate(startDateObj.getDate() + difference);
            lines.push(
                `DTSTART:${formatDate(
                    `${(startDateObj.getMonth() + 1).toString().padStart(2, "0")}/${startDateObj.getDate().toString().padStart(2, "0")}/${startDateObj.getFullYear()}`,
                    this.#startTime
                )}`,
                `DTEND:${formatDate(
                    `${(startDateObj.getMonth() + 1).toString().padStart(2, "0")}/${startDateObj.getDate().toString().padStart(2, "0")}/${startDateObj.getFullYear()}`,
                    this.#endTime
                )}`,
                `RRULE:FREQ=WEEKLY;BYDAY=${dayFormat};UNTIL=${endDateObj.getFullYear()}${(endDateObj.getMonth() + 1).toString().padStart(2, "0")}${endDateObj.getDate().toString().padStart(2, "0")}T235959`,
                `LOCATION:` + (includeLocation ? `${location}` : ""),
            );
        }

        // adding non-ics-related information to make importing easier
        lines.push(
            `courseTitle:${this.#courseTitle}`,
            `displayName:${this.#displayName}`,
            `prof:${this.#prof.join(", ")}`,
            `days:${this.#days}`,
            `startDate:${this.#startDate}`,
            `endDate:${this.#endDate}`,
            `startTime:${this.#startTime}`,
            `endTime:${this.#endTime}`, `section:${this.#section}`,
            `buildingName:${this.#buildingName}`,
            `roomNumber:${this.#roomNumber}`,
            `waitlisted:${this.#waitlisted}`,
            `courseCode:${this.#courseCode}`,
            "END:VEVENT");

        return lines.join("\n");
    }

}

const course = new Course("");
Course.convertSettingToId("")