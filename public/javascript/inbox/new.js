const form = document.getElementById('message-form');

const recipientList = document.getElementById("recipient-list");
const userSelect = document.getElementById('user-select');
const userDisplay = document.getElementById('user-display');

const defaultMsg = document.getElementById('default-msg');

const everyoneCheck = document.getElementById('all-check');
const anonymousCheck = document.getElementById('anonymous-check');
const anonymousControl = document.getElementById('anonymous-control');

let recipients = [];

const process = function () { // processes all the selected recipients into form info
    if (!recipients.length > 0 && !everyoneCheck.checked) {
        return false;
    } else if (!everyoneCheck.checked) {
        const input = document.createElement('input');
        input.type = 'text';
        input.name = 'recipients';
        input.value = JSON.stringify(recipients);
        input.style.display = 'none';
        form.appendChild(input);
    }
    return true;
}

const updateTo = function (check) { // toggles recipients selection
    if (check.checked) {
        recipientList.style.display = "none";
        userSelect.style.display = "none";
        defaultMsg.style.display = 'none';
        userDisplay.style.display = 'none';
        anonymousControl.style.display = 'none';

        recipients = [];
        clearTags();
        userSelect.value = '';

        if (anonymousCheck.checked) {
            anonymousCheck.checked = false;
        }

    } else {
        recipientList.style.display = "block";
        userSelect.style.display = "block";
        defaultMsg.style.display = 'block';
        anonymousControl.style.display = 'block';
        userDisplay.style.display = 'block';
        setAnonymous(anonymousCheck);
    }
}

const setAnonymous = function (check) { // toggles anonymous messaging
    if (everyoneCheck.checked) {
        check.checked = false;
    } else {
        const placeholderMap = new Map([[true, "Recipients (Faculty)"], [false, "Recipients"]]);
        recipientList.style.display = "block";
        recipientList.value = "";
        recipients = [];
        clearTags();
        userSelect.style.display = "none";
        userSelect.value = '';
        recipientList.placeholder = placeholderMap.get(check.checked);
    }
}

const clearTags = function () { // clears user tags
    const tags = document.getElementsByClassName('user-tag');
    while (tags[0]) {tags[0].parentNode.removeChild(tags[0]);}
}

const searchRecipients = function(input) {
    const url = `/inbox/search-recipients`;
    const data = {
        text: input.value,
        anonymous: document.getElementById("anonymous-check").checked
    };
    let appendedRecipient;

    if (input.value.length > 2) {
        sendPostReq(url, data, data => {
            if (data.success && data.recipients.length > 0) { //If there are recipients to display
                userSelect.style.display = "block";
                while (userSelect.firstChild) {userSelect.removeChild(userSelect.firstChild);} //Empty userSelect from previous searches

                //Add heading back to userSelect's list
                const heading = document.createElement("option");
                for (let attr of ["selected", "disabled"]) {heading[attr] = true;}
                heading.className = "recipient-group";
                heading.innerText = "Select User/Group";
                userSelect.appendChild(heading);

                for (let recType of ["status", "user"]) {
                    for (let recipient of data.recipients) { //Build userSelect option
                        if (recipient.type == recType) {
                            appendedRecipient = document.createElement("option");
                            if (recType == "user") {
                                appendedRecipient.className = recipient.classValue;
                            } else {
                                appendedRecipient.className = "recipient-group";
                            }

                            appendedRecipient.innerText = recipient.displayValue;
                            appendedRecipient.setAttribute("value", recipient.idValue);
                            userSelect.appendChild(appendedRecipient); //Add userSelect option to menu
                        }
                    }
                }
            } else {
                userSelect.style.display = "none"; //Hide dropdown if there are no matching elements
            }
        });
    } else {
        userSelect.style.display = "none"; //Hide dropdown if there is not a long enough input string
    }
}

const addRecipient = function () { // adds recipients to list
    addTag(userSelect, userSelect.value);
}

const addTag = function (select, id) { // adds the user tag to the display
    if (!(recipients.includes(id)) && !(recipients.includes(select.options[select.selectedIndex].className))) { //Check whether this user is already in the list, or whether their group (status) is already in the list
        const username = select.options[select.selectedIndex].text;
        recipients.push(id);

        const tag = document.createElement('div');
        tag.classList.add('user-tag');
        tag.classList.add(`${select.options[select.selectedIndex].className}`); //Put the user status in the tag
        tag.innerHTML = `<span>${username}</span><button type="button" id="${id}" onclick="remRecipient(this)">&times;</button>`;
        userDisplay.appendChild(tag);

        let deletes = []; //List of usernames to be removed
        for (let t = 0; t < document.getElementsByClassName('user-tag').length; t++) { //Go through list of creators, remove any users who have this className (if the added 'username' is a status e.g. '12th', it removes any excess 12th graders)
            if (document.getElementsByClassName('user-tag')[t].classList.contains(select.options[select.selectedIndex].value)) {
                deletes.push(t);
            }
        }

        for (let del of deletes.reverse()) { //Iterate through list of usernames to remove
            remRecipient(document.getElementsByClassName('user-tag')[del].getElementsByTagName('button')[0]);
        }
    }
    //Hide dropdown and empty input
    recipientList.value = "";
    userSelect.style.display = "none";
}

const remRecipient = function (btn) { // remove recipients
    const id = btn.id;
    const i = recipients.indexOf(id);
    if (i > -1) {
        recipients.splice(i, 1);
    }
    const parent = btn.parentNode;
    parent.parentNode.removeChild(parent);
}
