// set up env vars if in local developmeent
if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

//NODE.JS MODULES
//set up and start the express server
const express = require('express');
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
const chat = require("./socket/chat");
//Callbacks for cafe socket functions
const cafe = require("./socket/cafe");
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
    const app = express();
    // set up ports and socket.io
    const http = require('http').createServer(app);
    const io = require('socket.io')(http);
    const port = process.env.PORT || 3000;

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

    app.use(helmet.referrerPolicy({policy: "same-origin"})); // customizations for helmet referrer policy

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
        res.locals.error = req.flash('error');
        res.locals.success = req.flash('success');
        next();
    });

    // Import Routes
    const platform = await setup(Platform); //Set up Platform
     
    //Index Routes, with no prefix
    const indexRoutes = require("./routes/index");
    app.use(indexRoutes);

    for (let route of ["chat", "profiles", "inbox", "announcements", "admin", "projects", "reports"]) { //General Routes
        app.use(`/${route}`, require(`./routes/${route}`));
    }

    for (let feature of platform.features) { //Platform-Specific Routes
        if (!feature.route.includes('/')) { //If feature is its own route directory
            app.use(`/${feature.route}`, require(`./routes/${feature.route}`));
        }
    }

    app.get('*', (req, res) => { res.redirect('/');}); // Catch-all route.

    // list of responses to bad words
    const curseResponse = [
        "Please Don't curse. Let's keep things family-friendly.",
        "Give the word filter a break! Don't curse.",
        "Not cool. Very not cool.",
        "Come on. Be friendly."
    ];

    // gets random item in array
    const getRandMessage = (list => {return list[Math.floor(Math.random() * list.length)];})

    // deletes all comments at midnight
    // await schedule.scheduleJob('0 0 0 * * *', async() => {
    //     const comments = await ChatMessage.find({});
    //     if(!comments) { return console.log(err);}
    //     comments.map((comment) => { if(true) {comment.remove();}});
    // });

    // Update all students' statuses on update date, if required
    if (platform.updateTime.split(' ')[0] != "0" && platform.updateTime.split(' ')[1] != "0") { //If there is an update time
        await schedule.scheduleJob(`0 0 0 ${platform.updateTime.split(' ')[0]} ${platform.updateTime.split(' ')[1]} *`, async() => {
            const statuses = platform.studentStatuses.concat(platform.formerStudentStatus);
            const users = await User.find({authenticated: true, status: {$in: platform.studentStatuses}});
            if (!users) { return console.log(err);}
            for (let user of users) {
                user.status = statuses[statuses.indexOf(user.status)+1];
                await user.save();
            }
        });
    }

    // Socket.io server-side code (in route structure, connecting to socket controllers)
    //TODO: Try to turn functions into callbacks
    io.on('connect', socket => {
        socket.on('switch room', newroom => {
            chat.switchRoom(io, socket, newroom);
        });
        socket.on('chat message', async(msg) => {
            await chat.chatMessage(io, socket, msg).catch(err => { return console.log(err);});
        });
        socket.on('order', async(itemList, itemCount, instructions, payingInPerson, customerId) => {
            await cafe.order(io, socket, itemList, itemCount, instructions, payingInPerson, customerId).catch(err => { return console.log(err);});
        });
    });

    // Start server
    http.listen(port, process.env.IP, () => {
        console.log(":: App listening on port " + port + " ::");
    });
    
}().catch(err => {
    console.log(err);
})