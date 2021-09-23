const findFirstValue = function(strings) {
    for (let value of strings) {
        if (!["\n", ''].includes(value)) { return value;}
    }
}
const searchFunction = function(searchInput, classname) { //Function to search for object info within body
    const objects = document.getElementsByClassName(classname);
    let filter = searchInput.value.toLowerCase();

    for (let i = 0; i < objects.length; i += 1) { //Iterate through object list and see if any text/class names match the search input
        if ((findFirstValue(objects[i].textContent.replace("User Exists", '').split(' ')).toLowerCase().includes(filter) || objects[i].classList.toString().toLowerCase().includes(filter.toLowerCase()))) {
            objects[i].hidden = false;
        } else {
            objects[i].hidden = true;
        }
    }
}