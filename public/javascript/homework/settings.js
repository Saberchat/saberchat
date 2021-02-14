const changeTab = function (tab) { //Change the current tab
    for (let t of document.getElementsByClassName("tab-header")) {
        document.getElementsByClassName(t.id)[0].hidden = true;
        t.style.color = "black";
    }

    document.getElementsByClassName(tab.id)[0].hidden = false;
    tab.style.color = "blue";
}

const changeThumbnailInit = function () { //Display thumbnail during course initialization
    if (document.getElementById('thumbnail').value.replaceAll(' ', '' != "")) {
        document.getElementById('thumbnail-photo').src = document.getElementById('thumbnail').value;
        document.getElementById('thumbnail-photo').hidden = false;

    } else {
        document.getElementById('thumbnail-photo').hidden = true;
    }
}

const changeThumbnail = function (input) { //Change thumbnail image based on input
    if (document.getElementById("showLinkImage").checked) {
        document.getElementsByClassName("jumbotron")[0].style.backgroundImage = `url('${input.value}`;
    } else {
        document.getElementById("thumbnail-backup").src = input.value;
    }
}

const changeThumbnailUpload = function(url, backup) {
    if (document.getElementById("showUploadedImage").checked) {
        document.getElementsByClassName("jumbotron")[0].style.backgroundImage = `url(${url})`;
        document.getElementById("thumbnail-backup").src = backup;
    } else {
        document.getElementsByClassName("jumbotron")[0].style.backgroundImage = `url(${backup})`;
        document.getElementById("thumbnail-backup").src = url;
    }
}

const changeThumbnailUrl = function(url, backup) {
    if (document.getElementById("showLinkImage").checked) {
        document.getElementsByClassName("jumbotron")[0].style.backgroundImage = `url(${url})`;
        document.getElementById("thumbnail-backup").src = backup;
    } else {
        document.getElementsByClassName("jumbotron")[0].style.backgroundImage = `url(${backup})`;
        document.getElementById("thumbnail-backup").src = url;
    }
}

const changeInfo = function (input) { //Change course description based on input
    document.getElementById("courseDescription").innerText = document.getElementById("descInput").value;
}

const changeName = function (input) { //Change course name based on input
    document.getElementById("courseName").innerText = document.getElementById("newName").value;
}

const changeJoinCode = function (courseID, event) { //Change course join code (in case security is compromised)
    const url = `/homework/joinCode/${courseID}?_method=put`;
    const data = {};

    $.post(url, data => {
        document.getElementById('loading').style.color = "grey";
        document.getElementById('loading').innerText = "Waiting";

        if (data.success) {
            document.getElementById('joinCode').innerText = data.joinCode;
            document.getElementById('loading').hidden = false;
            document.getElementById('loading').style.color = "green";
            document.getElementById('loading').innerText = data.success;

            setTimeout(() => {
                document.getElementById('loading').hidden = true;
            }, 1000);

        } else {
            document.getElementById('loading').hidden = false;
            document.getElementById('loading').style.color = "red";
            document.getElementById('loading').innerText = data.error;

            setTimeout(() => {
                document.getElementById('loading').hidden = true;
            }, 1000);
        }
    });
    event.preventDefault(); //Prevent page from automatically refreshing
}
