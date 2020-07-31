const express = require('express'),
 	  app = express(),
	  mongoose = require('mongoose'),
	  passport = require('passport'),
	  bodyParser = require('body-parser'),
	  LocalStrategy = require('passport-local'),
	  flash = require('connect-flash');

// require the models
const Comment = require('./models/comment'),
	  User = require("./models/user");

//require the routes
const indexRoutes = require('./routes/index'),
	  chatRoutes = require('./routes/chat');

const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

//connect to db
//mongodb+srv://<username>:<password>@cluster0-cpycz.mongodb.net/saberChat?retryWrites=true&w=majority
mongoose.connect("mongodb+srv://admin_1:alsion2020@cluster0-cpycz.mongodb.net/saberChat?retryWrites=true&w=majority", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});

// configure app
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(flash());

// authorization stuff
app.use(require("express-session")({
	secret: "Programming For Alsion Is Cool",
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// setting app locals
app.use(function(req, res, next) {
	res.locals.currentUser = req.user;
	res.locals.error = req.flash('error');
	res.locals.success = req.flash('success');
	next()
});


// =======================
// Routes
// =======================
app.use(indexRoutes);
app.use(chatRoutes);

// =======================
// Socket Chat stuff
// =======================
io.on('connection', (socket) => {
	console.log("A user connected");
	socket.on('disconnect', () => {
		console.log("A user disconnected");
	});
	socket.on('chat message', (msg) => {
		io.emit('chat message', msg);
		console.log(msg);
		Comment.create({text: msg.text}, function(err, comment) {
			if(err) {
				console.log(err);
				req.flash('error', 'message could not be created');
			} else {
				comment.author.username = msg.author;
				comment.author.id = msg.authorId;
				comment.save();
				console.log('comment created: '+ comment)
			}
		});	
	});
});

http.listen(port, () => {
	console.log(":: App listening on port " + port + " ::");
});