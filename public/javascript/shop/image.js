const createImage = function(imageInput, imageTarget) { //Create an image based on input
    if (imageInput.value.replaceAll(' ', '') != '') {
        document.getElementById(imageTarget).src = imageInput.value;
        document.getElementById(imageTarget).hidden = false;

    } else { //If image input is blank, hide the image object
        document.getElementById(imageTarget).hidden = true;
    }
}