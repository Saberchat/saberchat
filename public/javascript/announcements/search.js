const searchFunction = (() => {
    const announcements = document.getElementsByClassName('text-block');
    const breaks = document.getElementsByClassName('text-break');
    const searchInput = document.getElementById('search-input');
    let filter = searchInput.value.toLowerCase();

    for (let i = 0; i < announcements.length; i += 1) {
        if (!announcements[i].innerText.replace("(Read More)", "").toLowerCase().includes(filter)) {
            announcements[i].hidden = true;
            breaks[i].hidden = true;

        } else {
            announcements[i].hidden = false;
            breaks[i].hidden = false;
        }
    }
})
