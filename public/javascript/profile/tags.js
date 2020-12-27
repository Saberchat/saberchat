// sends put request with data
const updateTag = (select => {
  const tagGroup = document.getElementById('tag-group');
  const tag = select.value;
  const tags = document.getElementsByClassName('user-tag');
  const url = '/profiles/tag/?_method=put';
  const tagMap = new Map([["Tutor", "warning"], ["Cashier", "success"], ["Editor", "info"]]); //Map tracks the different button classes for each status tag

  // Send out JSON request
  const data = {tag: tag};
  $.post(url, data, function(data) {

    if(data.success) { //If data is successfully posted
      for (let option of select) { //Make the option with no value (the top option) the default selected option
        if (option.value == "") {
          option.selected = true;
          break;
        }
      }

      if (data.success.includes("added")) { //If a tag has been added, create a new element, give it the bootstrap/CSS/text, and add it
        let new_tag = document.createElement('span');
        new_tag.className = `badge badge-pill badge-${tagMap.get(data.tag)} tag-${data.user} user-tag`;
        new_tag.innerText = data.tag;
        new_tag.style="margin-right: 5px;"
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
