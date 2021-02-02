function changeTab(tab) { //Change the current tab
    const tabs = document.getElementsByClassName("tab-header");
    for (let t of tabs) {
        document.getElementsByClassName(t.id)[0].hidden = true;
        t.style.color = "black";
    }

    document.getElementsByClassName(tab.id)[0].hidden = false;
    tab.style.color = "blue";
}

function changeThumbnailInit() { //Display thumbnail during course initialization
    if (document.getElementById('thumbnail').value.replaceAll(' ', '' != "")) {
        document.getElementById('thumbnail-photo').src = document.getElementById('thumbnail').value;
        document.getElementById('thumbnail-photo').hidden = false;

    } else {
        document.getElementById('thumbnail-photo').hidden = true;
    }
}

function changeThumbnail(input) { //Change thumbnail image based on input
    document.getElementsByClassName("jumbotron")[0].style.backgroundImage = `url('${input.value}`;
}

function changeInfo(input) { //Change course description based on input
    document.getElementById("courseDescription").innerText = document.getElementById("descInput").value;
}

function changeName(input) { //Change course name based on input
    document.getElementById("courseName").innerText = document.getElementById("newName").value;
}

function updateSettings(courseID, event) {
    const url = `/homework/${courseID}?_method=put`;
    const data = {
        name: document.getElementById('newName').value,
        description: document.getElementById('descInput').value,
        thumbnail: document.getElementById('thumbnail-input').value
    };

    $.post(url, data, data => {
        document.getElementById('loading').style.color = "grey";
        document.getElementById('loading').innerText = "Waiting";

        if (data.success) {
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

function changeJoinCode(courseID, event) { //Change course join code (in case security is compromised)
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
