const express = require('express');
const middleware = require('../middleware');
const router = express.Router();
const dateFormat = require('dateformat');

const User = require('../models/user');
const Order = require('../models/order');
const Item = require('../models/orderItem');
const Notification = require('../models/notification');
const Type = require('../models/itemType');
const Cafe = require('../models/cafe')

router.get('/', middleware.isLoggedIn, (req, res) => {
  Order.find({customer: req.user._id})
  .populate('items').exec((err, foundOrders) => {

    if (err || !foundOrders) {

      req.flash('error', "Could not find your orders");
      console.log(err);
      res.redirect('back');

    } else {
      res.render('cafe/index', {orders: foundOrders});
    }
  });
});

router.get('/menu', middleware.isLoggedIn, (req, res) => {
  Type.find({}).populate('items').exec((err, foundTypes) => {
    if (err || !foundTypes) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      res.render('cafe/menu', {types: foundTypes})
    }
  })
})

router.get('/order/new', [middleware.isLoggedIn, middleware.cafeOpen], (req, res) => {

  Type.find({}).populate('items').exec((err, foundTypes) => {
    if (err || !foundTypes) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      res.render('cafe/newOrder', {types: foundTypes});
    }
  })
});

router.post('/order', [middleware.isLoggedIn, middleware.cafeOpen], (req, res) => {

  (async () => { //Asynchronous function controls user ordering

    const sent_orders = await Order.find({name: `${req.user.firstName} ${req.user.lastName}`, present: true})

    if (!sent_orders) {
      req.flash('error', "Unable to find orders");return res.redirect('back')

    } else if (sent_orders.length > 2) {
      req.flash('error', "You have made the maximum number of orders for the day"); return res.redirect('back')
    }

    if (req.body.check) {

      const foundItems = await Item.find({})

      if (!foundItems) {
        req.flash('error', 'No items found'); res.redirect('back')
      }

      let unavailable = false

      for (let i = 0; i < foundItems.length; i ++) {
        if (Object.keys(req.body.check).includes(foundItems[i]._id.toString())) { //If item is selected to be ordered

          if (foundItems[i].availableItems < parseInt(req.body[foundItems[i].name])) { //First test to see if all items are available
            unavailable = true
            break //Immediately quit

          } else { //If all items are available, perform these operations
            foundItems[i].availableItems -= parseInt(req.body[foundItems[i].name])

            if (foundItems[i].availableItems == 0) {
              foundItems[i].isAvailable = false;
            }

            await foundItems[i].save()

          }
        }
      }

      if (!unavailable) {
        req.flash("success", "Order Sent!")
        res.redirect('/cafe');

      } else {
        req.flash("error", "Some items are unavailable in the quantities you requested")
        res.redirect('/cafe/new');
      }

    } else {
      req.flash('error', "Cannot send empty order")
      res.redirect('/cafe/new');
    }

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  })
});


router.get('/orders', middleware.isLoggedIn, (req, res) => {
  Order.find({present: true})
  .populate('items').exec((err, foundOrders) => {
    if (err) {
      req.flash('error', 'Could not find orders');
      console.log(err)
      res.redirect('back');

    } else {
      res.render('cafe/orderDisplay', {orders: foundOrders})
    }
  });
});

router.delete('/order/:id', [middleware.isLoggedIn, middleware.cafeOpen], (req, res) => {

  Order.findByIdAndDelete(req.params.id).populate('items').exec((err, foundOrder) => {
    if (err || !foundOrder) {
      req.flash("error", "Unable to access database")
      res.redirect('back')

    } else {
      for (let i = 0; i < foundOrder.items.length; i += 1) {
        foundOrder.items[i].availableItems += foundOrder.quantities[i]
        foundOrder.items[i].isAvailable = true;
        foundOrder.items[i].save()
      }

      req.flash('success', "Order deleted!")
      res.redirect('/cafe')
    }
  })
})

router.post('/:id/ready', middleware.isLoggedIn, (req, res) => {

  (async () => {
    const order = await Order.findById(req.params.id).populate('items').populate('customer');
    if (!order) {
      req.flash('error', 'Could not find order'); return res.redirect('/cafe/orders');

    } else if (order.customer._id.toString() == req.user._id.toString()) {
      req.flash('error', 'You cannot confirm your own orders'); return res.redirect('/cafe/orders');
    }

    order.present = false;
    await order.save();

    const notif = await Notification.create({subject: "Cafe Order Ready", sender: req.user, recipients: [order.customer], read: [false], toEveryone: false, images: []});
      if (!notif) {
        req.flash('error', 'Unable to send notification'); return res.redirect('/cafe/orders');
      }

      notif.date = dateFormat(notif.created_at, "mmm d, h:MMTT");

      let itemText = [];
      for (var i = 0; i < order.items.length; i++) {
        itemText.push(` - ${order.items[i].name}: ${order.quantities[i]} order(s)`);
      }

      if (!order.charge.toString().includes('.')) {
        notif.text = "Your order is ready to pick up:\n" + itemText.join("\n") + "\n\nExtra Instructions: " + order.instructions + "\nTotal Cost: $" + order.charge + ".00";

      } else if (order.charge.toString().split('.')[1].length == 1){
        notif.text = "Your order is ready to pick up:\n" + itemText.join("\n") + "\n\nExtra Instructions: " + order.instructions + "\nTotal Cost: $" + order.charge + "0";

      } else {
        notif.text = "Your order is ready to pick up:\n" + itemText.join("\n") + "\n\nExtra Instructions: " + order.instructions + "\nTotal Cost: $" + order.charge + "";
      }

      await notif.save();

      order.customer.inbox.push(notif);
      order.customer.notifCount += 1
      await order.customer.save();

      req.flash('success', 'Notification sent to customer! If they do not arrive within 5 minutes, try contacting them again')
      res.redirect('/cafe/orders');

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  })
});

router.get('/manage', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  Type.find({}).populate('items').exec((err, foundTypes) => {
    if (err || !foundTypes) {
      req.flash('error', 'Cannot access Database');
      res.redirect('/cafe');

    } else {
      Cafe.find({}, (err, foundCafe) => {
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

router.get('/open', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  Cafe.find({}, (err, foundCafe) => {
    if (err || !foundCafe) {
      req.flash('error', "Unable to access database");
      res.redirect('back');

    } else {
      foundCafe[0].open = true;
      foundCafe[0].save();
      req.flash('success', "Cafe is now open!")
      res.redirect('/cafe/manage')
    }
  })
})

router.get('/close', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  Cafe.find({}, (err, foundCafe) => {
    if (err || !foundCafe) {
      req.flash('error', "Unable to access database");
      res.redirect('back');

    } else {
      foundCafe[0].open = false;
      foundCafe[0].save();
      req.flash('success', "Cafe is now closed!")
      res.redirect('/cafe/manage')
    }
  })
})

router.get('/item/new', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  Type.find({}, (err, foundTypes) => {
    if (err || !foundTypes) {
      req.flash('error', "Unable to access database")

    } else {
      res.render('cafe/newOrderItem', {types: foundTypes})
    }
  })
});

router.post('/item', middleware.isLoggedIn, middleware.isMod, (req, res) => {

  (async() => {
    const item = await Item.create({})

    if (!item) {
      req.flash('error', "Unable to create item");return res.redirect('back')
    }

    item.name = req.body.name;
    item.availableItems = parseInt(req.body.available)
    item.description = req.body.description;
    item.imgUrl = req.body.image

    if (parseFloat(req.body.price)) {
      item.price = parseFloat(req.body.price);
    } else {
      item.price = 0.00;
    }
    item.isAvailable = true;

    const foundType = await Type.findOne({name: req.body.type})

    if (!foundType) {
      req.flash('error', "Unable to find correct item type");return res.redirect('back')
    }

    await item.save()
    foundType.items.push(item);
    await foundType.save();
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

router.get('/item/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => {

  (async() => {

    const item = await Item.findById(req.params.id);

    if (!item) {
      req.flash('error', "Unable to find item"); return res.redirect('back')
    }

    const types = await Type.find({});
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

router.put('/item/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => {

  (async() => {

    const item = await Item.findByIdAndUpdate(req.params.id, {
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

    const activeOrders = await Order.find({present:true}).populate('items'); //Any orders that are active will need to change, to accomodate the item changes.

    if (!activeOrders) {
      req.flash('error', "Unable to find active orders"); return res.redirect('back');
    }

    for (let order of activeOrders) {
      order.charge = 0

      for (let i = 0; i < order.items.length; i += 1) {
        order.charge += order.items[i].price * order.quantities[i]
      }
      await order.save()
    }

    const types = await Type.find({name: {$ne: req.body.type}})

    if (!types) {
      req.flash('error', "Unable to find item types"); return res.redirect('back')
    }

    for (let t of types) {
      if (t.items.includes(item._id)) {
        t.items.splice(t.items.indexOf(item._id), 1)
      }

      await t.save()
    }

    const type = await Type.findOne({name: req.body.type});

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

router.delete('/item/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => {

  (async() => {

    const item = await Item.findByIdAndDelete(req.params.id);

    if (!item) {
      req.flash('error', 'Could not delete item'); return res.redirect('back')
    }

    const types = await Type.find({});

    if (!types) {
      req.flash('error', "Could not remove item from list of item types"); return res.redirect('back')
    }

    for (let type of types) {
      if (type.items.includes(item._id)) {
        type.items.splice(type.items.indexOf(item._id), 1);
        await type.save();
      }
    }

    req.flash('success', 'Deleted Item!');
    res.redirect('/cafe/manage');

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  })
});

router.get('/type/new', [middleware.isLoggedIn, middleware.isMod], (req, res) => { // RESTful route "New" for type
  Item.find({}, (err,foundItems) => {
    if (err || !foundItems) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      res.render('cafe/newItemType', {items: foundItems})
    }
  })
})

router.post('/type', [middleware.isLoggedIn, middleware.isMod], (req, res) => { // RESTful route "Create" for type

  ( async() => {

    const foundTypes = await Type.find({name: req.body.name});

    if (!foundTypes) {
      req.flash('error', "Unable to find item types"); return res.redirect('back')
    }

    if (foundTypes.length == 0) {
      const type = await Type.create({name: req.body.name, items: []});

      if (!type) {
        req.flash('error', "Item Type could not be created"); return res.redirect('back');
      }

      const ft = await Type.find({}); //Found types, but represents all item types
      if (!ft) {
        req.flash('error', "Could not find item types"); return res.redirect('back');
      }

      for (let t of ft) {
        for (let i = 0; i < t.items.length; i += 1) {
          if(req.body[t.items[i].toString()]) {
            t.items.splice(i, 1)
          }
        }
        await t.save()
      }


      const foundItems = await Item.find({});

      if (!foundItems) {
        req.flash('error', 'Could not find items'); return res.redirect('back')

      }

      for (let item of foundItems) {
        if(req.body[item._id.toString()]) {
          type.items.push(item)
        }
      }

      await type.save()

      req.flash('success', "Item Category Created!")
      res.redirect('/cafe/manage')

    } else {
      req.flash('error', "Item type already in database.")
      res.redirect('back')
    }

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  })
})

router.get('/type/:id', [middleware.isLoggedIn, middleware.isMod], (req, res) => { // RESTful route "Show/Edit" for type

  (async() => {

    const type = await Type.findById(req.params.id);

    if (!type) {
      req.flash('error', "Unable to access database"); return res.redirect('back')
    }

    const items = await Item.find({});

    if (!items) {
      req.flash('error', "Unable to access database"); return res.redirect('back');
    }

    res.render('cafe/editItemType', {type, items})

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  });
});

router.put('/type/:id', [middleware.isLoggedIn, middleware.isMod], (req, res) => { // RESTful route "Update" for type

  (async() => {

    const foundTypes = await Type.find({_id: {$ne: req.params.id}, name: req.body.name});

    if (!foundTypes) {
      req.flash('error', "Unable to access database"); return res.redirect('back');
    }

    if (foundTypes.length == 0) {

      const type = await Type.findByIdAndUpdate(req.params.id, {name: req.body.name});

      if (!type) {
        req.flash('error', "Unable to update item type"); return res.redirect('back')
      }

      const ft = await Type.find({_id: {$ne: type._id}});

      if (!ft) {
        req.flash('error', "Unable to find item types"); return res.redirect('back');
      }

      for (let t of ft) {

        for (let i = 0; i < t.items.length; i += 1) {
          if(req.body[t.items[i].toString()]) {
            t.items.splice(i, 1)
          }
        }

        await t.save();
      }

      const foundItems = await Item.find({})

      if (!foundItems) {
        req.flash('error', 'Unable to find items'); return res.redirect('back')
      }

      for (let item of type.items) {
        if (!req.body[item._id.toString()]) { //Item is no longer checked

          const other = await Type.findOne({name: 'Other'})

          if (!other) {
            req.flash('error', "Unable to find item type 'Other', please add it'"); res.redirect('back')
          }

          other.items.push(item)
          await other.save()

        }
      }

      type.items = []

      for (let item of foundItems) {
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

router.delete('/type/:id', [middleware.isLoggedIn, middleware.isMod], (req, res) => { //// RESTful route "Destroy" for type

  (async() => {

    const type = await Type.findByIdAndDelete(req.params.id);

    if (!type) {
      req.flash('error', "Unable to find item type"); return res.redirect('back');
    }

    const other = await Type.findOne({name: "Other"})

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
