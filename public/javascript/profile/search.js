const changeFollowerTab = function (newTab) {
    const tabMap = new Map([['followers-button', ['following-button', 'following-list']], ['following-button', ['followers-button', 'followers-list']]]);

    newTab.classList.add('btn-dark');
    newTab.classList.remove('btn-secondary');

    document.getElementById(tabMap.get(newTab.id)[0]).classList.add('btn-secondary');
    document.getElementById(tabMap.get(newTab.id)[0]).classList.remove('btn-dark');

    document.getElementById(tabMap.get(newTab.id)[1]).hidden = true;
    newTab.hidden = false;

    document.getElementById(tabMap.get(tabMap.get(newTab.id)[0])[1]).hidden = false;
}

const searchFunctionFollowers = function () {
    const searchBarFollowers = document.getElementById('search-bar-followers');
    const followerBlocks = document.getElementsByClassName('follower-block');

    for (let b = 0; b < followerBlocks.length; b++) {

        if (!followerBlocks[b].textContent.split('Remove')[0].toLowerCase().includes(searchBarFollowers.value.toLowerCase())) {
            followerBlocks[b].hidden = true;

        } else {
            followerBlocks[b].hidden = false;
        }
    }
}

const searchFunctionFollowing = function () {
    const searchBarFollowing = document.getElementById('search-bar-following');
    const followingBlocks = document.getElementsByClassName('following-block');

    for (let b = 0; b < followingBlocks.length; b++) {

        if (!followingBlocks[b].textContent.split('Unfollow')[0].toLowerCase().includes(searchBarFollowing.value.toLowerCase())) {
            followingBlocks[b].hidden = true;

        } else {
            followingBlocks[b].hidden = false;
        }
    }
}

const searchFunction = function () {
    let statusHeaders = document.getElementsByClassName('status-header')
    let statusBreaks = document.getElementsByClassName('status-page-break')
    let statuses = [["faculty", "Faculty", []], ["12th", "Seniors", []], ["11th", "Juniors", []], ["10th", "Sophomores", []], ["9th", "Freshmen", []], ["8th", "8th Graders", []], ["7th", "7th Graders", []], ["alumnus", "Alumni", []], ["parent", "Parents", []], ["guest", "Guests", []]]

    let input = document.getElementById("search-input");
    let filter = input.value.toUpperCase();
    let list = document.getElementById("user-list");
    let listItems = list.getElementsByClassName("user-element");
    let a = list.getElementsByClassName("user-element-text");

    for (i = 0; i < a.length; i++) {
        user = a[i].getElementsByClassName('username')[0];
        txtValue = user.textContent;
        if (txtValue.toUpperCase().includes(filter) || user.classList.toString().toUpperCase().includes(filter)) {
            listItems[i].style.display = "block";
        } else {
            listItems[i].style.display = "none";
        }
    }

    let statusIncluded;
    for (let status of statuses) {
        statusIncluded = false;
        for (let member of document.getElementsByClassName(status[0])) {
            if ((member.textContent.toUpperCase().indexOf(filter) > -1) || (member.classList.toString().toUpperCase().indexOf(filter) > -1)) {
                statusIncluded = true;
                break;
            }
        }

        if (!statusIncluded) {
            for (let i = 0; i < statusHeaders.length; i += 1) {
                if (statusHeaders[i].textContent.includes(status[1])) {
                    statusHeaders[i].style.display = "none";
                    statusBreaks[i].style.display = "none";
                }
            }

        } else if (statusIncluded) {
            for (let i = 0; i < statusHeaders.length; i += 1) {
                if (statusHeaders[i].textContent.includes(status[1])) {
                    statusHeaders[i].style.display = "block";
                    statusBreaks[i].style.display = "block";
                }
            }
        }
    }
}
