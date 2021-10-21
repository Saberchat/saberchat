const search = function() { //Item search function
    const catHeaders = document.getElementsByClassName('category-header'); //Category header
    const catBreaks = document.getElementsByClassName('category-break'); //Category page break
    const menuItems = document.getElementsByClassName('menu-item');
    const input = document.getElementById("search-input");
    let filter = input.value.toLowerCase().replaceAll(' ', '');
    let options = [];

    for (let item of menuItems) { //Iterate through menu items and display any that match the keyword filter
        options = [];
        //Add all textual and classList elements to options array
        for (let element of item.textContent.toLowerCase().split(' ')) {options.push(element);}
        for (let element of item.classList.toString().split(' ')) {options.push(element);}

        //If query directly appears in an item's DOM text
        if ((item.textContent.replaceAll(' ', '').toLowerCase().includes(filter)) || (item.classList.toString().toLowerCase().includes(filter))) {
            item.hidden = false;
        //If query is <3 operations away (typo)
        } else if (matchTypo(filter, options).length > 0 && matchTypo(filter, options)[0] < 3) {
            item.hidden = false;
        //If query does not occur
        } else {
            item.hidden = true;
        }
    }

    let catIncluded; //Category Included
    for (let h = 0; h < catHeaders.length; h ++) { //Iterate through category headers
        catIncluded = false;
        //Iterate through items with this category class name, and check if they match the search
        for (let item of document.getElementsByClassName(catHeaders[h].getElementsByTagName("h2")[0].textContent.replaceAll(' ', ''))) {
            options = [];
            for (let element of item.textContent.toLowerCase().split(' ')) {options.push(element);}
            for (let element of item.classList.toString().split(' ')) {options.push(element);}

            //If some element in this category matches query (meaning it will be displayed)
            if ((item.textContent.replaceAll(' ', '').toLowerCase().includes(filter)) || (item.classList.toString().toLowerCase().includes(filter))) {
                catIncluded = true;
                break;
            //Typo test (<3 operations away from query)
            } else if (matchTypo(filter, options).length > 0 && matchTypo(filter, options)[0] < 3) {
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

const sortItems = function(dropdown) { //Sort items based on dropdown setting
    let categories = []; //Populate array with each category name
    for (let category of document.getElementsByClassName("category-header")) {
        categories.push(category.innerText.split('\n')[0]);
    }

    let items;
    let sorted = false; //Track if array is sorted

    const url = `/shop/sort`;
    const data = {setting: dropdown.value};
    
    sendPostReq(url, data, data => {
        if (data.success) {
            for (let category of categories) { //Find each category and perform inner bucketsort
                items = document.getElementsByClassName(category.split(' ').join(''));
                sorted = false;
                while (!sorted) {
                    sorted = true; //Set sorted to true and traverse until condition falsified
                    for (let i = 0; i < items.length-1; i++) {
                        //If items are out of order, swap them
                        if (data.sorted.indexOf(items[i].id.split('-')[1]) > data.sorted.indexOf(items[i+1].id.split('-')[1])) {
                            items[i].parentNode.insertBefore(items[i+1], items[i]);
                            sorted = false; //If swap is necessary, the sort is not completed
                        }
                    }
                }
            }
        }
    });
}