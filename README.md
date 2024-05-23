# Saberchat

A platform targeted towards centralizing communities and their networks and facilitate engagement. Saberchat allows users to quickly share and access important information, and presents multiple features for community organizations. Targeted towards schools, clubs and student-run programs and is currently servicing such groups throughout the Bay Area while also used to help schools for underprivileged students in India.

### Platform Links
1) https://saberchat.net/
2) https://idot.saberchat.net/
3) https://aapa.saberchat.net/

The above links been temporarily disbaneded as we are no longer servicing the above domains.

View a detailed overview of the platform, codebase and tech used, as well as an in-depth tutorial of the MEAN Stack on our [site documentation](https://docs.google.com/document/d/1EYrg0uwGUwl5xgEbyJXWbSMgdxHzTvRN1VV6FWYGFqE/edit?usp=sharing)!

**Version History**: [Linked here]([url](https://drive.google.com/file/d/1d9iEajFV2JQCogyUn6pm1u9-s3xXZ1Lo/view?usp=sharing))

### Contents
1) App: Website's main file, implements all routes and libraries
2) Controllers: Server logic files that are used in the callbacks of routes
3) JoiValidation: schema for form validation
4) Middleware: express middleware for permissions, uploads and form validation
5) Models: Mongoose DB models for collection schema
6) Procfile: Tells Heroku what command to call on app start (Deprecated)
7) Public: Contains All Front-End CSS, JS and Static Display Images
8) Routes: Server routes, accessed in app.js
9) Services: Configurations for libraries and APIs such as image uploads and email sending
10) Socket: Controls callback for real-time socket.io calls
11) Utils: Functions used platform-wide in both controllers and EJS logic
12) Views: EJS files of front end code for all pages


### Libraries Used

1) Axios: Facilitates JSON requests and responses. Saberchat currently uses it for email sending with SendGrid
2) Bad-Words: Filters and censors any explicit text
3) Body-Parser: Parses headers and data from HTML form bodies
4) Cloudinary: Online platform which stores our uploaded media. Saberchat connects to it via an API and uploads images that are processed with Multer
5) Connect-Flash: Flashes success and error messages on screen
6) DataURI: Converts media uploads into buffers in preparation for Multer processing
7) DateFormat: Provides an easy way to format and display dates and times
8) Dotenv: Allows server to access environmental variables, the contents of the .env
9) EditorJS: Text and content formatting, used for articles
10) EJS: View engine that is used for all front-end files. Combines JavaScript logic with HTML markup to build platform based on data sent from the server
11) Express: Node.js framework that is used for all routes and request-response systems. The backbone of our server
12) Express-Mongo-Sanitize: Handles and sanitizes user data from server to MongoDB database
13) Express-Session: Platform for cookie storage and security
14) Fillers: Stores all filler words, used to build the Keyword Filter
15) Helmet: Used for security purposes, to moderate valid data sources for different media and content formats
16) Joi: Form validation package. Develops schema that are used to validate form data with the Sanitize-HTML package
17) MemoryStore: Stores records of express sessions
18) Method-Override: Allows forms to send PUT and DELETE requests
19) Mongoose: Connects server to MongoDB database
20) Multer: Processes uploaded media from files to a format that can be uploaded and stored in cloudinary
21) Nodemon: Used by developers to automatically restart server when any backend code is updated
22) Node-Schedule: Used to schedule certain tasks that the server performs without user involvement
23) Passport: Used to authenticate users for logging in and registering accounts
24) Passport-Local-Mongoose: Used to combine user data with passport authentication to log in users
25) Passport.Socketio: Validating user information for real-time actions with socket.io
26) Sanitize-HTML: Used in conjunction with Joi schema to validate form data
27) Serve-Favicon: Used to send favicons from backend storage to EJS pages
28) Socket.io: Module for real-time activity including shop orders and chat messages
