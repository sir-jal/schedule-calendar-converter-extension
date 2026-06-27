const logos = {
    "webpages/home webpages/guide/index.html webpages/guide/extension.html":
        chrome.runtime.getURL("src/images/extension logo.png"),
    "webpages/import": chrome.runtime.getURL("src/images/import page logo.png"),
    "webpages/guide/customization.html": chrome.runtime.getURL("src/images/settings customization logo.png"),
    "webpages/guide/troubleshooting.html": chrome.runtime.getURL("src/images/troubleshooting logo transparent.png")

}

fetch(chrome.runtime.getURL("src/pages/webpages/components/nav.html")).then(e => e.text()).then(e => {
    const navigation = document.querySelector(".navigation");
    navigation.insertAdjacentHTML("beforeend", e);

    const path = window.location.pathname;
    const keys = Object.keys(logos);

    const matchKey = keys.find(e => {
        const split = e.split(" ");
        return split.some(p => path.includes(p));
    })

    const curPage = ["guide", "import"].find(e => path.includes(e));

    document.querySelector("nav img#pageLogo").setAttribute("src", logos[matchKey]);
    if (curPage) document.querySelector(`nav #${curPage}Page`).classList.toggle("currentPage", true);
})