export class InvalidSettingError extends Error {
    constructor(msg) {
        super("\n" + msg);
    }
}