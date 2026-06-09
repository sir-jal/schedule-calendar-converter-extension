/**
 * Fetches JSON data via API.
 * @param {string} fileName The name of the file or resource
 * @returns A json representation of the data fetched, null if no data is found
 */
export async function getJSON(fileName) {
    const request = await fetch(fileName);
    const json = await request.json();
    return json;
}