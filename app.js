// Require NodeJS modules
//set up and start the express server
const express = require('express');
const app = express();
//mongoose allows us to communicate with mongodb seamlessly through js
const mongoose = require('mongoose');
//passport.js is an authentication middleware module
const passport = require('passport');
const LocalStrategy = require('passport-local');
//flash messages on screen i.e "logged in successfully!"
const flash = require('connect-flash');
//middleware; parses incoming data from client under req.body
const bodyParser = require('body-parser');
//allow us to use PUT and DELETE methods
const methodOverride = require('method-override');
// package for formating dates on the serverside
const dateFormat = require('dateformat');
//pretty up the console
const colors = require('colors');

//profanity filter
const Filter = require('bad-words');
const filter = new Filter();

// require scheduler
const schedule = require('node-schedule');

// require the models for database actions
const Comment = require('./models/comment');
const User = require("./models/user");

//require the routes
const indexRoutes = require('./routes/index');
const chatRoutes = require('./routes/chat');
const profileRoutes = require('./routes/profile');
const wHeightsRoutes = require('./routes/wHeights');
const inboxRoutes = require('./routes/inbox');
const adminRoutes = require('./routes/admin');
const announcementRoutes = require('./routes/announcements');

//set up ports and socket.io
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

//connect to db. We should set the link as environment variable for security purposes in the future.
//mongodb+srv://<username>:<password>@cluster0-cpycz.mongodb.net/saberChat?retryWrites=true&w=majority
mongoose.connect("mongodb+srv://admin_1:alsion2020@cluster0-cpycz.mongodb.net/saberChat?retryWrites=true&w=majority", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});

// ============================
// app configuration
// ============================

// make public dir accessible in all views
app.use(express.static(__dirname + "/public"));
// try serving editorjs package to frontend
app.use('/editor', express.static(__dirname + "/node_modules/@editorjs"));
// use body parser
app.use(bodyParser.urlencoded({extended: true}));
//set view engine to ejs
app.set("view engine", "ejs");
// I think yall already know what method override is
app.use(methodOverride('_method'));
// use connect-flash for flash messages
app.use(flash());

// express session stuff for authorization that I know nothing about
var session = require('express-session');
// using memorystore package because express-session leads to memory leaks and isnt optimized for production.
var MemoryStore = require('memorystore')(session);
// app.use(require("express-session")({
// 	// I think secret is what's used to encrypt the information
// 	secret: "Programming For Alsion Is Cool",
// 	resave: false,
// 	saveUninitialized: false
// }));
app.use(session({
	cookie: {maxAge: 86400000},
	store: new MemoryStore({
		checkPeriod: 86400000 //prune expired entries every 24hrs
	}),
	secret: "Programming For Alsion is Cool",
	resave: false,
	saveUninitialized: false
}));

// passport required authorization setup that I also know nothing about.
app.use(passport.initialize());
app.use(passport.session());
// sets strategy used. We can add login via google, facebook, twitter, etc. if we want. For now email and pswrd.
passport.use(User.createStrategy());
// prepares the user schema for authorization
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// setting app locals, which can be accessed in all ejs views
app.use(function(req, res, next) {
	// puts user info into 'currentUser' variable
	res.locals.currentUser = req.user;
	// flash message stuff
	res.locals.error = req.flash('error');
	res.locals.success = req.flash('success');
	next();
});



// =======================
// Routes
// =======================
//tell the app to use the required/imported routes.
app.use(indexRoutes);
app.use('/chat', chatRoutes);
app.use('/profiles', profileRoutes);
app.use('/articles', wHeightsRoutes);
app.use(inboxRoutes);
app.use(announcementRoutes);
app.use('/admin', adminRoutes);

// Catch-all route
app.get('*', function(req, res) {
	res.redirect('/');
});

// list of responses to bad words
const curseResponse = [
	"Please Don't curse. Let's keep things family-friendly.",
	"Give the word filter a break! Don't curse.",
	"Not cool. Very not cool.",
	"Come on. Be friendly."
]

// gets random item in array
function getRandMessage(list) {
	return list[Math.floor(Math.random() * list.length)]
}

// deletes all comments at midnight

// var manageComments = schedule.scheduleJob('0 0 * * *', function() {
// 	Comment.find({}, function(err, foundComments) {
// 		if(err) {
// 			console.log(err);
// 		} else {
// 			foundComments.map((comment) => {
// 				if(true) {
// 					comment.remove();
// 					console.log('removed comments');
// 				}
// 			});
// 		}
// 	});
// });

// Socket.io server-side code
io.on('connect', (socket) => {
//   console.log("A user connected".cyan);
//   socket.on('disconnect', () => {
// 		console.log("A user disconnected".cyan);
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
		if(msg.text != filter.clean(msg.text)){
			msg.text = filter.clean(msg.text);
			profanity = true;
		}
		// create/save comment to db
		Comment.create({text: msg.text, room: socket.room, author: msg.authorId}, function(err, comment) {
			if(err) {
				// sends error msg if comment could not be created
				console.log(err);
				req.flash('error', 'message could not be created');
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
				if(profanity) {
					// console.log('detected bad words'.green);
					let notif = {text: getRandMessage(curseResponse), status: 'notif'};
					// send announcement to all
					io.in(socket.room).emit('announcement', notif);
					// create announcement in db
					Comment.create({text: notif, room: socket.room, status: notif.status}, function(err, comment) {
						if(err) {
							// sends error msg if comment could not be created
							console.log(err);
						} else {
							// format the date in the form we want
							comment.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
							// saves changes
							comment.save();
					// confirmation log
							// console.log('Database Comment created: '.cyan);
							// console.log(comment);
						}
					});
				}
		// confirmation log
				// console.log('Database Comment created: '.cyan);
				// console.log(comment);
			}
		});
	});
});

// -----------------------
// Start server
http.listen(port,process.env.IP, () => {
	console.log(":: App listening on port " + port + " ::");
});
