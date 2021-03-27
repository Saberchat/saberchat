const imgContainer = document.getElementById('image-block');
let i = document.getElementsByClassName("image-group").length;

const addImg = function () { //Add image input field
    const img = document.createElement('div');
    img.classList.add('image-group');
    img.id = `imageblock-${i}`;
    img.innerHTML = `<div class="input-container"><input type="text" id="${i}" class="form-control mode" oninput="createImg(this)" placeholder="Url..." name="images" required></div><button type="button" onclick="deleteImg(this)" style="display: inline;" class="btn btn-danger"><i class="fas fa-minus"></i></button>`;
    imgContainer.append(img);
    i++;
}

const addBlock = function() {
    const img = document.createElement('div');
    img.classList.add('image-group');
    img.id = `imageblock-${i}`;
    img.innerHTML = `<div class="input-container" id="display-${i}" ><input type="text" placeholder="Heading..." class="form-control mode" name="infoHeading"><br><textarea class="form-control mode" placeholder="Text..." name="infoText" rows="10"></textarea><br><input type="text" class="form-control mode" oninput="createImg(this)" id="${i}" placeholder="Url..." name="infoImages" required></div><button type="button" onclick="deleteImg(this)" style="display: inline;" class="btn btn-danger"><i class="fas fa-minus"></i></button><br>`;
    imgContainer.append(img);
    i++;
}

const createImg = function (val) { //Creates an image based on value of image input
    if ($(`#imageblock-${val.id}`).find('img').length == 0) { //If an image has not been created yet, create one
        const imageDisplay = document.createElement('img');
        imageDisplay.id = `image-${val.id}`;

        if (val.value.split(' ').join('') != '') { //If some input has been entered, build the image
            imageDisplay.src = val.value;
            imageDisplay.alt = "Image Does Not Exist"; //Display if image does not exist
            imageDisplay.style = "width: 40%; height: 40%; margin-top: 10px; border-radius: 15px;";
            document.getElementById(`imageblock-${val.id}`).appendChild(imageDisplay);
        }

    } else { //If an image has been created, update it
        if (val.value.split(' ').join('') != '') {
            $(`#imageblock-${val.id}`).find('img')[0].src = val.value;
            $(`#${$(`#imageblock-${val.id}`).find('img')[0].id}`).show();

        } else {
            $(`#${$(`#imageblock-${val.id}`).find('img')[0].id}`).hide();
        }
    }
}

const deleteImg = function (btn) { //Remove input field and corresponding image
    const parent = btn.parentNode;
    parent.remove();
    i--;
}
