const changeTab = function (tab, darkmode) { //Change the current tab
    const colorMode = new Map([[true, ["#7FFFD4", "white"]], [false, ["blue", "black"]]]); //Color change depending on darkmode

    for (let t of document.getElementsByClassName("tab-header")) { //Iterate through tabs and change them based on darkmode
        document.getElementsByClassName(t.id)[0].hidden = true;
        t.style.color = colorMode.get(darkmode)[1];
    }

    document.getElementsByClassName(tab.id)[0].hidden = false;
    tab.style.color = colorMode.get(darkmode)[0];
}

const changeThumbnailInit = function () { //Display thumbnail during course initialization
    if (document.getElementById('thumbnail').value.replaceAll(' ', '' != "")) {
        document.getElementById('thumbnail-photo').src = document.getElementById('thumbnail').value;
        document.getElementById('thumbnail-photo').hidden = false;

    } else {
        document.getElementById('thumbnail-photo').hidden = true;
    }
}

const changeThumbnail = function (input) { //Display thumbnail image based on radio buttons clicked
    if (document.getElementById("showLinkImage").checked) {
        document.getElementsByClassName("jumbotron")[0].style.backgroundImage = `url('${input.value}`; //Change jumbotron background image
    } else {
        document.getElementById("thumbnail-backup").src = input.value;
    }
}

const changeThumbnailUpload = function(url, backup) { //Display uploaded image based on radio buttons clicked
    if (document.getElementById("showUploadedImage").checked) { //If display upload is clicked, make main image the upload
        document.getElementsByClassName("jumbotron")[0].style.backgroundImage = `url(${url})`;
        document.getElementById("thumbnail-backup").src = backup;
    } else { //If not, make it the backup image
        document.getElementsByClassName("jumbotron")[0].style.backgroundImage = `url(${backup})`;
        document.getElementById("thumbnail-backup").src = url;
    }
}

const changeThumbnailUrl = function(url, backup) { //Change URL of course thumbnail
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

    sendPostReq(url, data, data => {
        document.getElementById('loading').style.color = "grey";
        document.getElementById('loading').innerText = "Waiting";

        if (data.success) { //If successful request, update joincode info
            document.getElementById('joinCode').innerText = data.joinCode;
            document.getElementById('loading').hidden = false;
            document.getElementById('loading').style.color = "green";
            document.getElementById('loading').innerText = data.success;

            setTimeout(() => { //Hide loading button
                document.getElementById('loading').hidden = true;
            }, 1000);

        } else { //If there is an error
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
