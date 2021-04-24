const book = function (button, location, darkmode) { //Book a tutor
    const courseId = button.id.split('-')[0];
    const tutorId = button.id.split('-')[1];
    const url = `/tutoringCenter/book/${courseId}?_method=put`;
    const data = {tutorId};

    sendPostReq(url, data, data => {
        if (data.success) {
            $(`#modal-book-${tutorId}`).modal('hide');

            //Remove button to book tutor, start building buttons to review/leave tutor
            const tutorDiv = document.getElementById(`tutor-actions-${tutorId}`);
            tutorDiv.removeChild(document.getElementById(`book-button-${tutorId}`));

            let reviewButton = document.createElement('button');
            let leaveButton = document.createElement('button');
            let chatButton = document.createElement('a');

            //Button styling based on page location
            if (location == "show") {
                reviewButton.className = "review-button action-button btn btn-warning";
                leaveButton.className = "leave-button action-button btn btn-danger";
                chatButton.className = "leave-button action-button btn btn-success";

            } else if (location == "tutor-show") {
                reviewButton.className = "action-button btn btn-warning";
                leaveButton.className = "action-button btn btn-danger";
                chatButton.className = "action-button btn btn-success";
            }

            reviewButton.id = `review-button-${tutorId}`;
            reviewButton.setAttribute("data-toggle", "modal");
            reviewButton.setAttribute("data-target", `#modal-review-${tutorId}`);
            reviewButton.innerHTML = "Leave A Review";

            leaveButton.id = `leave-button-${tutorId}`;
            leaveButton.setAttribute("data-toggle", "modal");
            leaveButton.setAttribute("data-target", `#modal-stop-${tutorId}`);
            leaveButton.innerHTML = "Stop Lessons";

            chatButton.id = `chat-button-${tutorId}`;
            chatButton.setAttribute("href", `/chat/${data.room}`);
            chatButton.innerHTML = "Chat";

            if (!data.formerStudent) { //If student was a student earlier, review button was already available. Do not add it in this case
                tutorDiv.appendChild(reviewButton);
            }

            tutorDiv.appendChild(leaveButton);
            tutorDiv.appendChild(chatButton);

            //Update tutor's display info
            document.getElementById("new-count").innerText = `${data.user.newRoomCount.length + data.user.annCount.length}`;
            document.getElementById("new-count").hidden = false;

            document.getElementById("new-chat").innerText = `${data.user.newRoomCount.length}`;
            document.getElementById("new-chat").hidden = false;

            if (location == "tutor-show") { //If on tutor-show page, create list which displays all tutor's students
                let studentHeading = document.createElement("li");
                studentHeading.className = "nav-item tab-header tab";
                studentHeading.id = "students";
                studentHeading.setAttribute("onclick", `changeTab(this, ${darkmode})`);
                studentHeading.innerHTML = `<a class="nav-link active">Students (${data.tutor.members.length + data.tutor.formerStudents.length})</a>`;

                let lessonCount = 0; //Track students' lessons
                for (let student of data.tutor.members) {
                    if (student.student == data.user._id.toString()) {
                        lessonCount = student.lessons.length;
                    }
                }

                let studentDiv = document.createElement("div");
                studentDiv.className = "students";

                let studentsList = document.createElement("div");
                studentsList.className = "list-group";
                studentsList.innerHTML = `<li class="list-group-item list-group-item-success status-header darkmode-outline"> <div class="d-flex w-100 justify-content-between"> <h2 class="mb-1 darkmode-header">Students</h2> </div> </li>`;

                let userElement;
                for (let student of data.students) { //Build HTML elements for each of the tutor's students
                    userElement = document.createElement("div");
                    userElement.className = "list-group-item list-group-item-action user-element shop";
                    userElement.innerHTML += `<a href="/profiles/${student._id}" class="student-profile user-element shoptext">`;
                    if (student.imageUrl.display) {
                        userElement.innerHTML += `<img class="student-profile-image" src="${student.imageUrl.url}" alt="profile picture"></img>`;
                    } else {
                        userElement.innerHTML += `<img class="student-profile-image" src="${student.mediaFile.url}" alt="profile picture"></img>`;
                    }
                    userElement.innerHTML += ` <span class="${student.permission} ${student.status} ${student.tags.join(' ')} student-block shoptext"><span class="span-tag-name">${student.firstName} ${student.lastName}</span> <span class="span-tag-username">${student.username}</span></span></a>`;

                    if (student._id.toString() == data.user._id.toString()) { //If student is current user, add button to view lesson history
                        let lessonInfoButton = document.createElement("a");
                        lessonInfoButton.className = "btn btn-info lesson-button";
                        lessonInfoButton.innerText = "Lesson Information";
                        lessonInfoButton.setAttribute("href", `/tutoringCenter/tutors/${courseId}?tutorId=${tutorId}&studentId=${student._id}`);

                        let lessonsLength = document.createElement("span");
                        lessonsLength.className = "lessons-length";
                        lessonsLength.innerHTML = `<span id="lessons-length-${student._id}">${lessonCount}</span> lesson(s)`;

                        userElement.appendChild(lessonInfoButton);
                        userElement.appendChild(lessonsLength);
                    }
                    studentsList.appendChild(userElement);
                }

                let formerStudentsList = document.createElement("div");
                formerStudentsList.className = "list-group";
                formerStudentsList.innerHTML = `<li class="list-group-item list-group-item-success status-header darkmode-outline"> <div class="d-flex w-100 justify-content-between"> <h2 class="mb-1 darkmode-header">Former Students</h2> </div> </li>`;

                for (let student of data.formerStudents) { //Build HTML elements for tutor's former students
                    userElement = document.createElement("div");
                    userElement.className = "list-group-item list-group-item-action user-element shop";
                    userElement.innerHTML += `<a href="/profiles/${student._id}" class="student-profile user-element shoptext">`;
                    if (student.imageUrl.display) {
                        userElement.innerHTML += `<img class="student-profile-image" src="${student.imageUrl.url}" alt="profile picture"></img>`;
                    } else {
                        userElement.innerHTML += `<img class="student-profile-image" src="${student.mediaFile.url}" alt="profile picture"></img>`;
                    }
                    userElement.innerHTML += ` <span class="${student.permission} ${student.status} ${student.tags.join(' ')} student-block shoptext"><span class="span-tag-name">${student.firstName} ${student.lastName}</span> <span class="span-tag-username">${student.username}</span></span></a>`;
                    formerStudentsList.appendChild(userElement);
                }

                //Add students list and heading to page 
                studentDiv.appendChild(studentsList);
                studentDiv.innerHTML += "<br/><br/>"
                studentDiv.appendChild(formerStudentsList);
                studentDiv.hidden = true;
                document.getElementById("options-bar").insertBefore(studentHeading, document.getElementById("courses"));
                document.getElementsByClassName("courses")[0].parentNode.insertBefore(studentDiv, document.getElementsByClassName("courses")[0]);
            }
        }
    });
}

const leave = function (button, location, darkmode) { //Leave a tutor
    const courseId = button.id.split('-')[0];
    const tutorId = button.id.split('-')[1];
    const url = `/tutoringCenter/leave/${courseId}?_method=put`;
    const data = {tutorId};

    sendPostReq(url, data, data => {
        if (data.success) {
            $(`#modal-stop-${tutorId}`).modal('hide');

            //Remove buttons to review, leave and chat with tutor
            const tutorDiv = document.getElementById(`tutor-actions-${tutorId}`);
            tutorDiv.removeChild(document.getElementById(`review-button-${tutorId}`));
            tutorDiv.removeChild(document.getElementById(`leave-button-${tutorId}`));
            tutorDiv.removeChild(document.getElementById(`chat-button-${tutorId}`));

            let reviewButton = document.createElement('button');
            let bookButton = document.createElement('button');

            if (location == "show") { //Button styling based on page location
                reviewButton.className = "review-button action-button btn btn-warning";
                bookButton.className = "book-button action-button btn btn-info";

            } else if (location == "tutor-show") {
                reviewButton.className = "action-button btn btn-warning";
                bookButton.className = "action-button btn btn-info";
            }

            //You can still review tutors that you were once a student of
            reviewButton.id = `review-button-${tutorId}`;
            reviewButton.setAttribute("data-toggle", "modal");
            reviewButton.setAttribute("data-target", `#modal-review-${tutorId}`);
            reviewButton.innerHTML = "Leave A Review";
            tutorDiv.appendChild(reviewButton);

            bookButton.id = `book-button-${tutorId}`;
            bookButton.setAttribute("data-toggle", "modal");
            bookButton.setAttribute("data-target", `#modal-book-${tutorId}`);
            bookButton.innerHTML = "Book This Tutor";
            tutorDiv.appendChild(bookButton);

            //Reset user's displayed newRoomCount
            document.getElementById("new-count").innerText = `${data.user.newRoomCount.length + data.user.annCount.length}`;
            if (data.user.newRoomCount.length + data.user.annCount.length > 0) {
                document.getElementById("new-count").hidden = false;
            } else {
                document.getElementById("new-count").hidden = true;
            }

            document.getElementById("new-chat").innerText = `${data.user.newRoomCount.length}`;
            if (data.user.newRoomCount.length > 0) {
                document.getElementById("new-chat").hidden = false;
            } else {
                document.getElementById("new-chat").hidden = true;
            }

            if (location == "tutor-show") { //Change from students tab to reviews tab if on tutor-show page
                document.getElementById("students").parentNode.removeChild(document.getElementById("students"));
                document.getElementsByClassName("students")[0].parentNode.removeChild(document.getElementsByClassName("students")[0]);
                changeTab(document.getElementById("reviews"), darkmode);
            }
        }
    });
}

const approve = function(button) {
    const courseId = button.id.split('-')[0];
    const tutorId = button.id.split('-')[1];
    const index = button.id.split('-')[2];
    const url = `/tutoringCenter/approve-lesson/${courseId}?_method=put`;
    const data = {tutorId, index};

    sendPostReq(url, data, data => {
        if (data.success) {
            if (button.innerText == "Reject Lesson") {
                button.className = "btn btn-success";
                button.innerText = "Approve Lesson";
            } else {
                button.className = "btn btn-danger";
                button.innerText = "Reject Lesson";
            }
            document.getElementById("time-count").innerText = `${data.time} minutes`;
            document.getElementById("cost").innerText = data.cost;
            document.getElementById("time-count").innerText = getTime(document.getElementById("time-count").innerText.split(' ')[0]);
        }
    });
}

const markPayment = function(button) {
    const courseId = button.id.split('-')[0];
    const studentId = button.id.split('-')[1];
    const index = button.id.split('-')[2];
    const url = `/tutoringCenter/mark-payment/${courseId}?_method=put`;
    const data = {studentId, index};

    sendPostReq(url, data, data => {
        if (data.success) {
            if (button.innerText == "Cancel Payment") {
                button.className = "btn btn-success";
                button.innerText = "Approve Payment";
            } else {
                button.className = "btn btn-danger";
                button.innerText = "Cancel Payment";
            }
            document.getElementById("cost").innerText = data.cost;
        } else {
        }
    });
}

const closeLessons = function (button, location) {
    const courseId = button.id.split('-')[0];
    const tutorId = button.id.split('-')[1];
    const url = `/tutoringCenter/close-lessons/${courseId}?_method=put`;
    const data = {tutorId};

    sendPostReq(url, data, data => {
        if (data.success) {
            $(`#modal-close-${tutorId}`).modal('hide');
            let reopenButton = document.createElement('button');

            //Build button to reopen lessons based on current page
            if (location == "show") {
                reopenButton.className = "reopen-lessons action-button btn btn-success lesson-action";
            } else if (location == "tutor-show") {
                reopenButton.className = "action-button btn btn-success";
            }

            reopenButton.id = `reopen-${courseId}-${tutorId}`;
            reopenButton.setAttribute("data-toggle", "modal");
            reopenButton.setAttribute("data-target", `#modal-reopen-${tutorId}`);
            reopenButton.innerHTML = "Reopen Lessons";
            //Replace close button with reopen button
            document.getElementById(`close-${courseId}-${tutorId}`).parentNode.replaceChild(reopenButton, document.getElementById(`close-${courseId}-${tutorId}`));
        }
    });
}

const reopenLessons = function (button, location) { //For tutors to reopen lessons that they had closed earlier
    const courseId = button.id.split('-')[0];
    const tutorId = button.id.split('-')[1];
    const url = `/tutoringCenter/reopen-lessons/${courseId}?_method=put`;
    const data = {tutorId};

    sendPostReq(url, data, data => {
        if (data.success) {
            $(`#modal-reopen-${tutorId}`).modal('hide');

            //Build button to again close lessons based on current page
            let closeButton = document.createElement('button');
            if (location == "show") {
                closeButton.className = "close-lessons action-button btn btn-danger lesson-action";
            } else if (location == "tutor-show") {
                closeButton.className = "action-button btn btn-danger";
            }

            closeButton.id = `close-${courseId}-${tutorId}`;
            closeButton.setAttribute("data-toggle", "modal");
            closeButton.setAttribute("data-target", `#modal-close-${tutorId}`);
            closeButton.innerHTML = "Prevent Further Bookings";

            //Replace reopen button with close button
            document.getElementById(`reopen-${courseId}-${tutorId}`).parentNode.replaceChild(closeButton, document.getElementById(`reopen-${courseId}-${tutorId}`));
        }
    });
}

const setStudents = function () { //For tutors to set how many students they can take in a specific course while joining
    document.getElementById("slots-label").innerText = `Number of Student Slots: ${document.getElementById('slots').value}`;
}

const setCost = function () { //For tutors to set their price while joining course
    document.getElementById("cost-label").innerText = `Hourly Cost: $${document.getElementById('cost').value}.00`;
}

const setStudentsTutorShow = function (slider) { //For tutors to set how many students they can take in a specific course on their own profile page
    const courseId = slider.id.split('-')[1];
    document.getElementById(`slots-label-${courseId}`).innerText = `Number of Student Slots: ${slider.value}`;
}

const setCostTutorShow = function (slider) { //For tutors to set their price on their own profile page
    const courseId = slider.id.split('-')[1];
    document.getElementById(`cost-label-${courseId}`).innerText = `Hourly Cost: $${slider.value}.00`;
}

const setCostShow = function (courseId) { //For tutors to set their price (not while joining course)
    const url = `/tutoringCenter/set-cost/${courseId}?_method=put`;
    const cost = document.getElementById('cost').value;
    const data = {courseId, cost};

    sendPostReq(url, data, data => {
        if (data.success) {
            document.getElementById("cost-count").innerText = `$${data.tutor.cost}.00`;
            document.getElementById(`cost-info-${data.tutor.tutor}`).innerText = `$${data.tutor.cost}.00`;
        }
    });
}

const setStudentsShow = function (courseId) { //For tutors to set how many students they can take in a specific course (not while joining)
    const url = `/tutoringCenter/set-students/${courseId}?_method=put`;
    const slots = document.getElementById('slots').value;
    const data = {courseId, slots};

    sendPostReq(url, data, data => {
        if (data.success) {
            document.getElementById("slots-count").innerText = `${slots}`;
            document.getElementById("change-message").style.color = "green";
            document.getElementById("change-message").innerText = "Succesfully Changed";

            if (!data.tutor.available) {
                const lessonButton = document.getElementsByClassName("lesson-action")[0];
                lessonButton.className = "btn btn-success reopen-lessons lesson-action";
                lessonButton.id = `reopen-${courseId}-${data.tutor.tutor}`;
                lessonButton.setAttribute("data-target", `#modal-reopen-${data.tutor.tutor}`);
                lessonButton.innerText = "Reopen Lessons";
            }

        } else if (data.error) {
            document.getElementById("change-message").style.color = "red";
            document.getElementById("change-message").innerText = "An Error Occurred";
        }

        document.getElementById("change-message").hidden = false;
        setTimeout(() => {
            document.getElementById("change-message").hidden = true;
        }, 1000);
    });
}

const removeStudent = function (button) {
    const courseId = button.id.split('-')[0];
    const studentId = button.id.split('-')[1];
    const reason = document.getElementById(`reason-${studentId}`).value;  //Listed reason that student is being blocked
    const url = `/tutoringCenter/remove-student/${courseId}?_method=put`;
    const data = {studentId, reason};

    sendPostReq(url, data, data => {
        if (data.success) {
            //Remove student from list of students
            $(`#modal-index-remove-${studentId}`).modal('hide');
            document.getElementById("students").removeChild(document.getElementById(`item-${studentId}`));

            if (data.course.blocked.length == 1) { //If this person is the only blocked person (meaning there was no list earlier)
                let blockedDiv = document.createElement("ul"); //Create list with blocked heading 
                blockedDiv.className = "list-group";
                blockedDiv.id = "blocked-div";
                blockedDiv.innerHTML = `<li class="list-group-item list-group-item-success mode darkmode-outline">Blocked</li>`;
                document.getElementById("blocked-column").appendChild(blockedDiv);
                document.getElementById("blocked-column").removeChild(document.getElementById("no-blocked"));
            }

            let blockedElement = document.createElement("li"); //Create list element with blocked user's info
            blockedElement.className = "list-group-item shop";
            blockedElement.id = `item-${data.student._id}`;
            blockedElement.innerHTML += `<a href="/..profiles/${data.student._id}" class="user-element shoptext">`;
            if (data.student.imageUrl.display) {
                blockedElement.innerHTML += `<img class="profile-image" src="${data.student.imageUrl.url}" alt="profile picture"></img>`;
            } else {
                blockedElement.innerHTML += `<img class="profile-image" src="${data.student.mediaFile.url}" alt="profile picture"></img>`;
            }        
            blockedElement.innerHTML += ` <span class="username ${data.student.status} ${data.student.permission} ${data.student.tags.join(' ')}"><span class="enrolled-name">${data.student.firstName} ${data.student.lastName}</span> <span class="enrolled-username">${data.student.username}</span></span> </a> <button class="btn btn-danger leave-button" id="unblock-button-${data.student._id}" data-toggle="modal" data-target="#modal-index-unblock-${data.student._id}">Unblock</button>`;

            let unblockModal = document.createElement("div");
            unblockModal.className = "modal fade";
            unblockModal.id = `modal-index-unblock-${data.student._id}`;
            unblockModal.setAttribute("tabindex", "-1");
            unblockModal.setAttribute("aria-labelledby", "deleteModalLabel");
            unblockModal.setAttribute("aria-hidden", "true");
            unblockModal.innerHTML = `<div class="modal-dialog mode"> <div class="modal-content mode"> <div class="modal-header mode"> <h5 class="modal-title" id="exampleModalLabel">Unblock ${data.student.firstName} ${data.student.lastName} From Your Course?</h5> <button type="button" class="close mode" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true">&times;</span> </button> </div> <div class="modal-body mode"> <p> ${data.student.firstName} will be able to rejoin the course with the join code. </p> </div> <div class="modal-footer mode"> <button type="button" class="btn btn-secondary" data-dismiss="modal">Back</button> <button type="button" class="btn btn-danger" id="${data.course._id}-${data.student._id}" onclick="unblock(this)">Yes, Unblock</button> </div> </div></div>`;

            document.getElementById("blocked-div").appendChild(blockedElement);
            document.getElementById("blocked-div").appendChild(unblockModal);

            if (data.course.members.length == 0) { //If there are no more students, replace list with a heading
                document.getElementById("students").parentNode.removeChild(document.getElementById("students"));
            }
        }
    });
}

const removeTutor = function (button) { //Remove tutor from course
    const courseId = button.id.split('-')[0];
    const tutorId = button.id.split('-')[1];
    const reason = document.getElementById(`reason-${tutorId}`).value; //Listed reason that tutor is being blocked
    const url = `/tutoringCenter/remove-tutor/${courseId}?_method=put`;
    const data = {tutorId, reason, show: true};

    sendPostReq(url, data, data => {
        if (data.success) {
            //Remove tutor from list of tutors
            $(`#modal-index-remove-${tutorId}`).modal('hide');
            $(`#modal-remove-${tutorId}`).modal('hide');
            document.getElementById("tutor-index").removeChild(document.getElementById(`item-${tutorId}`));
            document.getElementById("tutor-div").removeChild(document.getElementById(`tutor-${tutorId}`));

            if (data.course.blocked.length == 1) { //If this person is the only blocked person (meaning there was no list earlier)
                let blockedDiv = document.createElement("ul"); //Create list with blocked heading 
                blockedDiv.className = "list-group";
                blockedDiv.id = "blocked-div";
                blockedDiv.innerHTML = `<li class="list-group-item list-group-item-success mode darkmode-outline">Blocked</li>`;
                document.getElementById("blocked-column").appendChild(blockedDiv);
                document.getElementById("blocked-column").removeChild(document.getElementById("no-blocked"));
            }

            let blockedElement = document.createElement("li"); //Create list element with blocked user's info
            blockedElement.className = "list-group-item shop";
            blockedElement.id = `item-${data.tutor._id}`;
            blockedElement.innerHTML += `<a href="../profiles/${data.tutor._id}" class="user-element-text shoptext">`;
            if (data.tutor.imageUrl.display) {
                blockedElement.innerHTML += `<img class="profile-image" src="${data.tutor.imageUrl.url}" alt="profile picture"></img>`;
            } else {
                blockedElement.innerHTML += `<img class="profile-image" src="${data.tutor.mediaFile.url}" alt="profile picture"></img>`;
            }
            blockedElement.innerHTML += `<span class="username ${data.tutor.status} ${data.tutor.permission} ${data.tutor.tags.join(' ')}"><span class="enrolled-name">${data.tutor.firstName} ${data.tutor.lastName}</span> <span class="enrolled-username">${data.tutor.username}</span></span> </a> <button class="btn btn-danger leave-button" id="unblock-button-${data.tutor._id}" data-toggle="modal" data-target="#modal-index-unblock-${data.tutor._id}">Unblock</button>`;

            //Modal to unblock user
            let unblockModal = document.createElement("div");
            unblockModal.className = "modal fade";
            unblockModal.id = `modal-index-unblock-${data.tutor._id}`;
            unblockModal.setAttribute("tabindex", "-1");
            unblockModal.setAttribute("aria-labelledby", "deleteModalLabel");
            unblockModal.setAttribute("aria-hidden", "true");
            unblockModal.innerHTML = `<div class="modal-dialog mode"> <div class="modal-content mode"> <div class="modal-header mode"> <h5 class="modal-title" id="exampleModalLabel">Unblock ${data.tutor.firstName} ${data.tutor.lastName} From Your Course?</h5> <button type="button" class="close mode" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true">&times;</span> </button> </div> <div class="modal-body mode"> <p> ${data.tutor.firstName} will be able to rejoin the course with the join code. </p> </div> <div class="modal-footer mode"> <button type="button" class="btn btn-secondary" data-dismiss="modal">Back</button> <button type="button" class="btn btn-danger" id="${data.course._id}-${data.tutor._id}" onclick="unblock(this)">Yes, Unblock</button> </div> </div></div>`;

            document.getElementById("blocked-div").appendChild(blockedElement);
            document.getElementById("blocked-div").appendChild(unblockModal);

            if (data.course.tutors.length == 0) { //If there are no more tutors, replace list with a heading
                document.getElementById("tutor-index").parentNode.removeChild(document.getElementById("tutor-index"));
                document.getElementById("tutor-div").parentNode.removeChild(document.getElementById("tutor-div"));
                let noTutors = document.createElement("div");
                noTutors.className = "empty-field";
                noTutors.id = "no-tutors";
                noTutors.innerHTML = `<br /><h2>No Tutors</h2>`;
                document.getElementById("tutor-column").appendChild(noTutors);
            }
        }
    });
}

const unblock = function (button) { //Unblock user from course
    const courseId = button.id.split('-')[0];
    const blockedId = button.id.split('-')[1];
    const url = `/tutoringCenter/unblock/${courseId}?_method=put`;
    const data = {blockedId};

    sendPostReq(url, data, data => {
        if (data.success) { 
            //Remove blocked user from list of blocked users
            $(`#modal-index-unblock-${blockedId}`).modal('hide');
            document.getElementById("blocked-div").removeChild(document.getElementById(`item-${blockedId}`)); //Remove element with blocked user's info

            if (data.course.blocked.length == 0) { //If there are no more blocked users, replace list with a heading
                document.getElementById("blocked-div").parentNode.removeChild(document.getElementById("blocked-div"));
                let noBlocked = document.createElement("div");
                noBlocked.className = "empty-field";
                noBlocked.id = "no-blocked";
                noBlocked.innerHTML = `<br /><h2>No Blocked</h2>`;
                document.getElementById("blocked-column").appendChild(noBlocked);
            }
        }
    });
}

const changeBio = function (button) { //Change tutor's bio
    const courseId = button.id.split('-')[2];
    const bio = document.getElementById(`edit-bio-field`).value;
    const url = `/tutoringCenter/bio/${courseId}?_method=put`;
    const data = {bio};

    sendPostReq(url, data, data => {
        if (data.success) {
            $(`#modal-edit-bio`).modal('hide');
            document.getElementById("tutor-bio").innerText = bio; //Update displayed bio text
        }
    });
}

const setTime = function (input) { //Update displayed time based on slider value
    const studentId = input.id.split('-')[1];
    document.getElementById(`time-label-${studentId}`).innerText = input.value;
}

const getTime = function (experience) { //Format time in minutes, hours, days, etc. by dividing until there is no remainder
    let result;
    experience = parseInt(experience);
    if (experience < 60) {
        result = `${Math.round(experience * 100) / 100} minute(s)`;
    } else {
        experience /= 60;
        if (experience < 24) {
            result = `${Math.round(experience * 100) / 100} hour(s)`;
        } else {
            experience /= 24;
            if (experience < 7) {
                result = `${Math.round(experience * 100) / 100} day(s)`;
            } else {
                experience /= 7;
                if (experience < 52) {
                    result = `${Math.round(experience * 100) / 100} week(s)`;
                } else {
                    experience /= 52;
                    result = `${Math.round(experience * 100) / 100} year(s)`;
                }
            }
        }
    }
    return result;
}

const mark = function (button) { //MArk a student's lesson
    const courseId = button.id.split('-')[1];
    const studentId = button.id.split('-')[2];
    const time = parseInt(document.getElementById(`time-${studentId}`).value);
    const summary = document.getElementById(`summary-${studentId}`).value;
    const url = `/tutoringCenter/mark/${courseId}?_method=put`;
    const data = {studentId, time, summary};

    sendPostReq(url, data, data => {
        if (data.success) {
            document.getElementById(`time-${studentId}`).value = "0"; //Reset student lessons
            document.getElementById("lessons-length").innerText = data.lessons.length; //Increment tutor lessons
            document.getElementById(`lessons-length-${studentId}`).innerText = parseInt(document.getElementById(`lessons-length-${studentId}`).innerText) + 1; //Increment student lessons

            let experience = 0;
            for (let lesson of data.lessons) {
                experience += lesson.time;
            }
            document.getElementById("experience").innerText = getTime(experience); //Set tutor's experience to newly formatted experience
            $(`#modal-${studentId}-mark`).modal('hide');
        }
    });
}
