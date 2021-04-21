// Set up ENV vars if in local developmeent
if (process.env.NODE_ENV !== "production") {require('dotenv').config();}

//NODE.JS MODULES
//set up and start the express server
const express = require('express');
// mongoose allows us to communicate with mongodb seamlessly through js
const mongoose = require('mongoose');
// passport.js is an authentication middleware module
const passport = require('passport');
// flash messages on screen i.e "logged in successfully!"
const flash = require('connect-flash');
// middleware; parses incoming data from client under req.body
const bodyParser = require('body-parser');
// allow us to use other methods besides post and get
const methodOverride = require('method-override');
// Sets HTTP headers for security
const helmet = require('helmet');
// prevents MongoDB Operator Injection
const mongoSanitize = require('express-mongo-sanitize');
// Sets up express session for authorization
const session = require('express-session');
// add favicon
const favicon = require('serve-favicon');
//Source URLs for data security
const {scriptUrls, styleUrls} = require('./srcUrls');
//Platform data
const setup = require("./utils/setup");
//Async wrapper
const wrapAsync = require("./utils/wrapAsync");
//Callbacks for chat room socket functions
const chatSocket = require("./socket/chat");
//Callbacks for cafe socket functions
const cafeSocket = require("./socket/cafe");
//Callbacks for nodeSchedule functions
const profileSchedule = require("./schedule/profiles");
//Scheduler for schedule jobs
const schedule = require('node-schedule');

// SCHEMA
const Platform = require('./models/platform');
const User = require("./models/user");

// connect to db.
mongoose.connect(process.env.DATABASE_URL,
{
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});

const appSetup = async function() {
    const app = await express();
    // set up ports and socket.io
    const http = await require('http').createServer(app);
    const io = await require('socket.io')(http);
    const port = process.env.PORT || 3000;

    // APP CONFIGURATION
    await app.use(favicon(__dirname + '/public/images/favicon.ico')); // use favicon
    await app.use(express.static(__dirname + "/public")); // make public dir accessible in all views
    await app.use('/editor', express.static(__dirname + "/node_modules/@editorjs")); // try serving editorjs package to frontend
    await app.use(bodyParser.urlencoded({extended: true})); // use body parser
    await app.set("view engine", "ejs"); // set view engine to ejs
    await app.use(methodOverride('_method')); // Allows for forms to use PUT and DELETE requests
    await app.use(flash()); // use connect-flash for flash messages
    await app.use(mongoSanitize({replaceWith: '_'})); // replaces $ and .  with _ in req.body, req.query, or req.params
    await app.use(helmet()); // Helmet security headers

    await app.use(helmet.contentSecurityPolicy({ // customizations for helmet content security policy
        directives: {
            defaultSrc: ["https://docs.google.com", "https://res.cloudinary.com"],
            connectSrc: ["'self'", "https://ka-f.fontawesome.com/", "https://res.cloudinary.com", "https://www.googletagmanager.com", "https://www.google-analytics.com"],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleUrls],
            mediaSrc: ["'self'", "https://res.cloudinary.com"],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: ["'self'", "https:", "blob:", "data:"],
            fontSrc: ["'self'", "https://ka-f.fontawesome.com/", "https://fonts.gstatic.com/"]
        }
    }));

    await app.use(helmet.referrerPolicy({policy: "same-origin"})); // customizations for helmet referrer policy

    const MemoryStore = await require('memorystore')(session); // Memorystore package (express-session has memory leaks, bad for production)
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
        sessionConfig.cookie.secure = false; // allows cookies to only be accessed over https; this wouldn't allow authentication for local dev since local host is http
    }

    await app.use(session(sessionConfig));
    await app.use(passport.initialize()); // passport required authorization setup that I also know nothing about.
    await app.use(passport.session());
    await passport.use(User.createStrategy()); // Sets strategy used. FOR NOW: email and pwd. LATER: Google, FB, Twitter logins
    await passport.serializeUser(User.serializeUser()); // prepares the user schema for authorization
    await passport.deserializeUser(User.deserializeUser());

    await app.use((req, res, next) => { // setting app locals, which can be accessed in all ejs views
        res.locals.currentUser = req.user; // puts user info into 'currentUser' variable
        res.locals.error = req.flash('error');
        res.locals.success = req.flash('success');
        return next();
    });

    const platform = await setup(Platform); //Set up Platform
    if (!platform) {return console.log("Platform cannot be found");}
    const generalRoutes = ["chat", "profiles", "inbox", "announcements", "admin", "projects", "reports"];
    
    // Import And Use Routes From Routes Directory
    const indexRoutes = await require("./routes/index"); //Index Routes, with no prefix
    await app.use(indexRoutes);
    for (let route of generalRoutes) { await app.use(`/${route}`, require(`./routes/${route}`));} //General Routes for all platforms
    for (let feature of platform.features) { //Platform-Specific Routes (For features in their own route directories)
        if (!feature.route.includes('/')) { await app.use(`/${feature.route}`, require(`./routes/${feature.route}`));}
    }
    app.get('*', (req, res) => { return res.redirect('/');}); // Catch-all route

    //NodeSchedule code for any scheduled jobs, with attached callbacks
    await schedule.scheduleJob(`0 0 0 ${platform.updateTime.split(' ')[0]} ${platform.updateTime.split(' ')[1]} *`, wrapAsync(profileSchedule.updateStatuses));

    // Socket.io server-side code (in route structure, connecting to socket controllers)
    await io.on('connect', socket => {
        socket.on('switch room', newroom => {chatSocket.switchRoom(io, socket, newroom);});
        socket.on('chat message', async(msg) => {wrapAsync(chatSocket.chatMessage(io, socket, msg));});
        socket.on('order', async(itemList, itemCount, instructions, payingInPerson, customerId) => {wrapAsync(cafeSocket.order(io, socket, itemList, itemCount, instructions, payingInPerson, customerId));});
    });

    // Start server
    const running = await http.listen(port, process.env.IP);
    if (running) { await console.log(":: App listening on port " + port + " ::");}
 
}().catch(err => { console.log(err);}) 