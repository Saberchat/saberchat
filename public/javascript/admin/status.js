const updateStatus = function(select) { //Update a user's official stautus
    const loading = document.getElementById('loading');
    loading.style.display = 'block';
    loading.style.color = 'gray';
    loading.innerHTML = 'Waiting...';
    const status = select.value;
    const url = '/admin/status?_method=put';
    const userId = select.id;
    const data = {userId, status};
    sendPostReq(url, data, data => { //If data is successful, display success message
        if (data.success) {
            loading.style.color = 'green';
            loading.innerHTML = data.success;
        } else if (data.error) { //If unsuccessful, display error message
            loading.style.color = 'red';
            loading.innerHTML = data.error;
        }

        setTimeout(() => { //After a second, hide the message
            loading.style.display = "none";
        }, 2000);

        if (data.user) { //If a user was updated, change their displayed status
            for (let option of select) {
                if (option.value == data.user.status) {
                    option.selected = true;
                }
            }
        }
    });
}

const updateTag = function(select) { //Update a user's status tags
    const loading = document.getElementById('loading');
    loading.style.color = 'gray';
    loading.innerHTML = 'Waiting...';
    const tag = select.value;
    const url = '/admin/tag?_method=put';
    const userId = select.id;
    const field = document.getElementById(`user-${userId}`); //The row with user's info
    const tags = document.getElementsByClassName(`tag-${userId}`); //Each tag in this user's tag list

    const data = {userId, tag};
    sendPostReq(url, data, data => {
        if (data.success) { //If data is successfully posted
            loading.style.color = 'green';
            loading.innerHTML = data.success;

            if (data.success.includes("added")) { //If a tag has been added, create a new element, give it the bootstrap/CSS/text, and add it
                let new_tag = document.createElement('span');
                new_tag.className = `badge badge-pill badge-warning tag-${userId}`;
                new_tag.innerText = data.tag;
                new_tag.style = "margin-right: 5px;"
                field.appendChild(new_tag);

            } else { //If a tag has been removed, iterate through tags until the right tag is found, and remove it
                for (let t of tags) {
                    if (data.tag.toLowerCase() == t.innerText.toLowerCase()) {field.removeChild(t);}
                }
            }

        } else if (data.error) {
            loading.style.color = 'red';
            loading.innerHTML = data.error;
        }

        for (let option of select) { //Make the option with no value (the top option) the default selected option
            if (option.value == "") {option.selected = true;}
        }

        setInterval(() => {loading.style.display = "none";}, 2000)
    });
}