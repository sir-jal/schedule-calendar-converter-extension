
/**
 * Pluralizes a string
 * @param {string} str The original string
 * @param {string} pluralStr The string to use if there is plurality
 * @param {number} num The number used to determine plurality
 * @returns {string} A string, either the original or the plural form depending on plurality
 */
export function pluralize(str, pluralStr, num) {
    return num === 1 ? str : pluralStr;
}