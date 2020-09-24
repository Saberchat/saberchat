const container = document.getElementById('container')
console.log(container)
const dropdown = document.getElementsByTagName('select')
const fci = document.getElementsByClassName('form-check-input')
const fcl = document.getElementsByClassName('form-check-label')
const numOrders = document.getElementsByClassName('num-orders')
const total = document.getElementById('total-cost')
const orderConfirm = document.getElementById("order-confirm")
let orderedItem; //Order that will show up in your 'confirm order' page
let sum = 0


container.addEventListener('click', () => {
  sum = 0

  while (orderConfirm.firstChild) {
    orderConfirm.removeChild(orderConfirm.firstChild);
  }

  for (let i of fci) {
    for (let l of fcl) {
      if (l.htmlFor == i.id) {
        if (i.checked) {

          for (let no of numOrders) {
            if (no.id.split('_')[1] == i.id) {
              sum += parseInt(no.value) * parseFloat(l.innerText.split('$')[1])

              orderedItem = document.createElement('strong')
              orderedItem.className = "list-group-item list-group-item-action form-check"
              orderedItem.innerText = `${no.name} (${no.value} orders) - \$${parseInt(no.value) * parseFloat(l.innerText.split('$')[1])}`
              orderConfirm.appendChild(orderedItem)
            }
          }
        }
      }
    }
  }
  total.innerText = `Total: $${sum}`
})

for (let dd of dropdown) { //Every quantity dropdown menu
  dd.onchange = () => {
    sum = 0

    while (orderConfirm.firstChild) {
      orderConfirm.removeChild(orderConfirm.firstChild);
    }

    for (let i of fci) {
      for (let l of fcl) {
        if (l.htmlFor == i.id) {
          if (i.checked) {

            for (let no of numOrders) {
              if (no.id.split('_')[1] == i.id) {
                sum += parseInt(no.value) * parseFloat(l.innerText.split('$')[1])

                orderedItem = document.createElement('strong')
                orderedItem.className = "list-group-item list-group-item-action form-check"
                orderedItem.innerText = `${no.name} (${no.value} orders) - \$${parseInt(no.value) * parseFloat(l.innerText.split('$')[1])}`
                orderConfirm.appendChild(orderedItem)
              }
            }
          }
        }
      }
    }
    total.innerText = `Total: $${sum}`
  }
}

order(orderForm, '<%= currentUser._id %>');

function searchFunction() {
  let input = document.getElementById("search-input");
  let filter = input.value.toUpperCase();
  let list = document.getElementById("item-list");
  let items = list.getElementsByClassName('form-check');
  for (i = 0; i < items.length; i++) {
    let item = items[i].getElementsByTagName('label')[0];
    let txtValue = item.textContent || item.innerText;
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      items[i].style.display = "";
    } else {
      items[i].style.display = "none";
    }
  }
}
