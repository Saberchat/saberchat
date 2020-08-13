// Require NodeJS modules
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const passport = require('passport');
const bodyParser = require('body-parser');
const LocalStrategy = require('passport-local');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const colors = require('colors');

// require the models for database actions
const Comment = require('./models/comment');
const User = require("./models/user");

//require the routes
const indexRoutes = require('./routes/index');
const chatRoutes = require('./routes/chat');
const profileRoutes = require('./routes/profile');

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
app.use(bodyParser.urlencoded({extended: true}));
//set view engine to ejs
app.set("view engine", "ejs");
// I think yall already know what method override is
app.use(methodOverride('_method'));
// use connect-flash for flash messages
app.use(flash());

// express session stuff for authorization that I know nothing about
app.use(require("express-session")({
	// I think secret is what's used to encrypt the information
	secret: "Programming For Alsion Is Cool",
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
	next()
});

// =======================
// Routes
// =======================
//tell the app to use the required/imported routes.
app.use(indexRoutes);
app.use(chatRoutes);
app.use(profileRoutes);

// Socket.io server-side code
io.on('connect', (socket) => {
  console.log("A user connected");
  socket.on('disconnect', () => {
		console.log("A user disconnected");
	});

  socket.on('switch room', (newroom) => {
    socket.leave(socket.room);
    socket.join(newroom);
    socket.room = newroom;
  });

	socket.on('chat message', (msg) => {
		// broadcast message to all connected users in the room
		io.sockets.in(socket.room).emit('chat message', msg);

    // Log information
    console.log("Room: ".cyan);
    console.log(socket.room);
		console.log("Message: ".cyan);
    console.log(msg);

		// create/save comment to db
		Comment.create({text: msg.text}, function(err, comment) {
			if(err) {
				// sends error msg if comment could not be created
				console.log(err);
				req.flash('error', 'message could not be created');
			} else {
				// sets comment's author info from the received message object
				comment.author.username = msg.author;
				comment.author.id = msg.authorId;
				// saves changes
				comment.save();
        // confirmation log
				console.log('Database Comment created: '.magenta);
        console.log(comment);
			}
		});
	});
});

// -----------------------
// Start server
http.listen(port, () => {
	console.log(":: App listening on port " + port + " ::");
});
