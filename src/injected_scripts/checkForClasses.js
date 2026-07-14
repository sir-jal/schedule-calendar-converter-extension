(() => {
  if (document.querySelectorAll(".listViewWrapper").length === 0) {
    return chrome.runtime.sendMessage({
      title: "NO_CLASS",
      body: "noClass"
    });
  }
  // if the website is technically correct but not in the right section
  if (
    document.querySelector("h1")?.textContent !==
    "View Registration Information"
  ) {
    return chrome.runtime.sendMessage({
      title: "DIFF_SECTION",
      body: "differentSection"
    });
  }

  chrome.runtime.sendMessage({
    title: "GREEN_LIGHT",
    body: "greenLight"
  });
})();
