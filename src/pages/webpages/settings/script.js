import { Settings } from "../../../utils/tools/setting.js"
import { ExtensionSettingsManager } from "../../../utils/tools/config.js";
import { wait, delay } from "../../../utils/tools/timeRelatedUtils.js"

(async () => {
    const perCourseSettingsContainer = document.querySelector("#leCourseSettings");
    const courseSettings = Settings.CourseSettings.slice(1);

    const saveButton = document.querySelector("#saveButton");
    const resetButton = document.querySelector("button#reset");
    const saveCooldown = 15000;
    let preventDefault = false;

    const curSettings = await ExtensionSettingsManager.getAll();

    /**
     * 
     * @param {HTMLInputElement} element 
     */
    const enforceSettingOverlaps = (element) => {


        const childSettings = document.querySelectorAll(`[parentSetting="${element.getAttribute("settingKey")}"]`);

        switch (element.tagName.toLowerCase()) {
            case "input": {
                for (const child of childSettings) {
                    child.disabled = !element.checked;
                }
                break;
            }

            case "select": {
                for (const child of childSettings) {
                    const disableOnValue = child.getAttribute("disableOnValue");
                    if (disableOnValue === element.value) {
                        child.disabled = true;
                    } else {
                        child.disabled = false;
                    };
                }
                break;
            }
        }
    }

    for (const setting of courseSettings) {
        const id = Settings.convertSettingToId(setting);
        const container = document.createElement("div");
        container.classList.add("settingContainer");

        const check = document.createElement("input");
        check.type = "checkbox";
        check.checked = true;
        check.id = id;
        check.setAttribute("settingKey", check.id);

        const label = document.createElement("label");
        label.htmlFor = check.id;
        label.textContent = setting;

        // check overlaps
        const overlapArray = Settings.CourseSettingOverwrites().find(e => e.includes(id));
        if (overlapArray) {
            if (overlapArray[0] === id) {
                check.classList.add("parentSetting");
            } else {
                check.setAttribute("parentSetting", overlapArray[0]);
            }
        }

        container.append(check, label);
        perCourseSettingsContainer.append(container);
    }

    for (const key in curSettings) {
        for (const setting in curSettings[key]) {
            const inputElement = document.querySelector(`[settingKey="${setting}"]`);
            if (!inputElement) throw new Error("Could not find setting on the page: " + setting);

            const tagName = inputElement.tagName.toLowerCase();

            switch (tagName) {
                case "input": {
                    inputElement.checked = curSettings[key][setting];
                    break;
                }

                case "select": {
                    inputElement.value = curSettings[key][setting];
                    break;
                }
            }
        }
    }

    document.addEventListener("change", (event) => {
        const element = event.target;

        const tagName = element.tagName.toLowerCase();

        const setting = element.getAttribute("settingKey");
        const whichKey = Object.entries(curSettings).find(e => Object.keys(e[1]).includes(setting))[0];
        curSettings[whichKey][setting] = tagName === "input" ? element.checked : element.value;

        enforceSettingOverlaps(element);

        preventDefault = true;
    })

    const enforceCooldown = (cooldownLeft) => {

        let cooldownRemaining = cooldownLeft - (cooldownLeft % 1000);

        saveButton.disabled = true;
        saveButton.textContent = `Saved. Wait ${cooldownRemaining / 1000} second(s) to click again.`;

        const interval = setInterval(() => {
            if (cooldownRemaining === 0) {
                clearInterval(interval);
                saveButton.disabled = false;
                saveButton.textContent = "Save";
                return;
            }
            cooldownRemaining -= 1000;
            saveButton.textContent = `Saved. Wait ${cooldownRemaining / 1000} second(s) to click again.`;
        }, 1000);
    }

    saveButton.addEventListener("click", async () => {
        let cooldownRemaining = saveCooldown;

        await ExtensionSettingsManager.setSettings(curSettings);
        enforceCooldown(saveCooldown);

        preventDefault = false;

    })

    resetButton.addEventListener("click", async e => {
        console.log(ExtensionSettingsManager.settingsAreDefault(curSettings));
        const warned = resetButton.classList.contains("warned");
        const prevText = resetButton.textContent;
        if (!warned) {
            resetButton.textContent = "Are you sure? Press again to reset.";
            await wait(700);
            resetButton.classList.add("warned");
            await delay(2000, () => {
                resetButton.textContent = prevText;
                resetButton.classList.remove("warned");
            })
        } else {
            preventDefault = false;
            await ExtensionSettingsManager.resetToDefault();
            window.location.reload();
        }
    })

    const lastEdit = await ExtensionSettingsManager.getLastEditStamp();
    const difference = Date.now() - lastEdit;
    if (Date.now() - lastEdit <= saveCooldown) {
        enforceCooldown(saveCooldown - difference);
    }


    window.addEventListener('beforeunload', (e) => {
        if (preventDefault) e.preventDefault();
    })


    for (const parent of document.querySelectorAll(".parentSetting")) {
        enforceSettingOverlaps(parent);
    }
})()