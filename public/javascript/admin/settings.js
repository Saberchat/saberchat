const changeThumbnail = function(url) { //Change URL of thumbnail
    document.getElementById("course-thumbnail").style.backgroundImage = `url(${url.value})`;
}

const changeName = function (input) { //Change course name based on input
    document.getElementById("courseName").innerText = `${input.value} Saberchat`;
}

const changeFeatureName = function(input) {
    document.getElementById(`feature-name-${input.id}`).innerText = input.value;
}

const changeIcon = function(input) {
    document.getElementById(`display-icon-${input.id.split('-')[1]}`).className = `fas fa-${input.value}`;
}