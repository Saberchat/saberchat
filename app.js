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
// scheduler test
const schedule = require('node-schedule');
// require the models for database actions
const Comment = require('./models/comment');
const User = require("./models/user");
//require the routes
const indexRoutes = require('./routes/index');
const chatRoutes = require('./routes/chat');
const profileRoutes = require('./routes/profile');
//set up ports and socket.io
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

//connect to db. We should set the link as environment variable for security purposes in the future.
//mongodb+srv://<username>:<password>@cluster0-cpycz.mongodb.net/saberChat?retryWrites=true&w=majority
mongoose.connect("mongodb+srv://admin_1:alsion2020@cluster0-cpycz.mongodb.net/saberDemo?retryWrites=true&w=majority", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});

// ============================
// app configuration
// ============================

// make public dir accessible in all views
app.use(express.static(__dirname + "/public"));
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
	secret: "Programming For Alsion is Cool"
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
	// profanity filter
	// this won't work - alex
	// res.locals.filter = filter;
	next()
});

// =======================
// Routes
// =======================
//tell the app to use the required/imported routes.
app.use(indexRoutes);
app.use(chatRoutes);
app.use(profileRoutes);

// Catch-all route
app.get('*', function(req, res) {
	req.flash('error', 'Url does not exist');
	res.redirect('/');
});

// list of responses to bad words
const curseResponse = [
	'Cursing is a poor excuse for intelligence.',
	"Please Don't curse. Let's keep things family-friendly.",
	"Give the word filter a break! Don't curse.",
	"Not cool. Very not cool.",
	"Come on. Be friendly."
]

// gets random item in array
function getRandMessage(list) {
	return list[Math.floor(Math.random() * list.length)]
}

var manageComments = schedule.scheduleJob('30 17 * * *', function() {
	console.log('schedule fired');
	Comment.find({}, function(err, foundComments) {
		if(err) {
			console.log(err);
		} else {
			foundComments.map((comment) => {
				if(true) {
					comment.remove();
				}
			});
			console.log('removed comments');
		}
	});
});
console.log('set scheduler');

// Socket.io server-side code
io.on('connect', (socket) => {
//   console.log("A user connected".cyan);
//   socket.on('disconnect', () => {
// 		console.log("A user disconnected".cyan);
// 	});
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
		// broadcast message to all connected users in the room
		socket.to(socket.room).emit('chat message', msg);
    // Log information
    // console.log("Room: ".cyan);
    // console.log(socket.room);
		// console.log("Message: ".cyan);
    // console.log(msg);

		// create/save comment to db
		Comment.create({text: msg.text, room: socket.room, author: msg.authorId}, function(err, comment) {
			if(err) {
				// sends error msg if comment could not be created
				console.log(err);
				req.flash('error', 'message could not be created');
			} else {
				let now = new Date();
				// format the date in the form we want.
				comment.date = dateFormat(now, "h:MM TT | mmm d");
				// saves changes
				comment.save();
        // confirmation log
				// console.log('Database Comment created: '.cyan);
				// console.log(comment);
			}
		});
		// send warning message
		if(profanity) {
			// console.log('detected bad words'.green);
			let notif = {text: getRandMessage(curseResponse), type:'notif'};
			// send announcement to all
			io.in(socket.room).emit('announcement', notif);
			// create announcement in db
			Comment.create({text: notif.text, room: socket.room, type:'notif'}, function(err, comment) {
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
	});
});

// -----------------------
// Start server
http.listen(process.env.PORT,process.env.IP, () => {
	console.log(":: App listening on port " + port + " ::");
});
