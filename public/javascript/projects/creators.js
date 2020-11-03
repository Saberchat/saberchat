const creatorSelect = document.getElementById('creator-select');
const creatorDiv = document.getElementById('creator-div');
const creatorInput = document.getElementById('creator-input');

$("#project-image").hide();

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
});
