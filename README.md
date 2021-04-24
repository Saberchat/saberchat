# Saberchat

PLATFORM LINKS
-----------------------------------------
- https://saberchat.net/
- https://idot.saberchat.net/
- https://aapa.saberchat.net/

TABLE OF DIRECTORY CONTENTS
-----------------------------------------
- App: Website's main file, implements all routes and libraries
- Controllers: Server logic files that are used in the callbacks of routes\
- JoiValidation: schema for form validation\
- Middleware: express middleware for permissions, uploads and form validation\
- Models: Mongoose DB models for collection schema\
- Procfile: Tells Heroku what command to call on app start (No longer in usage)\
- Public: Contains All Front-End CSS, JS and Static Display Images\
- Routes: Server routes, accessed in app.js\
- Services: Configurations for libraries and APIs such as image uploads and email sending\
- Utils: Functions used platform-wide in both controllers and EJS logic\
- Views: EJS files of front end code for all pages\


NPM LIBRARIES
===================================

- Axios: Facilitates JSON requests and responses. Saberchat currently uses it for email sending with SendGrid
- Bad-Words: Filters and censors any explicit text
- Body-Parser: Parses headers and data from HTML form bodies
- Cloudinary: Online platform which stores our uploaded media. Saberchat connects to it via an API and uploads images that are processed with Multer
- Connect-Flash: Flashes success and error messages on screen
- DataURI: Converts media uploads into buffers in preparation for Multer processing
- DateFormat: Provides an easy way to format and display dates and times
- Dotenv: Allows server to access environmental variables, the contents of the .env
- EditorJS: Text and content formatting, used for articles
- EJS: View engine that is used for all front-end files. Combines JavaScript logic with HTML markup to build platform based on data sent from the server
- Express: Node.js framework that is used for all routes and request-response systems. The backbone of our server
- Express-Mongo-Sanitize: Handles and sanitizes user data from server to MongoDB database
- Express-Session: Platform for cookie storage and security
- Fillers: Stores all filler words, used to build the Keyword Filter
- Helmet: Used for security purposes, to moderate valid data sources for different media and content formats
- Joi: Form validation package. Develops schema that are used to validate form data with the Sanitize-HTML package
- MemoryStore: Stores records of express sessions
- Method-Override: Allows forms to send PUT and DELETE requests
- Mongoose: Connects server to MongoDB database
- Multer: Processes uploaded media from files to a format that can be uploaded and stored in cloudinary
- Nodemon: Used by developers to automatically restart server when any backend code is updated
- Node-Schedule: Used to schedule certain tasks that the server performs without user involvement
- Passport: Used to authenticate users for logging in and registering accounts
- Passport-Local-Mongoose: Used to combine user data with passport authentication to log in users
- Passport.Socketio: Validating user information for real-time actions with socket.io
- Sanitize-HTML: Used in conjunction with Joi schema to validate form data
- Serve-Favicon: Used to send favicons from backend storage to EJS pages
- Socket.io: Module for real-time activity including shop orders and chat messages
