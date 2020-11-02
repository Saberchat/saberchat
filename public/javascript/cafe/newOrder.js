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
let orderedItem; //Order that will show up in your 'confirm order' page
let sum = 0;
let instructionsNew;
let totalNew;

//Changes the order confirmation on the form
const changeOrderConfirmation = (() => {
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
              sum += parseInt(no.value) * parseFloat(l.innerText.split('$')[1])

              orderedItem = document.createElement('strong') //Create the item confirmation
              orderedItem.className = "list-group-item list-group-item-action form-check" //Give it the boostrap class that will style it

              //Decide its text based on what the total cost is
              if (! (parseInt(no.value) * parseFloat(l.innerText.split('$')[1])).toString().includes('.') ) {
                orderedItem.innerText = `${no.name} (${no.value} orders) - \$${parseInt(no.value) * parseFloat(l.innerText.split('$')[1])}.00`

              } else if ((parseInt(no.value) * parseFloat(l.innerText.split('$')[1])).toString().split('.')[1].length == 1){
                orderedItem.innerText = `${no.name} (${no.value} orders) - \$${parseInt(no.value) * parseFloat(l.innerText.split('$')[1])}0`

              } else {
                orderedItem.innerText = `${no.name} (${no.value} orders) - \$${parseInt(no.value) * parseFloat(l.innerText.split('$')[1])}`
              }

              orderConfirm.appendChild(orderedItem) //Add the order to the list of orders
            }
          }
        }
      }
    }
  }

  //Once this process is finished, create an element to render the extra instructions and total cost

  instructionsNew = document.createElement('span')
  instructionsNew.style = 'color: blue;';
  instructionsNew.className = "list-group-item list-group-item-action form-check"

  if (extraInstructionsInput.value == '') {
    instructionsNew.innerHTML = `<strong>Extra Instructions:</strong> None`;

  } else {
    instructionsNew.innerHTML = `<strong>Extra Instructions:</strong> ${extraInstructionsInput.value}`;
  }

  totalNew = document.createElement('strong')
  totalNew.style = 'color: green;'
  totalNew.className = "list-group-item list-group-item-action form-check"


  //Create cost in full '$dd.cc' format based on what the total is
  if (!sum.toString().includes('.')) {
    totalNew.innerText = `Total: $${sum}.00`

  } else if (sum.toString().split('.')[1].length == 1){
    totalNew.innerText = `Total: $${sum}0`

  } else {
    totalNew.innerText = `Total: $${sum}`
  }

  //Add the total to the div
  orderConfirm.appendChild(instructionsNew)
  orderConfirm.appendChild(totalNew)

})
