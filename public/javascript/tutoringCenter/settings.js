const changeTab = function(tab, darkmode) { //Change the current tab
    const colorMode = new Map([[true, ["#7FFFD4", "white"]], [false, ["blue", "black"]]]); //Color change depending on darkmode

    for (let t of document.getElementsByClassName("tab-header")) { //Iterate through tabs and change them based on darkmode
        document.getElementsByClassName(t.id)[0].hidden = true;
        t.style.color = colorMode.get(darkmode)[1];
    }

    document.getElementsByClassName(tab.id)[0].hidden = false;
    tab.style.color = colorMode.get(darkmode)[0];
}

const changeThumbnailInit = function() { //Display thumbnail during course initialization
    if (document.getElementById('thumbnail').value.replaceAll(' ', '' != "")) {
        document.getElementById('thumbnail-photo').src = document.getElementById('thumbnail').value;
        document.getElementById('thumbnail-photo').hidden = false;

    } else {
        document.getElementById('thumbnail-photo').hidden = true;
    }
}

const changeThumbnail = function(input) { //Display thumbnail image based on radio buttons clicked
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

const changeInfo = function(input) { //Change course description based on input
    document.getElementById("courseDescription").innerText = document.getElementById("descInput").value;
}

const changeName = function(input) { //Change course name based on input
    document.getElementById("courseName").innerText = document.getElementById("newName").value;
}

const searchTutors = function(input) {
    const url = `/tutoringCenter/search-tutors`;
    const data = {text: input.value};
    const tutorSelect = document.getElementById("tutor-select");
    let appendedTutor;

    if (input.value.length > 2) {
        sendPostReq(url, data, data => {
            if (data.success && data.tutors.length > 0) { //If there are tutors to display
                tutorSelect.style.display = "block";
                while (tutorSelect.firstChild) {tutorSelect.removeChild(tutorSelect.firstChild);} //Empty tutorSelect from previous searches

                //Add heading back to tutorSelect's list
                const heading = document.createElement("option");
                for (let attr of ["selected", "disabled"]) {heading[attr] = true;}
                heading.className = "tutor-group";
                heading.innerText = "Select User/Group";
                tutorSelect.appendChild(heading);

                for (let recType of ["status", "user"]) {
                    for (let tutor of data.tutors) { //Build tutorSelect option
                        if (tutor.type == recType) {
                            appendedTutor = document.createElement("option");
                            if (recType == "user") {
                                appendedTutor.className = tutor.classValue;
                            } else {
                                appendedTutor.className = "tutor-group";
                            }

                            appendedTutor.innerText = tutor.displayValue;
                            appendedTutor.setAttribute("value", tutor.idValue);
                            tutorSelect.appendChild(appendedTutor); //Add tutorSelect option to menu
                        }
                    }
                }
            } else {
                console.log(data);
                tutorSelect.style.display = "none"; //Hide dropdown if there are no matching elements
            }
        });
    } else {
        tutorSelect.style.display = "none"; //Hide dropdown if there is not a long enough input string
    }
}

const addTutor = function() { //Add tutor to list of tutors
    if ((!tutorList.includes(tutorSelect.value)) && !(tutorList.includes(tutorSelect[tutorSelect.selectedIndex].className))) { //Make sure that if the status has been selected, nothing else is selected
        tutorList.push(tutorSelect.value);
        tutorInput.value = tutorList.toString();

        let newTutor = document.createElement('div');
        newTutor.classList.add('user-tag');
        newTutor.classList.add(`${tutorSelect[tutorSelect.selectedIndex].className}`); //Put the user status in the tag
        newTutor.id = `${tutorSelect.value}`;
        newTutor.innerHTML = `<span name="tutors" value="${tutorSelect.value}">${tutorSelect.options[tutorSelect.selectedIndex].text}</span><button type="button" id="${tutorSelect.value}" onclick="remTutor(this)">&times;</button>`;
        tutorDiv.appendChild(newTutor);

        let deletes = []; //List of usernames to be removed

        for (let t = 0; t < document.getElementsByClassName('user-tag').length; t++) { //Go through list of tutors, remove any users who have this className (if the added 'username' is a status e.g. '12th', it removes any excess 12th graders)
            if (document.getElementsByClassName('user-tag')[t].classList.contains(tutorSelect[tutorSelect.selectedIndex].value)) {
                deletes.push(t);
            }
        }

        for (let del of deletes.reverse()) { //Iterate through list of usernames to remove
            remTutor(document.getElementsByClassName('user-tag')[del].getElementsByTagName('button')[0]);
        }
    }
    //Empty input and hide dropdown
    document.getElementById("tutor-list").value = "";
    tutorSelect.style.display = "none";
}

const remTutor = function(btn) { //Remove tutor from list of tutors
    const id = btn.id;

    const userTags = document.getElementsByClassName('user-tag');
    for (let tag of userTags) { //Iterate through tags until the one with the remove ID is found
        if (tag.id == id) {
            tutorDiv.removeChild(tag);
            tutorList.splice(tutorList.indexOf(id), 1);
            tutorInput.value = tutorList.toString();
        }
    }
}

const searchStudents = function(input) {
    const url = `/projects/search-students`;
    const data = {text: input.value};
    let appendedStudent;

    if (input.value.length > 2) {
        sendPostReq(url, data, data => {
            if (data.success && data.students.length > 0) { //If there are students to display
                studentSelect.style.display = "block";
                while (studentSelect.firstChild) {studentSelect.removeChild(studentSelect.firstChild);} //Empty studentSelect from previous searches

                //Add heading back to studentSelect's list
                const heading = document.createElement("option");
                for (let attr of ["selected", "disabled"]) {heading[attr] = true;}
                heading.className = "student-group";
                heading.innerText = "Select User/Group";
                studentSelect.appendChild(heading);

                for (let recType of ["status", "user"]) {
                    for (let student of data.students) { //Build studentSelect option
                        if (student.type == recType) {
                            appendedStudent = document.createElement("option");
                            if (recType == "user") {
                                appendedStudent.className = student.classValue;
                            } else {
                                appendedStudent.className = "student-group";
                            }

                            appendedStudent.innerText = student.displayValue;
                            appendedStudent.setAttribute("value", student.idValue);
                            studentSelect.appendChild(appendedStudent); //Add studentSelect option to menu
                        }
                    }
                }
            } else {
                studentSelect.style.display = "none"; //Hide dropdown if there are no matching elements
            }
        });
    } else {
        studentSelect.style.display = "none"; //Hide dropdown if there is not a long enough input string
    }
}

const changeJoinCode = function(courseID, event) { //Change course join code (in case security is compromised)
    const url = `/tutoringCenter/joinCode/${courseID}?_method=put`;
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
            }, 2000);

        } else { //If there is an error
            document.getElementById('loading').hidden = false;
            document.getElementById('loading').style.color = "red";
            document.getElementById('loading').innerText = data.error;

            setTimeout(() => {
                document.getElementById('loading').hidden = true;
            }, 2000);
        }
    });
    event.preventDefault(); //Prevent page from automatically refreshing
}
