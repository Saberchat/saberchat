const addEmail = function(event, version) { //Add an email to access list/blocked list
    event.preventDefault();
    const url = '/admin/accesslist?_method=put';
    const address = document.getElementById("address").value;
    const data = {address, version};

    $.post(url, data, data => {
        $("#modal-add-email").modal('hide');

        if (data.success) { //If successful response, create new HTML element for email
            document.getElementById("address").value = "";
            let newEmail = document.createElement("li");
            newEmail.className = "list-group-item email cafe";
            newEmail.id = `${data.email._id}`;
            newEmail.innerHTML = `${data.email.address} <div class="delete-email"> <button type="button" class="btn btn-danger" data-toggle="modal" data-target="#modal-${data.email._id}" id="delete-button"><i class="fas fa-trash-alt"></i> Remove</button> <div class="modal fade" id="modal-${data.email._id}" tabindex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true"> <div class="modal-dialog mode"> <div class="modal-content mode"> <div class="modal-header mode"> <h5 class="modal-title" id="exampleModalLabel">Remove Email From Access List?</h5> <button type="button" class="close mode" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true">&times;</span> </button> </div> <div class="modal-body mode"> If an account is currently using this email, it cannot be deleted. </div> <div class="modal-footer mode"> <button type="button" class="btn btn-secondary" data-dismiss="modal">No, Go Back</button> <button type="button" onclick="removeEmail(this)" id="remove-${data.email._id}" class="btn btn-danger">Yes, Remove Email</button></div></div></div></div></div>`;

            document.getElementById("email-list").insertBefore(newEmail, document.getElementsByClassName("email")[0]);

        } else if (data.error) { //Display error if unsuccessful response
            document.getElementById("loading").style.display = "block";
            document.getElementById("loading").innerText = data.error;

            setTimeout(() => { //After a second, remove the laoding message
                document.getElementById("loading").style.display = "none";
            }, 1000)
        }
    });
}

const removeEmail = function (button) { //Remove email from access list/blocked list
    const emailId = button.id.split('-')[1];
    const url = `/admin/accesslist?_method=delete`;
    const data = {email: emailId};

    $.post(url, data, data => {
        $(`#modal-${emailId}`).modal('hide');

        if (data.success) { //If successful response, remove email's body from page
            document.getElementById("email-list").removeChild(document.getElementById(`${emailId}`));

        } else if (data.error) { //Display error if unsuccessful image
            document.getElementById("loading").style.color = "red";
            document.getElementById("loading").style.display = "block";
            document.getElementById("loading").innerText = data.error;

            setTimeout(() => { //After a second, remove the loading message
                document.getElementById("loading").style.display = "none";
            }, 1000)
        }
    });
}
