//Change the current tab
const changeTab = (tab => {
    const tabs = document.getElementsByClassName("tab-header");

    for (let t of tabs) {
        document.getElementsByClassName(t.id)[0].hidden = true;
        t.style.color = "black";
    }

    document.getElementsByClassName(tab.id)[0].hidden = false;
    tab.style.color = "blue";
});

//Display thumbnail during course initialization
const changeThumbnailInit = (() => {
    if (document.getElementById('thumbnail').value.replaceAll(' ', '' != "")) {
        document.getElementById('thumbnail-photo').src = document.getElementById('thumbnail').value;
        document.getElementById('thumbnail-photo').hidden = false;

    } else {
        document.getElementById('thumbnail-photo').hidden = true;
    }
});

//Change thumbnail image based on input
const changeThumbnail = (input => {
    document.getElementsByClassName("jumbotron")[0].style.backgroundImage = `url('${input.value}`;
});

//Change course description based on input
const changeInfo = (input => {
    document.getElementById("courseDescription").innerText = document.getElementById("descInput").value;
});

//Change course name based on input
const changeName = (input => {
    document.getElementById("courseName").innerText = document.getElementById("newName").value;
});

//JSON request to confirm settings updates
const updateSettings = ((courseID, event) => {
    const url = `/homework/${courseID}?_method=put`;
    const data = {
        name: document.getElementById('newName').value,
        description: document.getElementById('descInput').value,
        thumbnail: document.getElementById('thumbnail-input').value
    };

    $.post(url, data, function (data) {
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
});

//JSON request to change course join code (in case security is compromised)
const changeJoinCode = ((courseID, event) => {
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
});
