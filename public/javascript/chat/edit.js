const updateDisplay = function() { //Update room display based on edited buttons that are clicked
    let userSelect = document.getElementById('roomType');
    let display1 = document.getElementById('add-block');
    let display2 = document.getElementById('remove-block');
    const removeCount = document.getElementById('remove-user-list').childElementCount;
    const addCount = document.getElementById('add-user-list').childElementCount;
    if (userSelect.checked == true) { //If a user is selected to be added/removed
        if (addCount > 0) { //If there is at least one person to be added
            display1.style.display = "block";
        }
        if (removeCount > 0) { //If there is at least one person to be removed
            display2.style.display = "block";
        }
    } else { //If not, hide user
        display1.style.display = "none";
        display2.style.display = "none";
    }
}

const searchFunction = function(mode) { //Search for users within a chat room
    let input = document.getElementById(`${mode}-search-input`);
    let filter = input.value.toUpperCase();
    let list = document.getElementById(`${mode}-user-list`);
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

updateDisplay();
