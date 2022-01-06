const leave = function(button, location, darkmode) { //Leave a tutor
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

            //Reset user's displayed newRooms
            document.getElementById("new-count").innerText = `${data.user.newRooms.length + data.user.annCount.length}`;
            if (data.user.newRooms.length + data.user.annCount.length > 0) {
                document.getElementById("new-count").hidden = false;
            } else {
                document.getElementById("new-count").hidden = true;
            }

            document.getElementById("new-chat").innerText = `${data.user.newRooms.length}`;
            if (data.user.newRooms.length > 0) {
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

const approve = function(button) { //Approve lesson transaction
    const courseId = button.id.split('-')[0];
    const tutorId = button.id.split('-')[1];
    const index = button.id.split('-')[2];
    const url = `/tutoringCenter/approve-lesson/${courseId}?_method=put`;
    const data = {tutorId, index};

    sendPostReq(url, data, data => {
        if (data.success) { //Update button as is necessary
            if (button.innerText == "Reject Lesson") {
                button.className = "btn btn-success";
                button.innerText = "Approve Lesson";
            } else {
                button.className = "btn btn-danger";
                button.innerText = "Reject Lesson";
            }
            //Update displayed time, cost and lesson count data
            document.getElementById("time-count").innerText = `${data.time} minutes`;
            document.getElementById("cost").innerText = data.cost;
            document.getElementById("time-count").innerText = getTime(document.getElementById("time-count").innerText.split(' ')[0]);
        }
    });
}

const markPayment = function(button) { //Mark that a payment transaction has been completed
    const courseId = button.id.split('-')[0];
    const studentId = button.id.split('-')[1];
    const index = button.id.split('-')[2];
    const url = `/tutoringCenter/mark-payment/${courseId}?_method=put`;
    const data = {studentId, index};

    sendPostReq(url, data, data => {
        if (data.success) { //Change button text accordingly
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

const closeLessons = function(button, location) { //Close tutoring lessns
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

const reopenLessons = function(button, location) { //For tutors to reopen lessons that they had closed earlier
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

const setStudents = function() { //For tutors to set how many students they can take in a specific course while joining
    document.getElementById("slots-label").innerText = `Number of Student Slots: ${document.getElementById('slots').value}`;
}

const setCost = function(dollarPayment) { //For tutors to set their price while joining course
    if (dollarPayment) {
        document.getElementById("cost-label").innerText = `Hourly Cost: $${document.getElementById('cost').value}.00`;
    } else {
        document.getElementById("cost-label").innerText = `Hourly Cost: ${document.getElementById('cost').value} Credits`;
    }
}

const setStudentsTutorShow = function(slider) { //For tutors to set how many students they can take in a specific course on their own profile page
    const courseId = slider.id.split('-')[1];
    document.getElementById(`slots-label-${courseId}`).innerText = `Number of Student Slots: ${slider.value}`;
}

const setCostTutorShow = function(slider, dollarPayment) { //For tutors to set their price on their own profile page
    const courseId = slider.id.split('-')[1];
    if (dollarPayment) {
        document.getElementById(`cost-label-${courseId}`).innerText = `Hourly Cost: $${slider.value}.00`;
    } else {
        document.getElementById(`cost-label-${courseId}`).innerText = `Hourly Cost: ${slider.value} Credits`;
    }
}

const setCostShow = function(courseId) { //For tutors to set their price (not while joining course)
    const url = `/tutoringCenter/set-cost/${courseId}?_method=put`;
    const cost = document.getElementById('cost').value;
    const data = {courseId, cost};

    sendPostReq(url, data, data => {
        if (data.success) { //Update cost display
            document.getElementById("cost-count").innerText = `$${data.tutor.cost}.00`;
            document.getElementById(`cost-info-${data.tutor.tutor}`).innerText = `$${data.tutor.cost}.00`;
        }
    });
}

const setStudentsShow = function(courseId) { //For tutors to set how many students they can take in a specific course (not while joining)
    const url = `/tutoringCenter/set-students/${courseId}?_method=put`;
    const slots = document.getElementById('slots').value;
    const data = {courseId, slots};

    sendPostReq(url, data, data => { //Send request with data
        if (data.success) {
            if (!data.tutor.available) { //If tutor is now unavailable (all slots filled) give option to reopen
                const lessonButton = document.getElementsByClassName("lesson-action")[0];
                lessonButton.className = "btn btn-success reopen-lessons lesson-action";
                lessonButton.id = `reopen-${courseId}-${data.tutor.tutor}`;
                lessonButton.setAttribute("data-target", `#modal-reopen-${data.tutor.tutor}`);
                lessonButton.innerText = "Reopen Lessons";
            }
        }
    });
}

const removeStudent = function(button) { //Remove student from a course
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

            let unblockModal = document.createElement("div"); //Create modal to allow teachers to unblock members
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

const removeTutor = function(button) { //Remove tutor from course
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

const unblock = function(button) { //Unblock user from course
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

const changeBio = function(button) { //Change tutor's bio
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

const setTime = function(input) { //Update displayed time based on slider value
    const studentId = input.id.split('-')[1];
    document.getElementById(`time-label-${studentId}`).innerText = input.value;
}

const getTime = function(experience) { //Format time in minutes, hours, days, etc. by dividing until there is no remainder
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

const mark = function(button) { //MArk a student's lesson
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
