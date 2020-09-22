const express = require('express');
const middleware = require('../middleware');
const router = express.Router();
const dateFormat = require('dateformat');

const User = require('../models/user');
const Order = require('../models/order');
const Item = require('../models/orderItem');
const Announcement = require('../models/announcement');
const Notification = require('../models/notification');
const Type = require('../models/itemType');

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

router.get('/new', middleware.isLoggedIn, (req, res) => {
  //Conditionals to make sure that the orders are done between 8 - 12:20

  let currentTime = new Date(new Date().getTime()).toString().split(' ')[4]

  if ((parseInt(currentTime.split(':')[0]) < 8 || parseInt(currentTime.split(':')[0]) >= 12)) {
    req.flash('error', "Send orders between 8AM and 12PM");
    res.redirect('back');

  } else {

    Type.find({}).populate('items').exec((err, foundTypes) => {
      if (err || !foundTypes) {
        req.flash('error', "Unable to access database")
        res.redirect('back')

      } else {
        Announcement.find({}).populate({
          path: 'sender',
          select: ['username', 'imageUrl']
        }).populate('message').exec((err, foundAnns) => {
          if (err || !foundAnns) {
            req.flash('error', 'Unable to access database');
            res.redirect('back');

          } else {

            res.render('cafe/newOrder', {
              types: foundTypes,
              announcements: foundAnns.reverse(),
              announced: false
            });
          }
        });
      }
    })
  }
});

router.post('/new', middleware.isLoggedIn, (req, res) => {

  //Conditionals to make sure that the orders are done between 9 - 12:20

  let currentTime = new Date(new Date().getTime()).toString().split(' ')[4]

  if ((parseInt(currentTime.split(':')[0]) < 8 || parseInt(currentTime.split(':')[0]) >= 12)) {
    req.flash('error', "Send orders between 8AM and 12:20PM");
    res.redirect('back');

  } else {

    Order.find({name: `${req.user.firstName} ${req.user.lastName}`, present: true}, (err, foundOrders) => {
      if (err || !foundOrders) {
        req.flash("error", "Unable to access database")
        res.redirect('back')

      } else {
        if (foundOrders.length >= 3) {
          req.flash("error", "You have made the maximum number of orders for one day")
          res.redirect('back')

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
                res.redirect('/cafe');

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
      }
    })
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
  if (parseInt(currentTime.split(':')[0]) < 8 || parseInt(currentTime.split(':')[0]) >= 12) {
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
      res.redirect('/cafe/orders');

    } else {

      foundOrder.present = false;
      foundOrder.save();

      User.findById(foundOrder.customer, (err, foundUser) => {
        if (err || !foundUser) {
          req.flash('error', "Could not find user");
          console.log(err);
          res.redirect('/cafe/orders');

        } else {
          Notification.create({toEveryone: false, images: []}, (err, notif) => {
            if (err) {
              req.flash('error', "Could not create notif");
              console.log(err);
              res.redirect('/cafe/orders');

            } else {
              notif.subject = "Cafe Order Ready";
              notif.sender = req.user._id;
              notif.date = dateFormat(notif.created_at, "mmm d, h:MMTT");
              notif.recipients = [foundUser];
              notif.read = [false];

              let itemText = [];
              for (var i = 0; i < foundOrder.items.length; i++) {
                itemText.push(` - ${foundOrder.items[i].name}: ${foundOrder.quantities[i]} order(s)`);
              }

              if (foundOrder.instructions == "") {
                notif.text = "Your order is ready:\n" + itemText.join("\n") + "\n\nExtra Instructions: None\nTotal Cost: $" + foundOrder.charge + "";

              } else {
                notif.text = "Your order is ready:\n" + itemText.join("\n") + "\n\nExtra Instructions: " + foundOrder.instructions + "\nTotal Cost: $" + foundOrder.charge + "";
              }
              notif.save();
              foundUser.inbox.push(notif);
              foundUser.notifCount += 1
              foundUser.save();

              res.redirect('/cafe/orders');
            }
          });
        }
      });
    }
  });
});

router.get('/manage', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  Type.find({}).populate('items').exec((err, foundTypes) => {
    if (err || !foundTypes) {
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
            types: foundTypes,
            announcements: foundAnns.reverse(),
            announced: false
          })
        }
      })
    }
  })
});

router.get('/newOrderItem', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  Type.find({}, (err, foundTypes) => {
    if (err || !foundTypes) {
      req.flash('error', "Unable to access database")

    } else {

      Announcement.find({}).populate({
        path: 'sender',
        select: ['username', 'imageUrl']
      }).populate('message').exec((err, foundAnns) => {
        if (err || !foundAnns) {
          req.flash('error', 'Unable to access database')
          res.redirect('back')
        } else {

          res.render('cafe/newOrderItem', {
            types: foundTypes,
            announcements: foundAnns.reverse(),
            announced: false
          })
        }
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
      item.imgUrl = req.body.image

      if (parseFloat(req.body.price)) {
        item.price = parseFloat(req.body.price);
      } else {
        item.price = 0.00;
      }
      item.isAvailable = true;


      Type.findOne({name: req.body.type}, (err, foundType) => { //Access type
        if (err || !foundType) {
          req.flash('error', "Unable to access database")

        } else {
          item.save()
          foundType.items.push(item);
          foundType.save();
          console.log('New OrderItem created: '.cyan);
          console.log(item);
          res.redirect('/cafe/manage');
        }
      })
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
  Item.findOne({_id: req.params.id}, (err, foundItem) => {
    if (err || !foundItem) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      Type.find({}, (err, foundTypes) => {
        if (err || !foundTypes) {
          req.flash('error', "Unable to access database")

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
                types: foundTypes,
                item: foundItem,
                announcements: foundAnns.reverse(),
                announced: false
              })
            }
          })
        }
      });
    }
  })
});

router.put('/item/:id/update', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  Item.findByIdAndUpdate(req.params.id, {
    name: req.body.name,
    availableItems: parseInt(req.body.available),
    isAvailable: (parseInt(req.body.available) > 0),
    description: req.body.description,
    imgUrl: req.body.image
  }, (err, foundItem) => {

    if (err || !foundItem) {
      req.flash('error', 'item not found');
      res.redirect('back')

    } else {

      Type.find({}, (err, foundTypes) => {
        if (err || !foundTypes) {
          req.flash('error', "Unable to access database")
          res.redirect('back')

        } else {

          loop1:
          for (let type of foundTypes) {
            loop2:
            for (let i = 0; i < type.items.length; i += 1) {
              if ((type.items[i]._id.toString() == foundItem._id.toString()) && (type.name != req.body.type)) {
                type.items.splice(i, 1)
                type.save()

              } else {
                break loop1;
              }
            }

            if (type.name == req.body.type) {
              type.items.push(foundItem);
              type.save();
            }
          }
        }
      })
    }
    res.redirect('/cafe/manage');
  });
});

router.delete('/item/:id/delete', middleware.isLoggedIn, middleware.isMod, (req, res) => {
  Item.findByIdAndDelete(req.params.id, (err, item) => {
    if (err || !item) {
      req.flash('error', 'Could not delete item');
      res.redirect('back')

    } else {

      Type.find({}, (err, foundTypes) => {
        if (err || !foundTypes) {
          req.flash('error', "Could not delete item")
          res.redirect('back')

        } else {

          for (let type of foundTypes) {
            if (type.items.includes(item._id)) {
              type.items.splice(type.items.indexOf(item._id), 1);
              type.save();
            }
          }
        }
      })

      req.flash('success', 'Deleted item');
      res.redirect('/cafe/manage');
    }
  })
});

router.get('/type/new', [middleware.isLoggedIn, middleware.isMod], (req, res) => { // RESTful route "New" for type
  Announcement.find({}).populate({
    path: 'sender',
    select: ['username', 'imageUrl']
  }).populate('message').exec((err, foundAnns) => {
    if (err || !foundAnns) {
      req.flash('error', 'Unable to access database')
      res.redirect('back')
    } else {
      res.render('cafe/newItemType', {announcements: foundAnns, announced: false})
    }
  })
})

router.post('/type', [middleware.isLoggedIn, middleware.isMod], (req, res) => { // RESTful route "Create" for type
  Type.find({name: req.body.name}, (err, foundTypes) => {
    if (err || !foundTypes) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else if (foundTypes.length == 0) {
      Type.create({name: req.body.name}, (err, type) => {
        if (err) {
          console.log(err)
          req.flash('error', "Item Type could not be created")
          res.redirect('back')

        } else {
          res.redirect('/cafe/manage')
        }
      })

    } else {
      req.flash('error', "Item type already in database.")
      res.redirect('back')
    }
  })
})

router.get('/type/:id', [middleware.isLoggedIn, middleware.isMod], (req, res) => { // RESTful route "Show/Edit" for type
  Type.findById(req.params.id, (err, type) => {
    if (err || !type) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      res.render('cafe/editItemType', {type})
    }
  })
});

router.put('/type/:id', [middleware.isLoggedIn, middleware.isMod], (req, res) => { // RESTful route "Update" for type
  Type.findByIdAndUpdate(req.params.id, {name: req.body.name}, (err, type) => {
    if (err || !type) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      req.flash('success', "Item type updated!")
      res.redirect('/cafe/manage')
    }
  })
})

router.delete('/type/:id', [middleware.isLoggedIn, middleware.isMod], (req, res) => { //// RESTful route "Destroy" for type
  Type.findByIdAndDelete(req.params.id, (err, type) => {
    if (err || !type) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {

      Type.findOne({name: "Other"}, (err, foundType) => {
        if (err || !foundType) {
          req.flash('error', "Unable to access database")

        } else {
          for (let item of type.items) {
            foundType.items.push(item)
          }
          foundType.save()
        }
      })

      req.flash('success', "Item type deleted!")
      res.redirect('/cafe/manage')
    }
  })
})

module.exports = router;
