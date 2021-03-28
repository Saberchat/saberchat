const searchFunction = function(searchInput, classname) { //Function to search for object info within body
    const objects = document.getElementsByClassName(classname);
    let filter = searchInput.value.toLowerCase();

    for (let i = 0; i < objects.length; i += 1) { //Iterate through object list and see if any text/class names match the search input
        if ((objects[i].textContent.replace("User Exists", '').split('\n')[1].toLowerCase().includes(filter) || objects[i].classList.toString().toLowerCase().includes(filter.toLowerCase()))) {
            objects[i].hidden = false;
        } else {
            objects[i].hidden = true;
        }
    }
}