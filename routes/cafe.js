const express = require('express');
const middleware = require('../middleware');
const router = express.Router();

const User = require('../models/user');
const Order = require('../models/order');
const Item = require('../models/orderItem');
const Announcement = require('../models/announcement');
const Notification = require('../models/notification');

router.get('/', (req, res) => {
  Announcement.find({}).populate({
    path: 'sender',
    select: ['username', 'imageUrl']
  }).populate('message').exec((err, foundAnns) => {
    if (err || !foundAnns) {
      req.flash('error', 'Unable to access database');
      res.redirect('back');
    } else {
      res.render('cafe/index', {
        announcements: foundAnns,
        announced: false
      });
    }
  });
});

router.get('/new', (req, res) => {
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
            announcements: foundAnns,
            announced: false
          })
        }
      })
    }
  });
});

router.post('/new', (req, res) => {
  res.redirect('/cafe');
});

router.get('/orders', (req, res) => {
  Order.find({})
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
            announcements: foundAnns,
            announced: false
          })
        }
      })
    }
  });
});

router.post('/:id/ready', (req, res) => {
  Order.findById(req.params.id)
  .populate('items').exec((err, foundOrder) => {

    if (err || !foundOrder) {
      req.flash('error', "Could not find order");
      console.log(err);
      res.redirect('/cafe/manage');

    } else {
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
              console.log(notif);
              notif.type = "Cafe Order Status Update";
              notif.sender = req.user._id;

              let itemText = [];
              for (var i = 0; i < foundOrder.items.length; i++) {
                itemText.push(foundOrder.items[i].name);
              }

              notif.text = "Your order is ready: " + itemText.join(", ");
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
            announcements: foundAnns,
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
        announcements: foundAnns,
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
        announcements: foundAnns,
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
            announcements: foundAnns,
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
