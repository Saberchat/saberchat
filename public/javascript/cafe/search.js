const search = (() => {
  const catHeaders = document.getElementsByClassName('category-header'); //Category header
  const catBreaks = document.getElementsByClassName('category-break'); //Category page break
  const menuItems = document.getElementsByClassName('menu-item');
  const input = document.getElementById("search-input");
  let filter = input.value.toLowerCase().replaceAll(' ', '');

  for (let item of menuItems) {
    if ((item.textContent.replaceAll(' ', '').toLowerCase().includes(filter)) || (item.classList.toString().toLowerCase().includes(filter))) {
      item.hidden = false;

    } else {
      item.hidden = true;
    }
  }

  let catIncluded; //"Category Included"

  for (let h = 0; h < catHeaders.length; h+= 1) {
    catIncluded = false;

    for (let item of document.getElementsByClassName(catHeaders[h].getElementsByTagName("h2")[0].textContent.replaceAll(' ', ''))) {
      if((item.textContent.replaceAll(' ', '').toLowerCase().includes(filter)) || (item.classList.toString().toLowerCase().includes(filter))) {
        catIncluded = true;
        break;
      }
    }

    if (catIncluded) {
      catHeaders[h].hidden = false;
      catBreaks[h].hidden = false;

    } else {
      catHeaders[h].hidden = true;
      catBreaks[h].hidden = true;
    }
  }
});

//Searching for orders works differently from the other cafe search function
const searchOrders = (() => {
  const orders = document.getElementsByClassName('card');
  const searchInput = document.getElementById('search-input');
  let filter = searchInput.value.toLowerCase();

  for (let i = 0; i < orders.length; i += 1) {
    if (!orders[i].innerText.toLowerCase().includes(filter)) {
      orders[i].hidden = true;

    } else {
      orders[i].hidden = false;
    }
  }
});
