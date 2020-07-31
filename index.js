const express = require('express'),
 	  app = express(),
	  mongoose = require('mongoose'),
	  passport = require('passport'),
	  bodyParser = require('body-parser'),
	  LocalStrategy = require('passport-local');

const Comment = require('./models/comment'),
	  User = require("./models/user");

const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;


//mongodb+srv://<username>:<password>@cluster0-cpycz.mongodb.net/saberChat?retryWrites=true&w=majority
mongoose.connect("mongodb+srv://admin_1:alsion2020@cluster0-cpycz.mongodb.net/saberChat?retryWrites=true&w=majority", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

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

app.use(function(req, res, next) {
	res.locals.currentUser = req.user;
	next()
});

app.get('/', (req, res) => {
	res.render('index');
});

app.get('/chat', (req, res) => {
	Comment.find({}, function(err, foundComments){
		if(err){
			console.log(err)
		} else {
			// console.log(foundComments)
			if(!foundComments){
				console.log('no found comments!')
			}
			comments = foundComments
			res.render('chat', {comments: comments, user: JSON.stringify(req.user.username)});
		}
	});
});

// ===========================
// User Routes
// ===========================
app.post("/register",  function(req, res) {
	console.log(req.body)
	var newUser = new User({email: req.body.email, username: req.body.username});
	User.register(newUser, req.body.password, function(err, user) {
		if(err) {
			// req.flash("error", err.message);
			console.log(err);
			return res.redirect("/");
		}
		passport.authenticate("local")(req, res, function() {
			// req.flash("success", "Welcome to Yelp Camp " + user.username);
			res.redirect("/chat");
			console.log('succesfully registered and logged in user')
		});
	});
});

app.post("/login", passport.authenticate("local", {
	successRedirect: "/chat",
	failureRedirect: "/"
}), function(req, res) {
});

app.get("/logout", function(req, res) {
	req.logout();
	// req.flash("success", "Logged you out!");
	res.redirect("/");
});

io.on('connection', (socket) => {
	console.log("A user connected");
	socket.on('disconnect', () => {
		console.log("A user disconnected");
	});
	socket.on('chat message', (msg) => {
		io.emit('chat message', msg);
		console.log(msg);

		// Leave commented until you need to actually create comments. prevent useless comments from flooding DB
		
		// Comment.create({text: msg}, function(err, comment) {
		// 	if(err) {
		// 		console.log(err);
		// 	} else {
		// 		console.log('comment created: '+ comment)
		// 	}
		// });
	});
});

http.listen(port, () => {
	console.log(":: App listening on port " + port + " ::");
});