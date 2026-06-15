
/**
 * Traces all of an element's parents up to <html>
 * @param {HTMLElement} element The target element
 * @returns {HTMLElement[]} Returns an array of HTML elements that are parents of the target element.
 * Each element of the array is the direct descendant of the next, 
 * with the target element being the direct descendant of the first
 * element of the array. The last element will always be html
 */
export function getParents(element) {
    const parents = [];

    let curElement = element;

    while (curElement.tagName !== "HTML") {
        const parent = curElement.parentElement;
        parents.push(parent);

        curElement = parent;
    }

    return parents;
}