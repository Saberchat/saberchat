//Collect DOM Elements

const container = document.getElementById('container');
const dropdown = document.getElementsByTagName('select');
const fci = document.getElementsByClassName('form-check-input');
const fcl = document.getElementsByClassName('form-check-label');
const numOrders = document.getElementsByClassName('num-orders');
const extraInstructionsInput = document.getElementById('descInput');
const extraInstructions = document.getElementById('extra-instructions');
const total = document.getElementById('total-cost');
const orderConfirm = document.getElementById("order-confirm");
const payingInPerson = document.getElementById("payingInPerson");
let balanceString = document.getElementById("balance-box").innerText;
let orderedItem; //Order that will show up in your 'confirm order' page
let sum = 0;
let instructionsNew;
let totalNew;
let payingStyleNew;
let balanceBox;
let formattedCost;
let currentCustomer;
let currentBalance = 0;

const searchCustomers = function(input) { //Check list of customers for online ordering from centralized computer
    const url = `/shop/search-customers`;
    const data = {text: input.value};
    const userSelect = document.getElementById("user-select");
    let appendedCustomer;

    if (input.value.length > 2) {
        sendPostReq(url, data, data => {
            if (data.success && data.customers.length > 0) { //If there are customers to display
                userSelect.style.display = "block";
                while (userSelect.firstChild) {userSelect.removeChild(userSelect.firstChild);} //Empty userSelect from previous searches

                //Add heading back to userSelect's list
                const heading = document.createElement("option");
                for (let attr of ["selected", "disabled"]) {heading[attr] = true;}
                heading.className = "recipient-group";
                heading.innerText = "Select User";
                userSelect.appendChild(heading);

                for (let customer of data.customers) { //Build userSelect option
                    appendedCustomer = document.createElement("option");
                    appendedCustomer.className = customer.classValue;

                    appendedCustomer.innerText = customer.displayValue;
                    appendedCustomer.setAttribute("value", `${customer.idValue} ${customer.balance} | ${customer.displayValue}`);
                    userSelect.appendChild(appendedCustomer); //Add userSelect option to menu
                }
            } else {
                userSelect.style.display = "none"; //Hide dropdown if there are no matching elements
            }
        });
    } else {
        userSelect.style.display = "none"; //Hide dropdown if there is not a long enough input string
    }
}

const setCustomer = function(dropdown, dollarPayment) {
    document.getElementById("current-name").innerText = `Current Customer: ${dropdown.value.split('| ')[1]}`;
    document.getElementById("current-name").className = dropdown.value.split(' ')[0];
    currentCustomer = dropdown.value.split(' ')[0];
    currentBalance = parseInt(dropdown.value.split(' ')[1]);
    balanceString = `Current Balance: $${currentBalance.toFixed(2)}`;
    document.getElementById("balance-box").innerText = balanceString;
    changeOrderConfirmation(dollarPayment);
}

//Changes the order confirmation on the form
const changeOrderConfirmation = function(dollarPayment) {
    sum = 0;
    while (orderConfirm.firstChild) { //Remove all the items in the 'confirm order' section
        orderConfirm.removeChild(orderConfirm.firstChild);
    }

    for (let i of fci) { //Iterate over every member of 'form-check-input' (Checkboxes)
        for (let l of fcl) { //Iterate over every memebr of 'form-check-label' (Checkbox Labels)
            if (l.htmlFor == i.id) { //if the label matches the input
                if (i.checked) { //If it is checked

                    for (let no of numOrders) {
                        if (no.id.split('_')[1] == i.id) { //Id's are constructed in format 'dd_<id>'. This extracts that ID
                            if (dollarPayment) {
                                sum += parseInt(no.value) * parseFloat(l.innerText.split('$')[1]);
                            } else {
                                sum += parseInt(no.value) * parseFloat(l.innerText.split('Credits: ')[1]);
                            }

                            orderedItem = document.createElement('strong'); //Create the item confirmation
                            orderedItem.className = "list-group-item list-group-item-action form-check darkmode-outline";

                            if (dollarPayment) {
                                formattedCost = (parseInt(no.value) * parseFloat(l.innerText.split('$')[1]));
                                orderedItem.innerText = `${no.name} (${no.value} orders) - $${formattedCost.toFixed(2)}`;
                            } else {
                                formattedCost = (parseInt(no.value) * parseFloat(l.innerText.split("Credits: ")[1]));
                                orderedItem.innerText = `${no.name} (${no.value} orders) - ${formattedCost} Credits`;
                            }
                            orderConfirm.appendChild(orderedItem); //Add the order to the list of orders
                        }
                    }
                }
            }
        }
    }

    instructionsNew = document.createElement('span'); //Once this process is finished, create an element to render the extra instructions and total cost
    instructionsNew.style = 'color: blue;';
    instructionsNew.className = "list-group-item list-group-item-action form-check darkmode-outline";
    instructionsNew.id = "extra-instructions";

    if (extraInstructionsInput.value == '') {
        instructionsNew.innerHTML = `<strong>Extra Instructions:</strong> None`;
    } else {
        instructionsNew.innerHTML = `<strong>Extra Instructions:</strong> ${extraInstructionsInput.value}`;
    }

    balanceBox = document.createElement('strong');
    balanceBox.style = 'color: purple;';
    balanceBox.className = "list-group-item list-group-item-action form-check darkmode-outline";
    balanceBox.id = "balance-box";
    balanceBox.innerText = balanceString;
    totalNew = document.createElement('span');
    totalNew.style = 'color: green;';
    totalNew.className = "list-group-item list-group-item-action form-check darkmode-outline";
    totalNew.id = "total-cost";

    if (dollarPayment) {totalNew.innerHTML = `<strong>Total: $${sum.toFixed(2)}</strong>`;
    } else {totalNew.innerHTML = `<strong>Total: ${sum} Credits</strong>`;}

    if (dollarPayment) {
        if (sum > parseFloat(balanceString.split("$")[1]) && !payingInPerson.checked) {
            totalNew.innerHTML += `<em style="color: red; margin-left: 20px;">Charge is over your account balance</em>`
        }
    } else {
        if (sum > parseFloat(balanceString.split(": ")[1].split(' ')[0])) {
            totalNew.innerHTML += `<em style="color: red; margin-left: 20px;">Charge is over your account balance</em>`
        }
    }

    payingStyleNew = document.createElement('strong');
    payingStyleNew.style = 'color: red;';
    payingStyleNew.className = "list-group-item list-group-item-action form-check darkmode-outline";
    payingStyleNew.id = "paying-style";

    if (dollarPayment) {
        if (payingInPerson.checked) {
            payingStyleNew.innerText = "Paying In-Person";
        } else {
            payingStyleNew.innerText = "Paying Online";
        }
    }

    orderConfirm.appendChild(instructionsNew); //Add the total to the div
    if (!dollarPayment || (dollarPayment && !payingInPerson.checked)) {orderConfirm.appendChild(balanceBox);}

    orderConfirm.appendChild(totalNew);
    orderConfirm.appendChild(payingStyleNew);
}
