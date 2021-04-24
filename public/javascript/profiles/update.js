const updateImage = (imageInput => { //Update profile display image
    const imageMap = new Map([['profile-input', 'profile-image'], ['banner-input', 'banner-image']]); //Relates the different HTML element ids for images

    if (imageInput.value.split(' ').join('') != '') {
        document.getElementById(imageMap.get(imageInput.id)).src = imageInput.value; //The HTML image element that corresponds to the HTML imput element
        document.getElementById(imageMap.get(imageInput.id)).hidden = false; //Display image

    } else { //If there is no text, hide the image
        document.getElementById(imageMap.get(imageInput.id)).hidden = true;
    }
});

const updateTag = (select => { //Update status tags
    const tagGroup = document.getElementById('tag-group');
    const tag = select.value;
    const tags = document.getElementsByClassName('user-tag');
    const url = '/profiles/tag/?_method=put';

    const data = {tag};
    sendPostReq(url, data, data => {
        if (data.success) { //If data is successfully posted
            for (let option of select) { //Make the option with no value (the top option) the default selected option
                if (option.value == "") {
                    option.selected = true;
                    break;
                }
            }

            if (data.success.includes("added")) { //If a tag has been added, create a new element, give it the bootstrap/CSS/text, and add it
                let new_tag = document.createElement('span');
                new_tag.className = `badge badge-pill badge-warning tag-${data.user} user-tag`;
                new_tag.innerText = data.tag;
                new_tag.style = "margin-right: 5px;"
                tagGroup.appendChild(new_tag);

            } else { //If a tag has been removed, iterate through tags until the right tag is found, and remove it
                for (let t of tags) {
                    if (data.tag == t.innerText) {
                        tagGroup.removeChild(t);
                    }
                }
            }
        }
    });
});
