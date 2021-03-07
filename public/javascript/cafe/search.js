const search = function () { //Item search function
    const catHeaders = document.getElementsByClassName('category-header'); //Category header
    const catBreaks = document.getElementsByClassName('category-break'); //Category page break
    const menuItems = document.getElementsByClassName('menu-item');
    const input = document.getElementById("search-input");
    let filter = input.value.toLowerCase().replaceAll(' ', '');

    for (let item of menuItems) { //Iterate through menu items and display any that match the keyword filter
        if ((item.textContent.replaceAll(' ', '').toLowerCase().includes(filter)) || (item.classList.toString().toLowerCase().includes(filter))) {
            item.hidden = false;
        } else {
            item.hidden = true;
        }
    }

    let catIncluded; //Category Included
    for (let h = 0; h < catHeaders.length; h ++) { //Iterate through category headers
        catIncluded = false;
        //Iterate through items with this category class name, and check if they match the search
        for (let item of document.getElementsByClassName(catHeaders[h].getElementsByTagName("h2")[0].textContent.replaceAll(' ', ''))) {
            if ((item.textContent.replaceAll(' ', '').toLowerCase().includes(filter)) || (item.classList.toString().toLowerCase().includes(filter))) {
                catIncluded = true;
                break;
            }
        }

        if (catIncluded) { //If there is an item with this category, display the header
            catHeaders[h].hidden = false;
            catBreaks[h].hidden = false;

        } else {
            catHeaders[h].hidden = true;
            catBreaks[h].hidden = true;
        }
    }
}

//Searching for orders works differently from the other cafe search function
const searchOrders = function () {
    const orders = document.getElementsByClassName('card');
    const searchInput = document.getElementById('search-input');
    let filter = searchInput.value.toLowerCase();

    for (let i = 0; i < orders.length; i ++) {
        if (!orders[i].innerText.toLowerCase().includes(filter)) {
            orders[i].hidden = true;

        } else {
            orders[i].hidden = false;
        }
    }
}