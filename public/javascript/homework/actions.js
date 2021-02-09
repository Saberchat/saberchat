const book = ((button, location) => {
  const courseId = button.id.split('-')[0];
  const tutorId = button.id.split('-')[1];
  const url = `/homework/book/${courseId}?_method=put`;
  const data = {tutorId};

  $.post(url, data, function(data) {
    if(data.success) {
      $(`#modal-book-${tutorId}`).modal('hide');

      const tutorDiv = document.getElementById(`tutor-actions-${tutorId}`);
      tutorDiv.removeChild(document.getElementById(`book-button-${tutorId}`));

      let reviewButton = document.createElement('button');
      let leaveButton = document.createElement('button');
      let chatButton = document.createElement('a');

      if (location == "show") {
        reviewButton.className ="review-button action-button btn btn-warning";
        leaveButton.className ="leave-button action-button btn btn-danger";
        chatButton.className ="leave-button action-button btn btn-success";

      } else if (location == "tutor-show") {
        reviewButton.className ="action-button btn btn-warning";
        leaveButton.className ="action-button btn btn-danger";
        chatButton.className ="action-button btn btn-success";
      }

      reviewButton.id = `review-button-${tutorId}`;
      reviewButton.setAttribute("data-toggle", "modal");
      reviewButton.setAttribute("data-target", `#modal-review-${tutorId}`);
      reviewButton.innerHTML = "Leave A Review";

      leaveButton.id = `leave-button-${tutorId}`;
      leaveButton.setAttribute("data-toggle", "modal");
      leaveButton.setAttribute("data-target", `#modal-stop-${tutorId}`);
      leaveButton.innerHTML = "Stop Lessons";

      chatButton.id = `leave-button-${tutorId}`;
      chatButton.setAttribute("href", `/chat/${data.room}`);
      chatButton.innerHTML = "Chat";

      if (!data.formerStudent) {
        tutorDiv.appendChild(reviewButton);
      }

      tutorDiv.appendChild(leaveButton);
      tutorDiv.appendChild(chatButton);


      document.getElementById("new-count").innerText = `${data.user.newRoomCount.length + data.user.annCount.length}`;
      document.getElementById("new-count").hidden = false;

      document.getElementById("new-chat").innerText = `${data.user.newRoomCount.length}`;
      document.getElementById("new-chat").hidden = false;

      if (location == "tutor-show") {
        let studentHeading = document.createElement("li");
        studentHeading.className = "nav-item tab-header tab";
        studentHeading.id = "students";
        studentHeading.setAttribute("onclick", "changeTab(this)");
        studentHeading.innerHTML = `<a class="nav-link active">Students (${data.tutor.students.length})</a>`;

        let lessonCount = 0;
        for (let lesson of data.tutor.lessons) {
          if (lesson.student == data.user._id) {
            lessonCount += 1;
          }
        }

        let studentDiv = document.createElement("div");
        studentDiv.className = "students";

        let studentsList = document.createElement("div");
        studentsList.className = "list-group";
        studentsList.innerHTML = `<li class="list-group-item list-group-item-success status-header"> <div class="d-flex w-100 justify-content-between"> <h2 class="mb-1">Students</h2> </div> </li>`;

        let userElement;
        for (let student of data.students) {
          userElement = document.createElement("div");
          userElement.className = "list-group-item list-group-item-action user-element";
          userElement.innerHTML = `<a href="/profiles/${student._id}" style="color: black; text-decoration: none;"> <img class="student-profile-image" src="${student.imageUrl }" alt="profile picture"> <span class="${student.permission} ${student.status} ${student.tags.join(' ')} student-block"><span class="span-tag-name">${student.firstName} ${student.lastName}</span> <span class="span-tag-username">${student.username}</span></span></a>`;

          if (student._id == data.user._id) {
            let lessonInfoButton = document.createElement("a");
            lessonInfoButton.className = "btn btn-info lesson-button";
            lessonInfoButton.innerText = "Lesson Information";
            lessonInfoButton.setAttribute("href", `/homework/tutors/${courseId}?tutorId=${tutorId}&studentId=${student._id}`);

            let lessonsLength = document.createElement("span");
            lessonsLength.className = "lessons-length";
            lessonsLength.innerHTML = `<span id="lessons-length-${student._id}">${lessonCount}</span> lesson(s)`;

            userElement.appendChild(lessonInfoButton);
            userElement.appendChild(lessonsLength);
          }

          studentsList.appendChild(userElement);

        }

        studentDiv.appendChild(studentsList);
        studentDiv.hidden = true;

        document.getElementById("options-bar").insertBefore(studentHeading, document.getElementById("courses"));
        document.getElementsByClassName("courses")[0].parentNode.insertBefore(studentDiv, document.getElementsByClassName("courses")[0]);
      }
    }
  });
});

const leave = ((button, location) => {
  const courseId = button.id.split('-')[0];
  const tutorId = button.id.split('-')[1];
  const url = `/homework/leave/${courseId}?_method=put`;
  const data = {tutorId};

  $.post(url, data, function(data) {
    if(data.success) {
      $(`#modal-stop-${tutorId}`).modal('hide');

      const tutorDiv = document.getElementById(`tutor-actions-${tutorId}`);
      tutorDiv.removeChild(document.getElementById(`review-button-${tutorId}`));
      tutorDiv.removeChild(document.getElementById(`leave-button-${tutorId}`));
      tutorDiv.removeChild(document.getElementById(`chat-button-${tutorId}`));

      let reviewButton = document.createElement('button');
      let bookButton = document.createElement('button');

      if (location == "show") {
        reviewButton.className ="review-button action-button btn btn-warning";
        bookButton.className ="book-button action-button btn btn-info";

      } else if (location == "tutor-show") {
        reviewButton.className ="action-button btn btn-warning";
        bookButton.className ="action-button btn btn-info";
      }

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

      if (location == "tutor-show") {
        document.getElementById("students").parentNode.removeChild(document.getElementById("students"));
        document.getElementsByClassName("students")[0].parentNode.removeChild(document.getElementsByClassName("students")[0]);
      }
    }
  });
});

const closeLessons = ((button, location) => {
  const courseId = button.id.split('-')[0];
  const tutorId = button.id.split('-')[1];
  const url = `/homework/close-lessons/${courseId}?_method=put`;
  const data = {tutorId};

  $.post(url, data, function(data) {

    if (data.success) {
      $(`#modal-close-${tutorId}`).modal('hide');

      let reopenButton = document.createElement('button');

      if (location == "show") {
        reopenButton.className ="reopen-lessons action-button btn btn-success lesson-action";
      } else if (location == "tutor-show") {
        reopenButton.className ="action-button btn btn-success";
      }

      reopenButton.id = `reopen-${courseId}-${tutorId}`;
      reopenButton.setAttribute("data-toggle", "modal");
      reopenButton.setAttribute("data-target", `#modal-reopen-${tutorId}`);
      reopenButton.innerHTML = "Reopen Lessons";

      document.getElementById(`close-${courseId}-${tutorId}`).parentNode.replaceChild(reopenButton, document.getElementById(`close-${courseId}-${tutorId}`));
    }
  });
});

const reopenLessons = ((button, location) => {
  const courseId = button.id.split('-')[0];
  const tutorId = button.id.split('-')[1];
  const url = `/homework/reopen-lessons/${courseId}?_method=put`;
  const data = {tutorId};

  $.post(url, data, function(data) {

    if (data.success) {
      $(`#modal-reopen-${tutorId}`).modal('hide');

      let closeButton = document.createElement('button');

      if (location == "show") {
        closeButton.className ="close-lessons action-button btn btn-danger lesson-action";
      } else if (location == "tutor-show") {
        closeButton.className ="action-button btn btn-danger";
      }

      closeButton.id = `close-${courseId}-${tutorId}`;
      closeButton.setAttribute("data-toggle", "modal");
      closeButton.setAttribute("data-target", `#modal-close-${tutorId}`);
      closeButton.innerHTML = "Prevent Further Bookings";

      document.getElementById(`reopen-${courseId}-${tutorId}`).parentNode.replaceChild(closeButton, document.getElementById(`reopen-${courseId}-${tutorId}`));
    }
  });
});

const setStudents = (() => {
  document.getElementById("slots-label").innerText = `Number of Student Slots: ${document.getElementById('slots').value}`;
});

const setStudentsTutorShow = (slider => {
  const courseId = slider.id.split('-')[1];
  document.getElementById(`slots-label-${courseId}`).innerText = `Number of Student Slots: ${slider.value}`;
});

const setStudentsShow = (courseId => {
  const url = `/homework/set-students/${courseId}?_method=put`;
  const slots = document.getElementById('slots').value;
  const data = {courseId, slots};

  $.post(url, data, function(data) {
    if (data.success) {
      document.getElementById("slots-count").innerText = `${slots}`;

      document.getElementById("change-message").innerText = "Succesfully Changed";

      if (document.getElementById("change-message").className == "darkmode-true") {
        document.getElementById("change-message").style.color = "#03fc45";
      } else {
        document.getElementById("change-message").style.color = "green";
      }

      if (!data.tutor.available) {
        const lessonButton = document.getElementsByClassName("lesson-action")[0];
        lessonButton.className = "btn btn-success reopen-lessons lesson-action";
        lessonButton.id = `reopen-${courseId}-${data.tutor.tutor}`;
        lessonButton.setAttribute("data-target", `#modal-reopen-${data.tutor.tutor}`);
        lessonButton.innerText = "Reopen Lessons";
      }

    } else if (data.error) {
      document.getElementById("change-message").innerText = "An Error Occurred";
      document.getElementById("change-message").style.color = "red";
    }

    document.getElementById("change-message").hidden = false;
    setTimeout(() => {
      document.getElementById("change-message").hidden = true;
    }, 1000);

  });
});

const removeStudent = ((button, location) => {
  const courseId = button.id.split('-')[0];
  const studentId = button.id.split('-')[1];
  const reason = document.getElementById(`reason-${studentId}`).value;
  const url = `/homework/remove-student/${courseId}?_method=put`;
  const data = {studentId, reason};

  $.post(url, data, function(data) {
    if (data.success) {
      $(`#modal-index-remove-${studentId}`).modal('hide');
      document.getElementById("students").removeChild(document.getElementById(`item-${studentId}`));

      if (data.course.blocked.length == 1) {
        let blockedDiv = document.createElement("ul");
        blockedDiv.className = "list-group";
        blockedDiv.id = "blocked-div";
        blockedDiv.innerHTML = `<li class="list-group-item list-group-item-success">Blocked</li>`;
        document.getElementById("blocked-column").appendChild(blockedDiv);
      }

      let blockedElement = document.createElement("li");
      blockedElement.className = "list-group-item";
      blockedElement.id = `item-${data.student._id}`;
      blockedElement.innerHTML = `<a href="../profiles/${data.student._id}"class="user-element-text"> <img class="profile-image" src="${data.student.imageUrl}" alt="profile picture"> <span class="username ${data.student.status} ${data.student.permission} ${data.student.tags.join(' ')}"><span class="enrolled-name">${data.student.firstName} ${data.student.lastName}</span> <span class="enrolled-username">${data.student.username}</span></span> </a> <button class="btn btn-danger leave-button" id="unblock-button-${data.student._id}" data-toggle="modal" data-target="#modal-index-unblock-${data.student._id}">Unblock</button>`;

      let unblockModal = document.createElement("div");
      unblockModal.className = "modal fade";
      unblockModal.id = `modal-index-unblock-${data.student._id}`;
      unblockModal.setAttribute("tabindex", "-1");
      unblockModal.setAttribute("aria-labelledby", "deleteModalLabel");
      unblockModal.setAttribute("aria-hidden", "true");

      unblockModal.innerHTML = `<div class="modal-dialog"> <div class="modal-content"> <div class="modal-header"> <h5 class="modal-title" id="exampleModalLabel">Unblock ${data.student.firstName} ${data.student.lastName} From Your Course?</h5> <button type="button" class="close" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true">&times;</span> </button> </div> <div class="modal-body"> <p> ${data.student.firstName} will be able to rejoin the course with the join code. </p> </div> <div class="modal-footer"> <button type="button" class="btn btn-secondary" data-dismiss="modal">Back</button> <button type="button" class="btn btn-danger" id="${data.course._id}-${data.student._id}" onclick="unblock(this)">Yes, Unblock</button> </div> </div></div>`;

      document.getElementById("blocked-div").appendChild(blockedElement);
      document.getElementById("blocked-div").appendChild(unblockModal);

      if (data.course.students.length == 0) {
        document.getElementById("students").parentNode.removeChild(document.getElementById("students"));
      }
    }
  });
});

const removeTutor = ((button, location) => {
  const courseId = button.id.split('-')[0];
  const tutorId = button.id.split('-')[1];
  const reason = document.getElementById(`reason-${tutorId}`).value;
  const url = `/homework/remove-tutor/${courseId}?_method=put`;
  const data = {tutorId, reason, show: true};

  $.post(url, data, function(data) {
    if (data.success) {
      $(`#modal-index-remove-${tutorId}`).modal('hide');
      $(`#modal-remove-${tutorId}`).modal('hide');
      document.getElementById("tutor-index").removeChild(document.getElementById(`item-${tutorId}`));
      document.getElementById("tutor-div").removeChild(document.getElementById(`tutor-${tutorId}`));

      if (data.course.blocked.length == 1) {
        let blockedDiv = document.createElement("ul");
        blockedDiv.className = "list-group";
        blockedDiv.id = "blocked-div";
        blockedDiv.innerHTML = `<li class="list-group-item list-group-item-success">Blocked</li>`;
        document.getElementById("blocked-column").appendChild(blockedDiv);
      }

      let blockedElement = document.createElement("li");
      blockedElement.className = "list-group-item";
      blockedElement.id = `item-${data.tutor._id}`;
      blockedElement.innerHTML = `<a href="../profiles/${data.tutor._id}"class="user-element-text"> <img class="profile-image" src="${data.tutor.imageUrl}" alt="profile picture"> <span class="username ${data.tutor.status} ${data.tutor.permission} ${data.tutor.tags.join(' ')}"><span class="enrolled-name">${data.tutor.firstName} ${data.tutor.lastName}</span> <span class="enrolled-username">${data.tutor.username}</span></span> </a> <button class="btn btn-danger leave-button" id="unblock-button-${data.tutor._id}" data-toggle="modal" data-target="#modal-index-unblock-${data.tutor._id}">Unblock</button>`;

      let unblockModal = document.createElement("div");
      unblockModal.className = "modal fade";
      unblockModal.id = `modal-index-unblock-${data.tutor._id}`;
      unblockModal.setAttribute("tabindex", "-1");
      unblockModal.setAttribute("aria-labelledby", "deleteModalLabel");
      unblockModal.setAttribute("aria-hidden", "true");

      unblockModal.innerHTML = `<div class="modal-dialog"> <div class="modal-content"> <div class="modal-header"> <h5 class="modal-title" id="exampleModalLabel">Unblock ${data.tutor.firstName} ${data.tutor.lastName} From Your Course?</h5> <button type="button" class="close" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true">&times;</span> </button> </div> <div class="modal-body"> <p> ${data.tutor.firstName} will be able to rejoin the course with the join code. </p> </div> <div class="modal-footer"> <button type="button" class="btn btn-secondary" data-dismiss="modal">Back</button> <button type="button" class="btn btn-danger" id="${data.course._id}-${data.tutor._id}" onclick="unblock(this)">Yes, Unblock</button> </div> </div></div>`;

      document.getElementById("blocked-div").appendChild(blockedElement);
      document.getElementById("blocked-div").appendChild(unblockModal);

      if (data.course.tutors.length == 0) {
        document.getElementById("tutor-index").parentNode.removeChild(document.getElementById("tutor-index"));
        document.getElementById("tutor-div").parentNode.removeChild(document.getElementById("tutor-div"));
      }
    }
  });
});

const unblock = (button => {
  const courseId = button.id.split('-')[0];
  const blockedId = button.id.split('-')[1];
  const url = `/homework/unblock/${courseId}?_method=put`;
  const data = {blockedId};

  $.post(url, data, function(data) {

    if (data.success) {
      $(`#modal-index-unblock-${blockedId}`).modal('hide');
      document.getElementById("blocked-div").removeChild(document.getElementById(`item-${blockedId}`));

      if (data.course.blocked.length == 0) {
        document.getElementById("blocked-div").parentNode.removeChild(document.getElementById("blocked-div"));
      }
    }
  });
});

const changeBio = (button => {
  const courseId = button.id.split('-')[2];
  const bio = document.getElementById(`edit-bio-field`).value;

  if (bio.length < 100 || bio.length > 250) {
    document.getElementById("bio-length-error").hidden = false;
    setTimeout(() => {
      document.getElementById("bio-length-error").hidden = true;
    }, 1000);

  } else {
    const url = `/homework/bio/${courseId}?_method=put`;
    const data = {bio};

    $.post(url, data, function(data) {

      if (data.success) {
        $(`#modal-edit-bio`).modal('hide');
        document.getElementById("tutor-bio").innerText = bio;
      }
    });
  }
});

const setTime = (input => {
  const studentId = input.id.split('-')[1];
  document.getElementById(`time-label-${studentId}`).innerText = input.value;
});

const getTime = (experience => {
  let result;
  experience = parseInt(experience);
  if (experience < 60) {
    result = `${Math.round(experience * 100)/100} minute(s)`;

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
});

const mark = (button => {
  const courseId = button.id.split('-')[1];
  const studentId = button.id.split('-')[2];
  const time = parseInt(document.getElementById(`time-${studentId}`).value);
  const summary = document.getElementById(`summary-${studentId}`).value;
  const url = `/homework/mark/${courseId}?_method=put`;
  const data = {studentId, time, summary};

  $.post(url, data, function(data) {
    if (data.success) {
      document.getElementById(`time-${studentId}`).value = "0";
      document.getElementById("lessons-length").innerText = data.tutor.lessons.length;
      document.getElementById(`lessons-length-${studentId}`).innerText = parseInt(document.getElementById(`lessons-length-${studentId}`).innerText) + 1;

      let experience = 0;
      for (let lesson of data.tutor.lessons) {
        experience += lesson.time;
      }

      document.getElementById("experience").innerText = getTime(experience);
      $(`#modal-${studentId}-mark`).modal('hide');
    }
  });
});
