const creatorSelect = document.getElementById('creator-select');
const creatorDiv = document.getElementById('creator-div');
const creatorInput = document.getElementById('creator-input');
// const imageInput = document.getElementById('image-input');
// const projectImage = document.getElementById('project-image');

$("#project-image").hide()

let creatorList = [];

const addCreator = (user => {
  if (!creatorList.includes(creatorSelect.value)) {

    let newCreator = document.createElement('div');
    newCreator.classList.add('user-tag');
    newCreator.id = `${creatorSelect.value}`;
    creatorList.push(creatorSelect.value);
    creatorInput.value = creatorList.toString();

    newCreator.innerHTML = `<span name="creators" value="${creatorSelect.value}">${creatorSelect.options[creatorSelect.selectedIndex].text}</span>
    <button type="button" id="${creatorSelect.value}" onclick="remCreator(this)">&times;</button>`;
    creatorDiv.appendChild(newCreator);
  }
})

const remCreator = (btn => {
  const id = btn.id;

  const userTags = document.getElementsByClassName('user-tag');
  for (let tag of userTags) {

    if(tag.id == id) {
      creatorDiv.removeChild(tag);
      creatorList.splice(creatorList.indexOf(id), 1);
      creatorInput.value = creatorList.toString();
    }
  }
})

// imageInput.addEventListener('keydown', () => {
//   setTimeout(() => {
//
//     if (imageInput.value == "") {
//       projectImage.src = imageInput.value;
//       $("#project-image").hide();
//
//     } else {
//       projectImage.src = imageInput.value;
//       $("#project-image").show();
//     }
//   }, 3)
// })
//
// imageInput.addEventListener('paste', () => {
//   setTimeout(() => {
//     projectImage.src = imageInput.value;
//
//     if (imageInput.value == "") {
//       $("#project-image").hide();
//
//     } else {
//       $("#project-image").show();
//     }
//   }, 3)
// })
