const follow = (button => {
  const userId = button.id.split('-')[2];
  const url = `/profiles/follow/${userId}?_method=put`;
  const data = {};

  $.post(url, data, function(data) {
    if (data.success) {
      $(`#modal-${userId}-follow`).modal('hide');

      let unfollowButton = document.createElement('button');
      unfollowButton.id = `unfollow-${userId}`;
      unfollowButton.className = "btn btn-danger edit-button unfollow-button";
      unfollowButton.setAttribute("type", "button");
      unfollowButton.setAttribute("data-toggle", "modal");
      unfollowButton.setAttribute("data-target", `#modal-${userId}-unfollow`);
      unfollowButton.innerText = "Unfollow";
      document.getElementById(`follow-div-${userId}`).replaceChild(unfollowButton, document.getElementById(`follow-${userId}`));
    }
  });
});

const unfollow = (button => {
  const userId = button.id.split('-')[2];
  const url = `/profiles/unfollow/${userId}?_method=put`;
  const data = {};

  $.post(url, data, function(data) {
    if (data.success) {
      $(`#modal-${userId}-unfollow`).modal('hide');

      let followButton = document.createElement('button');
      followButton.id = `follow-${userId}`;
      followButton.className = "btn btn-primary edit-button follow-button";
      followButton.setAttribute("type", "button");
      followButton.setAttribute("data-toggle", "modal");
      followButton.setAttribute("data-target", `#modal-${userId}-follow`);
      followButton.innerText = "Follow";
      document.getElementById(`follow-div-${userId}`).replaceChild(followButton, document.getElementById(`unfollow-${userId}`));
    }
  });
});

const unfollow_show = (button => {
  const userId = button.id.split('-')[1];
  const url = `/profiles/unfollow/${userId}?_method=put`;
  const data = {};

  $.post(url, data, function(data) {
    if (data.success) {
      $(`#modal-${userId}-unfollow`).modal('hide');
      document.getElementById(`following-${userId}`).parentNode.removeChild(document.getElementById(`following-${userId}`));
      document.getElementById('following-button').innerText = `${parseInt(document.getElementById('following-button').innerText.split(' ')[0]) - 1} Following`;
    }
  });
});

const remove = (button => {
  const userId = button.id.split("-")[1];
  const url = `/profiles/remove/${userId}?_method=put`;
  const data = {};

  $.post(url, data, function(data) {
    if (data.success) {
      $(`#modal-${userId}-remove`).modal('hide');
      document.getElementById(`follower-${userId}`).parentNode.removeChild(document.getElementById(`follower-${userId}`));
      document.getElementById('followers-button').innerText = `${parseInt(document.getElementById('followers-button').innerText.split(' ')[0]) - 1} Follower(s)`;
    }
  });
});