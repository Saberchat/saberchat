//Cafe routes control the creation of orders, and the creation an modification of items and items types

//LIBRARIES
const express = require('express');
const middleware = require('../middleware');
const router = express.Router();
const dateFormat = require('dateformat');
const nodemailer = require('nodemailer');

//SCHEMA
const User = require('../models/user');
const Order = require('../models/order');
const Item = require('../models/orderItem');
const Notification = require('../models/message');
const Type = require('../models/itemType');
const Cafe = require('../models/cafe')

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'noreply.saberchat@gmail.com',
    pass: 'Tgy8erwIYtxRZrJHvKwkWbrkbUhv1Zr9'
  }
});

//ROUTES
router.get('/', middleware.isLoggedIn, (req, res) => { //RESTful routing 'order/index' route
  Order.find({customer: req.user._id})
  .populate('items.item').exec((err, foundOrders) => { //Find all of the orders that you have ordered, and populate info on their items

    if (err || !foundOrders) {

      req.flash('error', "Could not find your orders");
      console.log(err);
      res.redirect('back');

    } else {
      console.log(foundOrders)
      res.render('cafe/index', {orders: foundOrders});
    }
  });
});

router.get('/menu', middleware.isLoggedIn, (req, res) => { //Renders the cafe menu with info on all the items

  Type.find({}).populate('items').exec((err, foundTypes) => { //Collects info on every item type, to render (in frontend, the ejs checks each item inside type, and only shows it if it's available)
    if (err || !foundTypes) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      res.render('cafe/menu', {types: foundTypes})
    }
  })
})

router.get('/order/new', middleware.isLoggedIn, middleware.cafeOpen, (req, res) => { //RESTFUL routing 'order/new' route

  (async() => {

    const sent_orders = await Order.find({name: `${req.user.firstName} ${req.user.lastName}`, present: true}) //Find all of this user's orders that are currently active

    if (!sent_orders) {
      req.flash('error', "Unable to find orders");
      return res.redirect('back')

    } else if (sent_orders.length > 2) {
      req.flash('error', "You have made the maximum number of orders for the day");
      return res.redirect('back')
    }

    const types = await Type.find({}).populate('items');

    if (!types) {
      req.flash('error', "Unable to find types")
      return res.redirect('back')
    }

    res.render('cafe/newOrder', {types});

  })().catch(err => {
    console.log(err);
    req.flash('error', "Unable to access database");
    res.redirect('back');
  })
});

router.post('/order', middleware.isLoggedIn, middleware.cafeOpen, (req, res) => { //RESTful routing 'order/create' route

  (async () => { //Asynchronous function controls user ordering

    const sent_orders = await Order.find({name: `${req.user.firstName} ${req.user.lastName}`, present: true}) //Find all of this user's orders that are currently active

    if (!sent_orders) {
      req.flash('error', "Unable to find orders");return res.redirect('back')

    } else if (sent_orders.length > 2) { //If more than two orders are already made, you cannot order again
      req.flash('error', "You have made the maximum number of orders for the day"); return res.redirect('back')
    }

    if (req.body.check) { //If any items are selected

      const foundItems = await Item.find({}) //Find all items

      if (!foundItems) {
        req.flash('error', 'No items found'); return res.redirect('back')
      }

      let unavailable = false //The unavailable variable will determine if any items are unavailable in the quantities that the user requests (for an unlikely scenario where someone orders WHILE the user is ordering)

      for (let i = 0; i < foundItems.length; i ++) { //Iterate through each item and check if it has less available then the user's order
        if (Object.keys(req.body.check).includes(foundItems[i]._id.toString())) { //If item is selected to be ordered

          if (foundItems[i].availableItems < parseInt(req.body[foundItems[i].name])) { //First test to see if all items are available
            unavailable = true
            break //Immediately quit

          } else { //If all items are available, perform these operations
            foundItems[i].availableItems -= parseInt(req.body[foundItems[i].name])

            if (foundItems[i].availableItems == 0) {
              foundItems[i].isAvailable = false;
            }

            await foundItems[i].save() //If we find that the item has lost orders out now, change the item's status

          }
        }
      }

      if (!unavailable) { //This should not be necessary for the most part, since if an item is unavailable, it doesn't show up in the menu. But if the user starts ordering before someone else submits their order, this is a possibility
        req.flash("success", "Order Sent!")
        res.redirect('/cafe');

      } else {
        req.flash("error", "Some items are unavailable in the quantities you requested")
        res.redirect('/cafe/order/new');
      }

    } else { //If no items were checked
      req.flash('error', "Cannot send empty order")
      res.redirect('/cafe/order/new');
    }

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  })
});


router.get('/orders', middleware.isLoggedIn, middleware.isMod, (req, res) => { //This is for EC Cafe Workers to check all the available orders
  Order.find({present: true})
  .populate('items.item').exec((err, foundOrders) => { //Collect all orders which are currently active, and get all info on their items
    if (err) {
      req.flash('error', 'Could not find orders');
      console.log(err)
      res.redirect('back');

    } else {
      res.render('cafe/orderDisplay', {orders: foundOrders})
    }
  });
});

router.delete('/order/:id', middleware.isLoggedIn, middleware.cafeOpen, (req, res) => { //RESTful routing 'order/destroy' (for users to delete an order they no longer want)

  Order.findByIdAndDelete(req.params.id).populate('items.item').exec((err, foundOrder) => { //Delete the item selected in the form (but first, collect info on its items so you can replace them)
    if (err || !foundOrder) {
      req.flash("error", "Unable to access database")
      res.redirect('back')

    } else {
      for (let i = 0; i < foundOrder.items.length; i += 1) { //For each of the order's items, add the number ordered back to that item. (If there are 12 available quesadillas and our user ordered 3, there are now 15)
        foundOrder.items[i].item.availableItems += foundOrder.items[i].quantity
        foundOrder.items[i].item.isAvailable = true;
        foundOrder.items[i].item.save()
      }

      req.flash('success', "Order deleted!")
      res.redirect('/cafe')
    }
  })
})

router.post('/:id/ready', middleware.isLoggedIn, middleware.isMod, (req, res) => {

  (async () => {
    const order = await Order.findById(req.params.id).populate('items.item').populate('customer'); //Find the order that is currently being handled based on id, and populate info about its items
    if (!order) {
      req.flash('error', 'Could not find order'); return res.redirect('/cafe/orders');

    } else if (order.customer._id.toString() == req.user._id.toString()) { //If you made this order, you cannot confirm it (this counters an inbox error that arises from sending notifs to yourself)
      req.flash('error', 'You cannot confirm your own orders'); return res.redirect('/cafe/orders');
    }

    order.present = false; //Order is not active anymore
    await order.save();

    const notif = await Notification.create({subject: "Cafe Order Ready", sender: req.user, recipients: [order.customer], read: [], toEveryone: false, images: []}); //Create a notification to alert the user
      if (!notif) {
        req.flash('error', 'Unable to send notification'); return res.redirect('/cafe/orders');
      }

      notif.date = dateFormat(notif.created_at, "mmm d, h:MM TT");

      let itemText = []; //This will have all the decoded info about the order
      for (var i = 0; i < order.items.length; i++) {
        itemText.push(` - ${order.items[i].item.name}: ${order.items[i].quantity} order(s)`);
      }

      //Render the item's charge in '$dd.cc' pattern, based on what the actual charge is
      if (!order.charge.toString().includes('.')) {
        notif.text = "Your order is ready to pick up:\n" + itemText.join("\n") + "\n\nExtra Instructions: " + order.instructions + "\nTotal Cost: $" + order.charge + ".00";

      } else if (order.charge.toString().split('.')[1].length == 1){
        notif.text = "Your order is ready to pick up:\n" + itemText.join("\n") + "\n\nExtra Instructions: " + order.instructions + "\nTotal Cost: $" + order.charge + "0";

      } else {
        notif.text = "Your order is ready to pick up:\n" + itemText.join("\n") + "\n\nExtra Instructions: " + order.instructions + "\nTotal Cost: $" + order.charge + "";
      }

      await notif.save();

      let orderEmail = {
  		  from: 'noreply.saberchat@gmail.com',
  		  to: order.customer.email,
  		  subject: 'Cafe Order Ready',
  			text: `Hello ${order.customer.firstName},\n\n${notif.text}\n\n`
  		};

  		transporter.sendMail(orderEmail, function(error, info){
  		  if (error) {
  		    console.log(error);
  		  } else {
  		    console.log('Email sent: ' + info.response);
  		  }
  		})

      order.customer.inbox.push(notif); //Add notif to user's inbox
      order.customer.msgCount += 1
      await order.customer.save();

      req.flash('success', 'Order ready! A notification has been sent to the customer. If they do not arrive within 5 minutes, try contacting them again.')
      res.redirect('/cafe/orders');

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  })
});

router.post('/:id/reject', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  (async() => {
    const order = await Order.findById(req.params.id).populate('items.item').populate('customer');

    if (!order) {
      req.flash('error', 'Could not find order'); return res.redirect('back');

    } else if (order.customer._id.toString() == req.user._id.toString()) {
      req.flash('error', 'You cannot reject your own orders'); return res.redirect('/cafe/orders');
    }

    const deletedOrder = await Order.findByIdAndDelete(order._id).populate('items.item').populate('customer');

    if (!deletedOrder) {
      req.flash('error', "Unable to delete order"); return res.redirect('back');
    }

    for (let i of order.items) { //Iterate over each item/quantity object
      i.item.availableItems += i.quantity;
      i.item.isAvailable = true;
      await i.item.save();
    }

    const notif = await Notification.create({subject: "Cafe Order Rejected", sender: req.user, recipients: [order.customer], read: [], toEveryone: false, images: []}); //Create a notification to alert the user
    if (!notif) {
      req.flash('error', 'Unable to send notification'); return res.redirect('/cafe/orders');
    }

    notif.date = dateFormat(notif.created_at, "mmm d, h:MM TT");

    let itemText = []; //This will have all the decoded info about the order
    for (var i = 0; i < order.items.length; i++) {
      itemText.push(` - ${order.items[i].item.name}: ${order.items[i].quantity} order(s)`);
    }

    //Render the item's charge in '$dd.cc' pattern, based on what the actual charge is
    if (!order.charge.toString().includes('.')) {
      notif.text = "Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake.\n" + itemText.join("\n") + "\n\nExtra Instructions: " + order.instructions + "\nTotal Cost: $" + order.charge + ".00";

    } else if (order.charge.toString().split('.')[1].length == 1){
      notif.text = "Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake.\n" + itemText.join("\n") + "\n\nExtra Instructions: " + order.instructions + "\nTotal Cost: $" + order.charge + "0";

    } else {
      notif.text = "Your order was rejected. This is most likely because we suspect your order is not genuine. Contact us if you think there has been a mistake.\n" + itemText.join("\n") + "\n\nExtra Instructions: " + order.instructions + "\nTotal Cost: $" + order.charge + "";
    }

    await notif.save();

    let orderEmail = {
      from: 'noreply.saberchat@gmail.com',
      to: order.customer.email,
      subject: 'Cafe Order Rejected',
      text: `Hello ${order.customer.firstName},\n\n${notif.text}\n\n`
    };

    transporter.sendMail(orderEmail, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    })


    order.customer.inbox.push(notif); //Add notif to user's inbox
    order.customer.msgCount += 1
    await order.customer.save();

    req.flash('success', 'Order rejected! A message has been sent to the customer.')
    res.redirect('/cafe/orders');

  })().catch(err => {
    console.log(err);
    req.flash('error', "Unable to access database");
    res.redirect('back')
  })
})

router.get('/manage', middleware.isLoggedIn, middleware.isMod, (req, res) => { //Route to manage cafe
  Type.find({}).populate('items').exec((err, foundTypes) => { //Collect info on all the item types
    if (err || !foundTypes) {
      req.flash('error', 'Unable to access Database');
      res.redirect('/cafe');

    } else {
      Cafe.find({}, (err, foundCafe) => { //Collect info on whether or not the cafe is open
        if (err || !foundCafe) {
          req.flash('error', "Unable to access database");
          res.redirect('back');

        } else {
          res.render('cafe/manage', {types: foundTypes, open: foundCafe[0].open})
        }
      })
    }
  })
});

router.get('/open', middleware.isLoggedIn, middleware.isMod, (req, res) => { //Route to open cafe
  Cafe.find({}, (err, foundCafe) => {
    if (err || !foundCafe) {
      req.flash('error', "Unable to access database");
      res.redirect('back');

    } else {
      //Open cafe here
      foundCafe[0].open = true;
      foundCafe[0].save();
      req.flash('success', "Cafe is now open!")
      res.redirect('/cafe/manage')
    }
  })
})

router.get('/close', middleware.isLoggedIn, middleware.isMod, (req, res) => { //Route to close cafe
  Cafe.find({}, (err, foundCafe) => {
    if (err || !foundCafe) {
      req.flash('error', "Unable to access database");
      res.redirect('back');

    } else {
      //Close cafe here
      foundCafe[0].open = false;
      foundCafe[0].save();
      req.flash('success', "Cafe is now closed!")
      res.redirect('/cafe/manage')
    }
  })
})

router.get('/item/new', middleware.isLoggedIn, middleware.isMod, (req, res) => { //RESTFUL routing 'item/new'
  Type.find({}, (err, foundTypes) => { //Find all possible item types
    if (err || !foundTypes) {
      req.flash('error', "Unable to access database")

    } else {
      res.render('cafe/newOrderItem', {types: foundTypes})
    }
  })
});

router.post('/item', middleware.isLoggedIn, middleware.isMod, (req, res) => { //RESTFUL routing 'item/create'

  (async() => {

    const overlap = await Item.find({name: req.body.name});

    if (!overlap) {
      req.flash('error', "Unable to find items");return res.redirect('back')

    } else if (overlap.length > 0) {
      req.flash('error', "Item already in database");return res.redirect('back')
    }

    const item = await Item.create({name: req.body.name, availableItems: parseInt(req.body.available), description: req.body.description, imgUrl: req.body.image}) //Create the item

    if (!item) {
      req.flash('error', "Unable to create item");return res.redirect('back')
    }

    //Algorithm to create charge; once created, add to item's info

    if (parseFloat(req.body.price)) {
      item.price = parseFloat(req.body.price);
    } else {
      item.price = 0.00;
    }

    //Determine is type is available based on whether or not the EC admin made its availability more than 0
    if (parseInt(req.body.available) > 0) {
      item.isAvailable = true;
    }

    const type = await Type.findOne({name: req.body.type}) //Find the type specified in the form

    if (!type) {
      req.flash('error', "Unable to find correct item type");return res.redirect('back')
    }

    await item.save()
    type.items.push(item); //Push this item to that type's item list
    await type.save();
    res.redirect('/cafe/manage');

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  })
});

router.get('/item/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => { //View an item's profile

  (async() => {

    const item = await Item.findById(req.params.id); //Find item based on specified id

    if (!item) {
      req.flash('error', "Unable to find item"); return res.redirect('back')
    }

    const types = await Type.find({}); //Find all types
    if (!types) {
      req.flash('error', "Unable to find item types"); return res.redirect('back')
    }

    res.render('cafe/show.ejs', {types, item})

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  })
});

router.put('/item/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => { //Update an item

  (async() => {

    const item = await Item.findByIdAndUpdate(req.params.id, { //Find item based on specified ID
      //Update all of these properties
      name: req.body.name,
      price: parseFloat(req.body.price),
      availableItems: parseInt(req.body.available),
      isAvailable: (parseInt(req.body.available) > 0),
      description: req.body.description,
      imgUrl: req.body.image
    });

    if (!item) {
      req.flash('error', 'item not found'); return res.redirect('back');
    }

    const activeOrders = await Order.find({present:true}).populate('items.item'); //Any orders that are active will need to change, to accomodate the item changes.

    if (!activeOrders) {
      req.flash('error', "Unable to find active orders"); return res.redirect('back');
    }

    for (let order of activeOrders) {
      order.charge = 0 //Reset the order's charge, we will have to recalculate

      for (let i = 0; i < order.items.length; i += 1) { //Iterate over each order, and change its price to match the new item prices
        order.charge += order.items[i].item.price * order.items[i].quantity
      }
      await order.save()
    }

    const types = await Type.find({name: {$ne: req.body.type}}) //Collect all item types

    if (!types) {
      req.flash('error', "Unable to find item types"); return res.redirect('back')
    }

    for (let t of types) { //Remove this item from its old item type (if the type has not changed, it's fine because we' add it back in a moment anyway)
      if (t.items.includes(item._id)) {
        t.items.splice(t.items.indexOf(item._id), 1)
      }

      await t.save()
    }

    const type = await Type.findOne({name: req.body.type});  //Add the item to the type which is now specified

    if (!type) {
      req.flash('error', 'Unable to find item type')
    }

    if (type.items.includes(item._id)) { //If item is already in type, remove it so you can put the updated type back (we don't know whether the type will be there or not, so it's better to just cover all bases)
      type.items.splice(type.items.indexOf(item._id), 1)
    }

    type.items.push(item)
    await type.save()

    req.flash('success', "Item updated!")
    res.redirect('/cafe/manage');

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  })
});

router.delete('/item/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => { //Delete order item

  (async() => {

    const item = await Item.findByIdAndDelete(req.params.id); //Delete item based on specified ID

    if (!item) {
      req.flash('error', 'Could not delete item'); return res.redirect('back')
    }

    const types = await Type.find({}); //Find all possible types

    if (!types) {
      req.flash('error', "Could not remove item from list of item types"); return res.redirect('back')
    }

    for (let type of types) { //If the type includes this item, remove the item from that type's item list
      if (type.items.includes(item._id)) {
        type.items.splice(type.items.indexOf(item._id), 1);
        await type.save();
      }
    }

    const orders = await Order.find({}).populate('items.item');

    if (!orders) {
      req.flash('error', 'Could not find orders'); return res.redirect('back')
    }

    for (let order of orders) {//If the order includes this item, remove the item from that order's item list
      for (let i of order.items) {
        if (i.item == null) {
          order.items.splice(i, 1)
        }
      }

      order.charge = 0
      for (let i of order.items) {
        order.charge += (i.item.price * i.quantity);
      }
      order.save()
    }

    req.flash('success', 'Deleted Item!');
    res.redirect('/cafe/manage');

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  })
});

// NOT BEING USED
// router.get('/deleteItems', middleware.isLoggedIn, middleware.isMod, (req, res) => {
//   res.render('cafe/deleteitems')
// });
//
// router.delete('/deleteItems', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  // Checkboxes
// });

router.get('/type/new', middleware.isLoggedIn, middleware.isMod, (req, res) => { // RESTful route "New" for type
  Type.find({}).populate('items').exec((err, types) => { //Collect info on all the items, so that we can give the user the option to add them to that type
    if (err || !types) {
      req.flash('error', "Unable to find types")
      res.redirect('back')

    } else {
      res.render('cafe/newItemType', {types})
    }
  })
})

router.post('/type', middleware.isLoggedIn, middleware.isMod, (req, res) => { // RESTful route "Create" for type

  ( async() => {

    const overlappingTypes = await Type.find({name: req.body.name}); //Find all item types with this name that already exist

    if (!overlappingTypes) {
      req.flash('error', "Unable to find item types"); return res.redirect('back')
    }

    if (overlappingTypes.length == 0) { //If there are none, go ahead
      const type = await Type.create({name: req.body.name, items: []});

      if (!type) {
        req.flash('error', "Item Type could not be created"); return res.redirect('back');
      }

      const types = await Type.find({}); //Found types, but represents all item types
      if (!types) {
        req.flash('error', "Could not find item types"); return res.redirect('back');
      }

      for (let t of types) { //Now that we've created the type, we have to remove the newly selected items from all other types
        for (let i = 0; i < t.items.length; i += 1) {
          if(req.body[t.items[i].toString()]) {
            t.items.splice(i, 1)
          }
        }
        await t.save()
      }


      const items = await Item.find({}); //Find all items

      if (!items) {
        req.flash('error', 'Could not find items'); return res.redirect('back')

      }

      for (let item of items) { //If the item is selected, add it to this type (now that we've removed it from all other types)
        if(req.body[item._id.toString()]) {
          type.items.push(item)
        }
      }

      await type.save()

      req.flash('success', "Item Category Created!")
      res.redirect('/cafe/manage')

    } else { //If an overlap is found
      req.flash('error', "Item type already in database.")
      res.redirect('back')
    }

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  })
})

router.get('/type/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => { // RESTful route "Show/Edit" for type

  (async() => {

    const type = await Type.findById(req.params.id).populate('items'); //Find the specified type

    if (!type) {
      req.flash('error', "Unable to access database"); return res.redirect('back')

    } else if (type.name == "Other") {
      req.flash('error', "You cannot modify that category"); return res.redirect('/cafe/manage')
    }

    const types = await Type.find({_id: {$nin: type._id}}).populate('items'); //Find all items

    if (!types) {
      req.flash('error', "Unable to access database"); return res.redirect('back');
    }

    res.render('cafe/editItemType', {type, types})

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  });
});

router.put('/type/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => { // RESTful route "Update" for type

  (async() => {

    const types = await Type.find({_id: {$ne: req.params.id}, name: req.body.name}); //Find all types besides the one we are editing with the same name

    if (!types) {
      req.flash('error', "Unable to access database"); return res.redirect('back');
    }

    if (types.length == 0) { //If no items overlap, then go ahead

      const type = await Type.findByIdAndUpdate(req.params.id, {name: req.body.name}); //Update this item type based on the id

      if (!type) {
        req.flash('error', "Unable to update item type"); return res.redirect('back')
      }

      const ft = await Type.find({_id: {$ne: type._id}}); //Find all other types

      if (!ft) {
        req.flash('error', "Unable to find item types"); return res.redirect('back');
      }

      for (let t of ft) { //Iterate over other types

        for (let i = 0; i < t.items.length; i += 1) { //Update them to remove the newly selected items from their 'items' array
          if(req.body[t.items[i].toString()]) {
            t.items.splice(i, 1)
          }
        }

        await t.save();
      }

      const foundItems = await Item.find({}) //Find all items

      if (!foundItems) {
        req.flash('error', 'Unable to find items'); return res.redirect('back')
      }

      for (let item of type.items) {
        if (!req.body[item._id.toString()]) { //Item is no longer checked

          const other = await Type.findOne({name: 'Other'}) //Find type 'other'

          if (!other) {
            req.flash('error', "Unable to find item type 'Other', please add it'"); res.redirect('back')
          }

          other.items.push(item) //Move that item to 'Other'
          await other.save()

        }
      }

      type.items = [] //Our type is now empty

      for (let item of foundItems) { //Push new items to type's items[] array, based on the latest changes
        if(req.body[item._id.toString()]) {
          type.items.push(item)
        }
      }

      await type.save();

      req.flash('success', "Item type updated!")
      res.redirect('/cafe/manage')

    } else {
      req.flash('error', "Item already in database")
      res.redirect('back')
    }

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  })
})

router.delete('/type/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => { //// RESTful route "Destroy" for type

  (async() => {

    const type = await Type.findByIdAndDelete(req.params.id); //Delete type based on specified ID

    if (!type) {
      req.flash('error', "Unable to find item type"); return res.redirect('back');
    }

    const other = await Type.findOne({name: "Other"}) //Find the type with name 'Other' - we've created this type so that any unselected items go here

      if (!other) {
        req.flash('error', "Unable to find item type 'Other'"); return res.redirect('back');
      }

      for (let item of type.items) {
        other.items.push(item)
      }

      await other.save()

    req.flash('success', "Item type deleted!")
    res.redirect('/cafe/manage')

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  })
})

module.exports = router;
