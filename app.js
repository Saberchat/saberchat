// set up env vars if in local developmeent
if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

//Require NodeJS modules
//set up and start the express server
const express = require('express');
const app = express();
// mongoose allows us to communicate with mongodb seamlessly through js
const mongoose = require('mongoose');
// passport.js is an authentication middleware module
const passport = require('passport');
const LocalStrategy = require('passport-local');
// flash messages on screen i.e "logged in successfully!"
const flash = require('connect-flash');
// middleware; parses incoming data from client under req.body
const bodyParser = require('body-parser');
// allow us to use other methods besides post and get
const methodOverride = require('method-override');
// package for formating dates on the serverside
const dateFormat = require('dateformat');
// Sets HTTP headers for security
const helmet = require('helmet');
// prevents MongoDB Operator Injection
const mongoSanitize = require('express-mongo-sanitize');

const {scriptUrls, styleUrls} = require('./srcUrls');
// const heic2any = require("heic2any");

// pretty up the console
// const colors = require('colors');
// add favicon
const favicon = require('serve-favicon');

// profanity filter
const Filter = require('bad-words');
const filter = new Filter();

// require scheduler
const schedule = require('node-schedule');

// require the models for database actions
const Comment = require('./models/chat/comment');
const User = require("./models/user");
const Order = require('./models/cafe/order');
const Item = require('./models/cafe/orderItem');
const Cafe = require('./models/cafe/cafe');

// require the routes
const indexRoutes = require('./routes/index');
const chatRoutes = require('./routes/chat');
const profileRoutes = require('./routes/profile');
const inboxRoutes = require('./routes/inbox');
const adminRoutes = require('./routes/admin');
const cafeRoutes = require('./routes/cafe');
const announcementRoutes = require('./routes/announcements');
const projectRoutes = require('./routes/projects');
const wHeightsRoutes = require('./routes/wHeights');
const hwRoutes = require('./routes/homework');
const reportRoutes = require('./routes/reports');

// set up ports and socket.io
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

//Set up platform
const platformInfo = require(__dirname + "/platform-data");
const platform = platformInfo[process.env.PLATFORM];

// connect to db.
mongoose.connect(`mongodb+srv://admin_1:${process.env.DATABASE_PASSWORD}@cluster0-cpycz.mongodb.net/${platform.dbname}?retryWrites=true&w=majority`,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false
    });

// APP CONFIGURATION
app.use(favicon(__dirname + '/public/images/favicon.ico')); // use favicon
app.use(express.static(__dirname + "/public")); // make public dir accessible in all views
app.use('/editor', express.static(__dirname + "/node_modules/@editorjs")); // try serving editorjs package to frontend
app.use(bodyParser.urlencoded({extended: true})); // use body parser
app.set("view engine", "ejs"); // set view engine to ejs
app.use(methodOverride('_method')); // Allows for forms to use PUT and DELETE requests
app.use(flash()); // use connect-flash for flash messages
app.use(mongoSanitize({replaceWith: '_'})); // replaces $ and .  with _ in req.body, req.query, or req.params
app.use(helmet()); // Helmet security headers

app.use(helmet.contentSecurityPolicy({ // customizations for helmet content security policy
    directives: {
        defaultSrc: [],
        connectSrc: ["'self'", "https://ka-f.fontawesome.com/", "https://res.cloudinary.com"],
        scriptSrc: ["'unsafe-inline'", "'self'", ...scriptUrls],
        styleSrc: ["'self'", "'unsafe-inline'", ...styleUrls],
        mediaSrc: ["'self'", "https://res.cloudinary.com"],
        workerSrc: ["'self'", "blob:"],
        objectSrc: [],
        imgSrc: ["'self'", "https:", "blob:", "data:"],
        fontSrc: ["'self'", "https://ka-f.fontawesome.com/"]
    }
}));

app.use(helmet.referrerPolicy({ // customizations for helmet referrer policy
    policy: "same-origin"
}));

const session = require('express-session'); // Sets up express session for authorization
const MemoryStore = require('memorystore')(session); // Memorystore package (express-session has memory leaks, bad for production)
const sessionConfig = {
    name: 'app-ses',
    cookie: {
        httpOnly: true,
        maxAge: 86400000
    },
    store: new MemoryStore({
        checkPeriod: 86400000 //prune expired entries every 24hrs
    }),
    secret: "Programming For Alsion is Cool",
    resave: false,
    saveUninitialized: false
};

if (process.env.NODE_ENV === 'production') {
    // allows cookies to only be accessed over https
    // this wouldn't allow authentication for local dev since local host is http
    sessionConfig.cookie.secure = false;
}

app.use(session(sessionConfig));
app.use(passport.initialize()); // passport required authorization setup that I also know nothing about.
app.use(passport.session());
passport.use(User.createStrategy()); // Sets strategy used. FOR NOW: email and pwd. LATER: Google, FB, Twitter logins
passport.serializeUser(User.serializeUser()); // prepares the user schema for authorization
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => { // setting app locals, which can be accessed in all ejs views
    res.locals.currentUser = req.user; // puts user info into 'currentUser' variable
    // flash message stuff
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
});

// Import Routes
app.use(indexRoutes);
app.use('/chat', chatRoutes);
app.use('/profiles', profileRoutes);
app.use('/inbox', inboxRoutes);
app.use('/announcements', announcementRoutes);
app.use('/admin', adminRoutes);
app.use('/cafe', cafeRoutes);
app.use('/projects', projectRoutes);
// app.use('/articles', wHeightsRoutes);
app.use('/homework', hwRoutes);
app.use('/reports', reportRoutes);

// Catch-all route.
app.get('*', (req, res) => {
    res.redirect('/');
});

// list of responses to bad words
const curseResponse = [
    "Please Don't curse. Let's keep things family-friendly.",
    "Give the word filter a break! Don't curse.",
    "Not cool. Very not cool.",
    "Come on. Be friendly."
];

// gets random item in array
const getRandMessage = (list => {
    return list[Math.floor(Math.random() * list.length)];
})

// deletes all comments at midnight

// const manageComments = schedule.scheduleJob('0 0 0 * * *', () => {
// 	Comment.find({}, (err, comments) => {
// 		if(err) {
// 			console.log(err);
// 		} else {
// 			comments.map((comment) => {
// 				if(true) {
// 					comment.remove();
// 					console.log('removed comments');
// 				}
// 			});
// 		}
// 	});
// });

// Update all students' statuses on July 1st at midnight, if requested
if (platform.updateTime) {
	schedule.scheduleJob(platform.updateTime, async() => {
		const statuses = platform.studentStatuses.concat(platform.formerStudentStatus);
	
		const users = await User.find({authenticated: true, status: {$in: platform.studentStatuses}});
		if (!users) { return console.log(err);}
		
		for (let user of users) {
			user.status = statuses[statuses.indexOf(user.status)+1];
			await user.save();
		}
	});	
}

// Socket.io server-side code
io.on('connect', (socket) => {
    // console.log("A user connected".cyan);
    // socket.on('disconnect', () => {
    // console.log("A user disconnected".cyan);

    // When 'switch room' event is detected, leave old room and join 'newroom';
    socket.on('switch room', (newroom) => {
        socket.leave(socket.room);
        socket.join(newroom);
        socket.room = newroom;
    });

    // When 'chat message' event is detected, emit msg to all clients in room
    socket.on('chat message', (msg) => {
        let profanity;
        // clean the message
        if (msg.text != filter.clean(msg.text)) {
            msg.text = filter.clean(msg.text);
            profanity = true;
        }
        // create/save comment to db
        Comment.create({
            text: msg.text,
            room: socket.room,
            author: msg.authorId
        }, (err, comment) => {
            if (err) {
                // sends error msg if comment could not be created
                console.log(err);
            } else {
                // set msg id
                msg.id = comment._id;
                // broadcast message to all connected users in the room
                socket.to(socket.room).emit('chat message', msg);
                // format the date in the form we want.
                comment.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
                // saves changes
                comment.save();
                // checks if bad language was used
                if (profanity) {
                    // console.log('detected bad words'.green);
                    let notif = {
                        text: getRandMessage(curseResponse),
                        status: 'notif'
                    };
                    // send announcement to all
                    io.in(socket.room).emit('announcement', notif);
                    // create announcement in db
                    Comment.create({
                        text: notif,
                        room: socket.room,
                        status: notif.status
                    }, (err, comment) => {
                        if (err) {
                            console.log(err);
                        } else {
                            comment.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
                            comment.save();
                        }
                    });
                }
            }
        });
    });

    socket.on('order', async(itemList, itemCount, instructions, payingInPerson, customerId) => { //If an order is sent, handle it here (determined from cafe-socket frontend)
        try {
            const cafe = await Cafe.findOne({}); //Collect data on cafe to figure out whether it's open or not
            if (!cafe) {
                return console.log('error accessing cafe');
            }

            if (cafe.open) { //If the cafe is open, run everything else. Otherwise, nothing matters since orders aren't being accepted
                const user = await User.findById(customerId);
                if (!user) {
                    return console.log('error accessing user');
                }

                const activeOrders = await Order.find({name: `${user.firstName} ${user.lastName}`, present: true}); //Access user's current orders (so we can see if they've passed the order limit)
                if (!activeOrders) {
                    return console.log('error accessing orders');
                }

                if (activeOrders.length >= 3) { //If you have made three or more orders that are still active (have not been delivered), then you cannot make anymore
                    return console.log("Max orders made");
                }

                const orderItems = await Item.find({_id: {$in: itemList}}); //Find all items that are part of the user's order (itemList was generated in cafe-socket FE)
                if (!orderItems) {
                    return console.log('error accessing order items');
                }

                let unavailable = false; //This variable will track if any items are unavailable in the requested quantities

                for (let i = 0; i < orderItems.length; i++) { //Iterate over each item and check if any are unavailable
                    if (orderItems[i].availableItems < parseInt(itemCount[i])) { //If order asks for more of this item than is available, unavailable is now true, and the checking stops immediately
                        unavailable = true;
                        break;
                    }
                }

                if (unavailable) { //An unlikely scenario. Another user places an order that results in there being less available items than the number that our user has ordered.
                    return console.log('some items unavailable');
                }

                let orderItemsObjects = [];
                for (let i = 0; i < itemList.length; i += 1) {
                    orderItemsObjects.push(
                        {
                            item: itemList[i],
                            quantity: parseInt(itemCount[i]),
                            price: 0
                        }
                    );
                }

                let orderInstructions = "";
                if (instructions == "") {
                    orderInstructions = "None";

                } else {
                    orderInstructions = instructions;
                }

                let order = await Order.create({
                    customer: customerId,
                    name: `${user.firstName} ${user.lastName}`,
                    present: true,
                    charge: 0,
                    instructions: orderInstructions,
                    payingInPerson: payingInPerson
                });
                if (!order) {
                    return console.log('error creating order');
                }

                order.date = dateFormat(order.created_at, "mmm d, h:MM TT");
                let charge = 0;
                let itemProfile;

                for (let i = 0; i < orderItemsObjects.length; i++) { //items[] contains info about individual items (and their prices); itemCount[] says how much of each item is ordered. Multiplication will calculate how much to charge for an item
                    itemProfile = await Item.findById(orderItemsObjects[i].item);
                    if (!itemProfile) {
                        return console.log('error accessing item');
                    }

                    charge += (itemProfile.price * orderItemsObjects[i].quantity);
                    orderItemsObjects[i].price = itemProfile.price;
                }

                order.charge = charge; //Set order cost based on the items ordered
                order.items = orderItemsObjects;
                await order.save();

                if (order.charge > user.balance && !payingInPerson) { //If charge is over online balance, and user is paying online
                    const deletedOrder = await Order.findByIdAndDelete(order._id);

                    if (!deletedOrder) {
                        return console.log('Error deleting order');
                    }
                }

                const displayItems = await Item.find({_id: {$in: itemList}}); //Full versions of the _id signatures sent in order.items
                if (!displayItems) {
                    return console.log('Error accessing display items');
                }
                return io.emit('order', order, displayItems); //Send order to cafe admins via socket
            }

        } catch(err) { //Execute and catch any error
            console.log(err);
        }
    });
});

// -----------------------
// Start server
http.listen(port, process.env.IP, () => {
    console.log(":: App listening on port " + port + " ::");
});
