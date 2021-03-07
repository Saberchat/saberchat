const createImage = function (imageInput) { //Create an image based on input
    if (imageInput.value.replaceAll(' ', '') != '') {
        document.getElementById("item-image").src = imageInput.value;
        document.getElementById("item-image").hidden = false;

    } else {
        document.getElementById("item-image").hidden = true;
    }
}
