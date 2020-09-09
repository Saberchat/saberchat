const express = require('express');
const middleware = require('../middleware');
const router = express.Router();
const dateFormat = require('dateformat');

const User = require('../models/user');
const Order = require('../models/order');
const Item = require('../models/orderItem');
const Announcement = require('../models/announcement');
const Notification = require('../models/notification');

router.get('/', middleware.isLoggedIn, (req, res) => {
  Order.find({customer: req.user._id})
  .populate('items').exec((err, foundOrders) => {

    if (err || !foundOrders) {

      req.flash('error', "Could not find your orders");
      console.log(err);
      res.redirect('back');

    } else {

      Announcement.find({}).populate({
        path: 'sender',
        select: ['username', 'imageUrl']
      }).populate('message').exec((err, foundAnns) => {
        if (err || !foundAnns) {

          req.flash('error', 'Unable to access database');
          res.redirect('back');

        } else {



          res.render('cafe/index', {
            orders: foundOrders,
            announcements: foundAnns.reverse(),
            announced: false
          });
        }
      });
    }
  });
});

router.get('/new', middleware.isLoggedIn, (req, res) => {
  Item.find({}, (err, foundItems) => {
    if (err || !foundItems) {
      req.flash('error', 'Could not access database');
      res.redirect('/');
    } else {

      Announcement.find({}).populate({
        path: 'sender',
        select: ['username', 'imageUrl']
      }).populate('message').exec((err, foundAnns) => {
        if (err || !foundAnns) {
          req.flash('error', 'Unable to access database')
          res.redirect('back')

        } else {

          res.render('cafe/newOrder', {
            items: foundItems,
            announcements: foundAnns.reverse(),
            announced: false
          })
        }
      })
    }
  });
});

router.post('/new', middleware.isLoggedIn, (req, res) => {

  //Conditionals to make sure that the orders are done between 9 - 12:20

  let currentTime = new Date(new Date().getTime()).toString().split(' ')[4]

  if ((parseInt(currentTime.split(':')[0]) < 9 || parseInt(currentTime.split(':')[0]) > 12) || (parseInt(currentTime.split(':')[0]) == 12 && parseInt(currentTime.split(':')[1]) > 20)) {
    req.flash('error', "Send orders between 9AM and 12:20PM");
    res.redirect('back');

  } else {

    if (req.body.check) {

      Item.find({}, (err, foundItems) => {

        let unavailable = false

        if (err || !foundItems) {
          req.flash('error', "Unable to access database")
          res.redirect('back')

        } else {
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

                foundItems[i].save()

              }
            }
          }
        }

        if (!unavailable) {
          req.flash("success", "Order Sent!")
          res.redirect('/cafe/new');

        } else {
          req.flash("error", "Some items are unavailable in the quantities you requested")
          res.redirect('/cafe/new');
        }
      })

    } else {
      req.flash('error', "Cannot send empty order")
      res.redirect('/cafe/new');
    }
  }
});

router.get('/orders', middleware.isLoggedIn, (req, res) => {
  Order.find({present: true})
  .populate('items').exec((err, foundOrders) => {
    if (err) {
      req.flash('error', 'Could not find orders');
      console.log(err)
      res.redirect('back');

    } else {

      Announcement.find({}).populate({
        path: 'sender',
        select: ['username', 'imageUrl']
      }).populate('message').exec((err, foundAnns) => {
        if (err || !foundAnns) {
          req.flash('error', 'Unable to access database')
          res.redirect('back')
        } else {

          res.render('cafe/orderDisplay', {
            orders: foundOrders,
            announcements: foundAnns.reverse(),
            announced: false
          })
        }
      })
    }
  });
});

router.get('/delete_order/:id', middleware.isLoggedIn, (req, res) => {

  //Conditionals ensure that deletion time is between 9AM and 12PM
  let currentTime = new Date(new Date().getTime()).toString().split(' ')[4]
  console.log(currentTime)
  console.log(currentTime.split(':')[0])
  if (parseInt(currentTime.split(':')[0]) < 9 || parseInt(currentTime.split(':')[0]) >= 12) {
    req.flash('error', "Cannot delete orders after 12PM")
    res.redirect('back')

  } else {
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
  }
})

router.post('/:id/ready', middleware.isLoggedIn, (req, res) => {
  Order.findById(req.params.id).populate('items').exec((err, foundOrder) => {
    if (err || !foundOrder) {
      console.log(err);
      req.flash('error', "Could not find order");
      res.redirect('/cafe/manage');

    } else {

      foundOrder.present = false;
      foundOrder.save();

      User.findById(foundOrder.customer, (err, foundUser) => {
        if (err || !foundUser) {
          req.flash('error', "Could not find user");
          console.log(err);
          res.redirect('/cafe/manage');

        } else {
          Notification.create({}, (err, notif) => {
            if (err) {
              req.flash('error', "Could not create notif");
              console.log(err);
              res.redirect('/cafe/manage');

            } else {
              notif.subject = "Cafe Order Ready";
              notif.sender = req.user._id;
              notif.date = dateFormat(notif.created_at, "mmm d, h:MMTT")
              req.recipients = [foundUser.username]

              let itemText = [];
              for (var i = 0; i < foundOrder.items.length; i++) {
                itemText.push(`${foundOrder.items[i].name}: ${foundOrder.quantities[i]} order(s)`);
              }

              notif.text = "Your order (" + itemText.join(", ") + ") is ready (Total Cost: $" + foundOrder.charge + ")";
              notif.save();
              foundUser.inbox.push(notif);
              foundUser.save();

              res.redirect('/cafe/manage');
            }
          });
        }
      });
    }
  });
});

router.get('/manage', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  Item.find({}, (err, foundItems) => {
    if (err || !foundItems) {
      req.flash('error', 'Cannot access Database');
      res.redirect('/cafe');
    } else {

      Announcement.find({}).populate({
        path: 'sender',
        select: ['username', 'imageUrl']
      }).populate('message').exec((err, foundAnns) => {
        if (err || !foundAnns) {
          req.flash('error', 'Unable to access database')
          res.redirect('back')

        } else {

          res.render('cafe/manage', {
            items: foundItems,
            announcements: foundAnns.reverse(),
            announced: false
          })
        }
      })
    }
  });
});

router.get('/newOrderItem', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  Announcement.find({}).populate({
    path: 'sender',
    select: ['username', 'imageUrl']
  }).populate('message').exec((err, foundAnns) => {
    if (err || !foundAnns) {
      req.flash('error', 'Unable to access database')
      res.redirect('back')
    } else {

      res.render('cafe/newOrderItem', {
        announcements: foundAnns.reverse(),
        announced: false
      })
    }
  })
});

router.post('/newOrderItem', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  Item.create({}, (err, item) => {
    if (err) {
      console.log(err);
      req.flash('error', 'item could not be created');
      res.redirect('/cafe/newOrderItem');
    } else {
      item.name = req.body.name;
      item.availableItems = parseInt(req.body.available)
      item.description = req.body.description;
      if (parseFloat(req.body.price)) {
        item.price = parseFloat(req.body.price);
      } else {
        item.price = 0.00;
      }
      item.isAvailable = true;
      item.save();

      console.log('New OrderItem created: '.cyan);
      console.log(item);
      res.redirect('/cafe/manage');
    }
  });
});

router.get('/deleteItems', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  Announcement.find({}).populate({
    path: 'sender',
    select: ['username', 'imageUrl']
  }).populate('message').exec((err, foundAnns) => {
    if (err || !foundAnns) {
      req.flash('error', 'Unable to access database')
      res.redirect('back')
    } else {

      res.render('cafe/deleteitems', {
        announcements: foundAnns.reverse(),
        announced: false
      })
    }
  })
});

router.delete('/deleteItems', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  // Checkboxes
});

router.get('/item/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  Item.findById(req.params.id, (err, foundItem) => {
    if (err || !foundItem) {
      req.flash('error', 'item not found');
      res.redirect('/cafe/manage');
    } else {

      Announcement.find({}).populate({
        path: 'sender',
        select: ['username', 'imageUrl']
      }).populate('message').exec((err, foundAnns) => {
        if (err || !foundAnns) {
          req.flash('error', 'Unable to access database')
          res.redirect('back')

        } else {

          res.render('cafe/show.ejs', {
            item: foundItem,
            announcements: foundAnns.reverse(),
            announced: false
          })
        }
      })
    }
  });
});

router.put('/item/:id/update', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  Item.findByIdAndUpdate(req.params.id, {
    name: req.body.name,
    availableItems: parseInt(req.body.available),
    isAvailable: (parseInt(req.body.available) > 0),
    description: req.body.description
  }, (err, foundItem) => {
    if (err || !foundItem) {
      req.flash('error', 'item not found');
    }
    res.redirect('/cafe/manage');
  });
});

router.delete('/item/:id/delete', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  Item.findByIdAndDelete(req.params.id, (err, item) => {
    if (err || !item) {
      req.flash('error', 'Could not delete item');
    } else {
      req.flash('success', 'Deleted item');
      res.redirect('/cafe/manage');
    }
  })
});

module.exports = router;
