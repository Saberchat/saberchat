const changeThumbnail = function(url) { //Change URL of thumbnail
    document.getElementById("course-thumbnail").style.backgroundImage = `url(${url.value})`;
}

const changeName = function (input) { //Change course name based on input
    document.getElementById("courseName").innerText = `${input.value} Saberchat`;
}