const searchFunction = function() {
    const objects = document.getElementsByClassName('text-block');
    const breaks = document.getElementsByClassName('text-break');
    const searchInput = document.getElementById('search-input');
    let filter = searchInput.value.toLowerCase();
    let options = [];

    for (let i = 0; i < objects.length; i += 1) {
        options = [];
        for (let element of objects[i].textContent.replace("(Read More)", "").toLowerCase().split(' ')) {
            options.push(element);
        }

        //If value is included in HTML DOM object
        if (objects[i].textContent.replace("(Read More)", "").toLowerCase().includes(filter)) {
            objects[i].hidden = false;
            breaks[i].hidden = false;

        //If value is close enough by Levenshtein distance (typo)
        } else if (matchTypo(filter, options).length > 0 && matchTypo(filter, options)[0] < 3) { //If there exists some value close to typo (distance 3 arbitrarily defined)
            objects[i].hidden = false;
            breaks[i].hidden = false;
            
        //No matching value found
        } else {
            objects[i].hidden = true;
            breaks[i].hidden = true;
        }
    }
}
