const updateDisplayNewRoom = function() { //Update the list of new users, if room is switched from public to private
    let userSelect = document.getElementById('roomType');
    let display = document.getElementById('user-selection');
    if (userSelect.checked == true) { //If any users are selected from dropdown
        display.style.display = "block";
    } else {
        display.style.display = "none";
    }
}

const searchFunctionNewRoom = function() { //Search filter for users in new room
    let input = document.getElementById("search-input");
    let filter = input.value.toUpperCase();
    let list = document.getElementById("user-list");
    let users = list.getElementsByClassName('form-check');
    for (i = 0; i < users.length; i++) {
        let user = users[i].getElementsByTagName('label')[0];
        let txtValue = user.textContent || user.innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            users[i].style.display = "";
        } else {
            users[i].style.display = "none";
        }
    }
}
