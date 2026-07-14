(async () => {
    const outer = document.querySelector("#contentDiv").outerHTML;
    chrome.runtime.sendMessage({
        title: "OUTER_HTML_CONTENT",
        body: outer
    })
})()