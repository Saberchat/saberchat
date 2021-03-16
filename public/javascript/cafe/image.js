const createImage = function (imageInput, imageTarget) { //Create an image based on input
    if (imageInput.value.replaceAll(' ', '') != '') {
        document.getElementById(imageTarget).src = imageInput.value;
        document.getElementById(imageTarget).hidden = false;

    } else {
        document.getElementById(imageTarget).hidden = true;
    }
}