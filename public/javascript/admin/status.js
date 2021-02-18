const loading = document.getElementById('loading');

// sends put request with data
const updateStatus = function (select) {
    loading.style.display = 'block';
    loading.style.color = 'gray';
    loading.innerHTML = 'Waiting...';
    const status = select.value;
    const url = '/admin/status?_method=put';
    const userId = select.id;
    const data = {user: userId, status: status};
    $.post(url, data, data => {
        if (data.success) {
            loading.style.color = 'green';
            loading.innerHTML = data.success;
        } else if (data.error) {
            loading.style.color = 'red';
            loading.innerHTML = data.error;
        }

        setTimeout(() => {
            loading.style.display = "none";
        }, 1000);

        if (data.user) {
            for (let option of select) {
                if (option.value == data.user.status) {
                    option.selected = true;
                }
            }
        }
    });
}

// sends put request with data
const updateTag = function (select) {
    loading.style.color = 'gray';
    loading.innerHTML = 'Waiting...';
    const tag = select.value;
    const url = '/admin/tag?_method=put';
    const userId = select.id;
    const field = document.getElementById(`user-${userId}`); //The row with user's info
    const tags = document.getElementsByClassName(`tag-${userId}`); //Each tag in this user's tag list
    const tagMap = new Map([["Tutor", "warning"], ["Cashier", "success"], ["Editor", "info"]]); //Map tracks the different button classes for each status tag

    // Send out JSON request
    const data = {user: userId, tag: tag};
    $.post(url, data, data => {

        if (data.success) { //If data is successfully posted
            loading.style.color = 'green';
            loading.innerHTML = data.success;

            if (data.success.includes("added")) { //If a tag has been added, create a new element, give it the bootstrap/CSS/text, and add it
                let new_tag = document.createElement('span');
                new_tag.className = `badge badge-pill badge-${tagMap.get(data.tag)} tag-${userId}`;
                new_tag.innerText = data.tag;
                new_tag.style = "margin-right: 5px;"
                field.appendChild(new_tag);

            } else { //If a tag has been removed, iterate through tags until the right tag is found, and remove it
                for (let t of tags) {
                    if (data.tag.toLowerCase() == t.innerText.toLowerCase()) {
                        field.removeChild(t);
                    }
                }
            }

        } else if (data.error) {
            loading.style.color = 'red';
            loading.innerHTML = data.error;
        }

        for (let option of select) { //Make the option with no value (the top option) the default selected option
            if (option.value == "") {
                option.selected = true;
            }
        }
    });
}

const searchFunction = function () {
    const users = document.getElementsByClassName('user');
    const searchInput = document.getElementById('search-input');
    let filter = searchInput.value.toLowerCase();

    for (let i = 0; i < users.length; i += 1) {
        if (!(users[i].textContent.split('\n')[1].toLowerCase().includes(filter) || users[i].classList.toString().toLowerCase().includes(filter.toLowerCase()))) {
            users[i].hidden = true;

        } else {
            users[i].hidden = false;
        }
    }
}
