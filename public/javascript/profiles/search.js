const changeFollowerTab = function(newTab) {
    //Map relates tabs to their respective lists
    const tabMap = new Map([['followers-button', ['following-button', 'following-list']], ['following-button', ['followers-button', 'followers-list']]]);
    
    if (newTab.className.includes("btn-dark")) { //Change tab coloring to display which tab is active
        newTab.classList.add('btn-secondary');
        newTab.classList.remove('btn-dark');
    } else {
        newTab.classList.add('btn-dark');
        newTab.classList.remove('btn-secondary');
    }
    
    //Change colors based on user's darkmode (if the deselected tab's color was dark, make the selcted one dark, and vice versa)
    if (document.getElementById(tabMap.get(newTab.id)[0]).className.includes("btn-secondary")) {
        document.getElementById(tabMap.get(newTab.id)[0]).classList.add('btn-dark');
        document.getElementById(tabMap.get(newTab.id)[0]).classList.remove('btn-secondary');
    
    } else {
        document.getElementById(tabMap.get(newTab.id)[0]).classList.add('btn-secondary');
        document.getElementById(tabMap.get(newTab.id)[0]).classList.remove('btn-dark');
    }
    
    //Hide the list that is not being viewed (Followers/following)
    document.getElementById(tabMap.get(newTab.id)[1]).hidden = true;
    newTab.hidden = false;
    document.getElementById(tabMap.get(tabMap.get(newTab.id)[0])[1]).hidden = false;
}

const searchFunctionFollow = function(searchbar, delimeter) { //Search for followers/following in respective tabs
    const blocks = document.getElementsByClassName(`${searchbar.id.split('-')[2]}-block`); //Find all blocks with this information

    for (let b = 0; b < blocks.length; b++) { //Iterate through followers and see if there is overlap with search keyword
        if (!blocks[b].textContent.split(delimeter)[0].toLowerCase().includes(searchbar.value.toLowerCase())) {
            blocks[b].hidden = true;
        } else {
            blocks[b].hidden = false;
        }
    }
}

const searchFunction = function(statusString) { //Search for users on index page
    let statusHeaders = document.getElementsByClassName('status-header')
    let statusBreaks = document.getElementsByClassName('status-page-break')
    statusString = statusString.split(',');
    let statuses = [];
    for (let i = 0; i < statusString.length; i += 3) { //Build statuses array based on platform's stored statuses
        statuses.push([statusString[i], statusString[i+1], []])
    }

    let input = document.getElementById("search-input");
    let filter = input.value.toUpperCase();
    let list = document.getElementById("user-list");
    let listItems = list.getElementsByClassName("user-element");
    let a = list.getElementsByClassName("user-element-text");

    for (i = 0; i < a.length; i++) { //Iterate through each user's text and search for text overlap
        user = a[i].getElementsByClassName('username')[0];
        if (user.textContent.toUpperCase().includes(filter) || user.classList.toString().toUpperCase().includes(filter)) {
            listItems[i].style.display = "block";
        } else {
            listItems[i].style.display = "none";
        }
    }

    let statusIncluded;
    for (let status of statuses) { //Iterate through statuses and see if any users under this status match the keyword
        statusIncluded = false;
        for (let member of document.getElementsByClassName(status[0])) {
            if (member.textContent.toUpperCase().includes(filter) || member.classList.toString().toUpperCase().includes(filter)) {
                statusIncluded = true;
                break;
            }
        }

        if (statusIncluded) { //If users match the keyword, display status header
            for (let i = 0; i < statusHeaders.length; i += 1) {
                if (statusHeaders[i].textContent.includes(status[1])) {
                    statusHeaders[i].style.display = "block";
                    statusBreaks[i].style.display = "block";
                }
            }

        } else { //If no users match this keyword, hide the header
            for (let i = 0; i < statusHeaders.length; i += 1) {
                if (statusHeaders[i].textContent.includes(status[1])) {
                    statusHeaders[i].style.display = "none";
                    statusBreaks[i].style.display = "none";
                }
            }
        }
    }
}
