const book = ((button, location) => {
  const courseId = button.id.split('-')[0];
  const tutorId = button.id.split('-')[1];
  const url = `/homework/book/${courseId}?_method=put`;
  const data = {tutor: tutorId};

  $.post(url, data, function(data) {
    if(data.success) {
      $(`#modal-book-${tutorId}`).modal('hide');

      const tutorDiv = document.getElementById(`tutor-actions-${tutorId}`);
      tutorDiv.removeChild(document.getElementById(`book-button-${tutorId}`));

      let reviewButton = document.createElement('button');
      let leaveButton = document.createElement('button');

      if (location == "show") {
        reviewButton.className ="review-button edit-button btn btn-warning";
        leaveButton.className ="leave-button edit-button btn btn-danger";

      } else if (location == "tutor-show") {
        reviewButton.className ="edit-button btn btn-warning";
        leaveButton.className ="edit-button btn btn-danger";
      }

      reviewButton.id = `review-button-${tutorId}`;
      reviewButton.setAttribute("data-toggle", "modal");
      reviewButton.setAttribute("data-target", `#modal-review-${tutorId}`);
      reviewButton.innerHTML = "Leave A Review";

      leaveButton.id = `leave-button-${tutorId}`;
      leaveButton.setAttribute("data-toggle", "modal");
      leaveButton.setAttribute("data-target", `#modal-stop-${tutorId}`);
      leaveButton.innerHTML = "Stop Lessons";

      if (!data.formerStudent) {
        tutorDiv.appendChild(reviewButton);
      }

      tutorDiv.appendChild(leaveButton);


      document.getElementById("new-count").innerText = `${data.user.newRoomCount.length + data.user.annCount.length}`;
      document.getElementById("new-count").hidden = false;

      document.getElementById("new-chat").innerText = `${data.user.newRoomCount.length}`;
      document.getElementById("new-chat").hidden = false;

    }
  });
});

const leave = ((button, location) => {
  const courseId = button.id.split('-')[0];
  const tutorId = button.id.split('-')[1];
  const url = `/homework/leave/${courseId}?_method=put`;
  const data = {tutor: tutorId};

  $.post(url, data, function(data) {
    if(data.success) {
      $(`#modal-stop-${tutorId}`).modal('hide');

      const tutorDiv = document.getElementById(`tutor-actions-${tutorId}`);
      tutorDiv.removeChild(document.getElementById(`review-button-${tutorId}`));
      tutorDiv.removeChild(document.getElementById(`leave-button-${tutorId}`));

      let reviewButton = document.createElement('button');
      let bookButton = document.createElement('button');

      if (location == "show") {
        reviewButton.className ="review-button edit-button btn btn-warning";
        bookButton.className ="book-button edit-button btn btn-info";

      } else if (location == "tutor-show") {
        reviewButton.className ="edit-button btn btn-warning";
        bookButton.className ="edit-button btn btn-info";
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
    }
  });
});

const closeLessons = ((button, location) => {
  const courseId = button.id.split('-')[0];
  const tutorId = button.id.split('-')[1];
  const url = `/homework/close-lessons/${courseId}?_method=put`;
  const data = {tutor: tutorId};

  $.post(url, data, function(data) {

    if (data.success) {
      $(`#modal-close-${tutorId}`).modal('hide');

      let reopenButton = document.createElement('button');

      if (location == "show") {
        reopenButton.className ="reopen-lessons edit-button btn btn-success";
      } else if (location == "tutor-show") {
        reopenButton.className ="edit-button btn btn-success";
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
  const data = {tutor: tutorId};

  $.post(url, data, function(data) {

    if (data.success) {
      $(`#modal-reopen-${tutorId}`).modal('hide');

      let closeButton = document.createElement('button');

      if (location == "show") {
        closeButton.className ="close-lessons edit-button btn btn-danger";
      } else if (location == "tutor-show") {
        closeButton.className ="edit-button btn btn-danger";
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

const setStudentsShow = ((courseId) => {
  const url = `/homework/setStudents/${courseId}?_method=put`;
  const slots = document.getElementById('slots').value;
  const data = {courseId, slots};

  $.post(url, data, function(data) {
    if (data.success) {
      document.getElementById("slots-count").innerText = `${slots}`;
      document.getElementById("change-message").style.color = "green";
      document.getElementById("change-message").innerText = "Succesfully Changed";

    } else if (data.error) {
      document.getElementById("change-message").style.color = "red";
      document.getElementById("change-message").innerText = "An Error Occurred";
    }

    document.getElementById("change-message").hidden = false;
    setTimeout(() => {
      document.getElementById("change-message").hidden = true;
    }, 1000);

  });
});
