const searchFunction = function() {
    const emails = document.getElementsByClassName('email');
    const searchInput = document.getElementById('search-input');
    let filter = searchInput.value.toLowerCase();

    for (let i = 0; i < emails.length; i += 1) {
        if (!emails[i].innerText.replace('User Exists', '').toLowerCase().includes(filter)) {
            emails[i].hidden = true;

        } else {
            emails[i].hidden = false;
        }
    }
}

const addEmail = function(event) {
    event.preventDefault();
    const url = '/admin/whitelist?_method=put';
    const address = document.getElementById("address").value;
    const data = {address};

    $.post(url, data, data => {
        $("#modal-add-email").modal('hide');

        if (data.success) {
            document.getElementById("address").value = "";
            let newEmail = document.createElement("li");
            newEmail.className = "list-group-item email";
            newEmail.id = `${data.email._id}`;
            newEmail.innerHTML = `${data.email.address} <div class="delete-email"> <button type="button" class="btn btn-danger" data-toggle="modal" data-target="#modal-${data.email._id}" id="delete-button"><i class="fas fa-trash-alt"></i> Remove</button> <div class="modal fade" id="modal-${data.email._id}" tabindex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true"> <div class="modal-dialog"> <div class="modal-content"> <div class="modal-header"> <h5 class="modal-title" id="exampleModalLabel">Remove Email From Whitelist?</h5> <button type="button" class="close" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true">&times;</span> </button> </div> <div class="modal-body"> If an account is currently using this email, it cannot be deleted. </div> <div class="modal-footer"> <button type="button" class="btn btn-secondary" data-dismiss="modal">No, Go Back</button> <button type="button" onclick="removeEmail(this)" id="remove-${data.email._id}" class="btn btn-danger">Yes, Remove Email</button></div></div></div></div></div>`;

            document.getElementById("email-list").insertBefore(newEmail, document.getElementsByClassName("email")[0]);

        } else if (data.error) {
            document.getElementById("loading").style.display = "block";
            document.getElementById("loading").innerText = data.error;

            setTimeout(() => {
                document.getElementById("loading").style.display = "none";
            }, 1000)
        }
    });
}

const removeEmail = function(button) {
    const emailId = button.id.split('-')[1];
    const url = `/admin/whitelist/${emailId}?_method=delete`;
    const data = {};

    $.post(url, data, data => {
        $(`#modal-${emailId}`).modal('hide');

        if (data.success) {
            document.getElementById("email-list").removeChild(document.getElementById(`${emailId}`));

        } else if (data.error) {
            document.getElementById("loading").style.color = "red";
            document.getElementById("loading").style.display = "block";
            document.getElementById("loading").innerText = data.error;

            setTimeout(() => {
                document.getElementById("loading").style.display = "none";
            }, 1000)
        }
    });
}
