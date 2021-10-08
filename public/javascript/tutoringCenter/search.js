//Dom Elements for Tutor and Student Search
let tutorList = []; //Stores current list of searched tutors
let studentList = []; //Stores current list of searched students

const searchTutors = function(input, id) {
    const url = `/tutoringCenter/search-tutors/${id}`;
    const data = {text: input.value};
    const tutorSelect = document.getElementById("tutor-select");
    let appendedTutor;

    if (input.value.length > 2) {
        sendPostReq(url, data, data => {
            if (data.success && data.tutors.length > 0) { //If there are tutors to display
                tutorSelect.hidden = false;
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
                tutorSelect.hidden = true; //Hide dropdown if there are no matching elements
            }
        });
    } else {
        tutorSelect.hidden = true; //Hide dropdown if there is not a long enough input string
    }
}

const addTutor = function() { //Add tutor to list of tutors
    const tutorSelect = document.getElementById("tutor-select");
    const tutorInput = document.getElementById("tutor-input");
    const tutorDiv = document.getElementById("tutor-input-div");

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
    tutorSelect.hidden = true;
}

const remTutor = function(btn) { //Remove tutor from list of tutors
    const id = btn.id;
    const tutorInput = document.getElementById("tutor-input");
    const tutorDiv = document.getElementById("tutor-input-div");

    const userTags = document.getElementsByClassName('user-tag');
    for (let tag of userTags) { //Iterate through tags until the one with the remove ID is found
        if (tag.id == id) {
            tutorDiv.removeChild(tag);
            tutorList.splice(tutorList.indexOf(id), 1);
            tutorInput.value = tutorList.toString();
        }
    }
}

const searchStudents = function(input, id) { //Search through potential students to add
    const url = `/tutoringCenter/search-students/${id}`;
    const data = {text: input.value};
    const studentSelect = document.getElementById("student-select");
    let appendedStudent;

    if (input.value.length > 2) {
        sendPostReq(url, data, data => {
            if (data.success && data.students.length > 0) { //If there are students to display
                studentSelect.hidden = false;
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
                studentSelect.hidden = true; //Hide dropdown if there are no matching elements
            }
        });
    } else {
        studentSelect.hidden = true; //Hide dropdown if there is not a long enough input string
    }
}

const addStudent = function() { //Add student to list of students
    const studentSelect = document.getElementById("student-select");
    const studentInput = document.getElementById("student-input");
    const studentDiv = document.getElementById("student-input-div");

    if ((!studentList.includes(studentSelect.value)) && !(studentList.includes(studentSelect[studentSelect.selectedIndex].className))) { //Make sure that if the status has been selected, nothing else is selected
        studentList.push(studentSelect.value);
        studentInput.value = studentList.toString();

        let newStudent = document.createElement('div');
        newStudent.classList.add('user-tag');
        newStudent.classList.add(`${studentSelect[studentSelect.selectedIndex].className}`); //Put the user status in the tag
        newStudent.id = `${studentSelect.value}`;
        newStudent.innerHTML = `<span name="students" value="${studentSelect.value}">${studentSelect.options[studentSelect.selectedIndex].text}</span><button type="button" id="${studentSelect.value}" onclick="remStudent(this)">&times;</button>`;
        studentDiv.appendChild(newStudent);

        let deletes = []; //List of usernames to be removed

        for (let t = 0; t < document.getElementsByClassName('user-tag').length; t++) { //Go through list of students, remove any users who have this className (if the added 'username' is a status e.g. '12th', it removes any excess 12th graders)
            if (document.getElementsByClassName('user-tag')[t].classList.contains(studentSelect[studentSelect.selectedIndex].value)) {
                deletes.push(t);
            }
        }

        for (let del of deletes.reverse()) { //Iterate through list of usernames to remove
            remStudent(document.getElementsByClassName('user-tag')[del].getElementsByTagName('button')[0]);
        }
    }
    //Empty input and hide dropdown
    document.getElementById("student-list").value = "";
    studentSelect.hidden = true;
}

const remStudent = function(btn) { //Remove student from list of students
    const id = btn.id;
    const studentInput = document.getElementById("student-input");
    const studentDiv = document.getElementById("student-input-div");

    const userTags = document.getElementsByClassName('user-tag');
    for (let tag of userTags) { //Iterate through tags until the one with the remove ID is found
        if (tag.id == id) {
            studentDiv.removeChild(tag);
            studentList.splice(studentList.indexOf(id), 1);
            studentInput.value = studentList.toString();
        }
    }
}