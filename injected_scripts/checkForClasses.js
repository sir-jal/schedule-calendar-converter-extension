(() => {
  if (document.querySelectorAll(".listViewWrapper").length === 0) {
    return chrome.runtime.sendMessage("noClass");
  }
  // if the website is technically correct but not in the right section
  if (
    document.querySelector("h1")?.textContent !==
    "View Registration Information"
  ) {
    return chrome.runtime.sendMessage("differentSection");
  }

  chrome.runtime.sendMessage("greenLight");
})();
