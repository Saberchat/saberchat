const slideContainer = document.getElementById('slides');
let j = document.getElementsByClassName("image-group").length;

const addSlide = function () { //Add slide input field
    const slide = document.createElement('div');
    slide.className = "image-group";
    slide.id = `slideblock-${j}`;
    slide.innerHTML = `<div class="input-container"><input type="text" id="slide-${j}" class="form-control mode slide" placeholder="Url..." name="slides[${j}]" required></div><button type="button" onclick="deleteSlide(this)" style="display: inline; float: right;" class="btn btn-danger"><i class="fas fa-minus"></i></button>`;
    slideContainer.prepend(slide);
    j++;
}

const deleteSlide = function (btn) { //Remove input field
    const parent = btn.parentNode;
    parent.remove();
    j--;
}
