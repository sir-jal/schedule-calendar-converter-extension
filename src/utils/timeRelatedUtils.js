/**
 * Delays a function call
 * @param {number} time The amount of time, in miliseconds, to wait
 * @param {function} func The function to call after the delay
 * @param {*[]} args Arguments to pass into the function
 */
export function delay(time, func, ...args) {
    setTimeout(() => {
        func(args);
    }, time);
}


/**
 * Pauses the code for a set amount of time
 * @param {number} ms Number of miliseconds to wait
 * @returns A promise that pauses the code
 */
export async function wait(ms) {
    return new Promise((res, rej) => {
        setTimeout(res, ms);
    })
}