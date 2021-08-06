const searchFunction = function() {
    const objects = document.getElementsByClassName('text-block');
    const breaks = document.getElementsByClassName('text-break');
    const searchInput = document.getElementById('search-input');
    let filter = searchInput.value.toLowerCase();

    for (let i = 0; i < objects.length; i += 1) {
        if (!objects[i].textContent.replace("(Read More)", "").toLowerCase().includes(filter)) {
            objects[i].hidden = true;
            breaks[i].hidden = true;

        } else {
            objects[i].hidden = false;
            breaks[i].hidden = false;
        }
    }
}
