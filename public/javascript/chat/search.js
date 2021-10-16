const searchFunction = function() { //Search for users
    let input = document.getElementById("search-input");
    let filter = input.value.toLowerCase();
    let list = document.getElementById("user-list");
    let options = [];

    let users = list.getElementsByClassName('form-check');
    for (i = 0; i < users.length; i++) { //Iterate through users and see if their info matches label
        options = [];
        let user = users[i].getElementsByTagName('label')[0];
        let txtValue = user.textContent || user.innerText;
        for (let element of txtValue.split(' ')) {options.push(txtValue);} //Add each text element to searchable array

        //If value is included in HTML DOM object
        if (txtValue.toLowerCase().includes(filter)) {
            users[i].style.display = "";
        //If value is close enough by Levenshtein distance (typo)
        } else if (matchTypo(filter, options).length > 0 && matchTypo(filter, options)[0] < 3) { //If there exists some value close to typo (distance 3 arbitrarily defined)
            users[i].style.display = "";
        //No matching value found
        } else {
            users[i].style.display = "none";
        }
    }
}
