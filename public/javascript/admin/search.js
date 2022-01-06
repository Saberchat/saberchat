const findFirstValue = function(strings) {
    for (let value of strings) { //Find the first value (remove all whitespace)
        if (!["\n", ''].includes(value)) {return strings.slice(strings.indexOf(value));}
    }
}

const searchFunction = function(searchInput, classname) { //Function to search for object info within body
    const objects = document.getElementsByClassName(classname);
    let filter = searchInput.value.toLowerCase();
    let options = [];

    for (let i = 0; i < objects.length; i += 1) { //Iterate through object list and see if any text/class names match the search input
        options = [];
        //Parse out displayable text content from HTML DOM object
        for (let element of ((objects[i].textContent.replace("User Exists", '')).trim().split('\n')[0]).split(' ')) {
            options.push(element.split('(').join('').split(')').join('').toLowerCase());
        }

        //Add all class names (including status, permission, etc.)
        for (let item of objects[i].classList.toString().toLowerCase().split(' ')) {
            options.push(item);
        }

        //If value is included in HTML DOM object
        if ((objects[i].textContent.replace("User Exists", '').trim().split('\n')[0]).toLowerCase().includes(filter) || objects[i].classList.toString().toLowerCase().includes(filter.toLowerCase())) {
            objects[i].hidden = false;
        //If value is close enough by Levenshtein distance (typo)
        } else if (matchTypo(filter, options).length > 0 && matchTypo(filter, options)[0] < 3) { //If there exists some value close to typo (distance 3 arbitrarily defined)
            objects[i].hidden = false;
        //No matching value found
        } else {
            objects[i].hidden = true;
        }
    }
}