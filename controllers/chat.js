//LIBRARIES
const Filter = require('bad-words'); // badwords and profanity filter library
const filter = new Filter(); // initialize filter
const dateFormat = require('dateformat'); // timestamp formatting library
const {sendGridEmail} = require("../services/sendGrid"); // emailing service
const {removeIfIncluded, concatMatrix, multiplyArrays, sortAlph} = require("../utils/object-operations");
const setup = require("../utils/setup");
const {cloudUpload, cloudDelete} = require('../services/cloudinary'); // media upload service
const {autoCompress} = require("../utils/image-compress"); // image compression service

//SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const {ChatMessage, AccessRequest} = require("../models/notification");
const {ChatRoom} = require('../models/group');

const controller = {}; // initialize controller object

// GET: chat homepage; List existing chatrooms
controller.index = async function(req, res) {
    const platform = await setup(Platform);
    const rooms = await ChatRoom.find({}).populate("creator").populate({
        path: "comments",
        populate: {path: "author"}
    });
    if (!platform || !rooms) {
        req.flash('error', 'Unable to find rooms');
        return res.redirect('back');
    }

    let commentObject = {};
    for (let room of rooms) { //Tracks most recent comments from each room, for display
        commentObject[await room._id.toString()] = null;
        for (let comment of await room.comments.reverse()) {
            if (comment.status != "deleted") {
                commentObject[await room._id.toString()] = comment;
                break;
            }
        }
    }

    let filteredRooms = {joined: [], private: []}; //Tracks rooms that user has joined, or has not joined
    for (let room of rooms) {
        if (!room.private || (await room.members.includes(req.user._id))) {
            await filteredRooms.joined.push(room);
        } else if (room.private && !(await room.members.includes(req.user._id)) && room.mutable) {
            await filteredRooms.private.push(room);
        }
    }

    //Track all of the current user's join requests
    const requests = await AccessRequest.find({author: req.user._id, status: "pending"});
    if (!requests) {
        req.flash('error', 'Unable to find access requests');
        return res.redirect('back');
    }
    return res.render('chat/index', {platform, rooms, requests, commentObject, filteredRooms});
}

// GET: Displays form to create new room
controller.newRoom = async function(req, res) {
    const platform = await setup(Platform);
    const users = await User.find({authenticated: true});
    if (!platform || !users) {
        req.flash('error', "An Error Occurred");
        return res.redirect('back');
    }
    return res.render('chat/new', {platform, users});
}

// GET: Show page for when entering a room
controller.showRoom = async function(req, res) {
    const platform = await setup(Platform);
    const room = await ChatRoom.findById(req.params.id).populate({
        path: "comments",
        populate: {path: "author"}
    });
    if (!platform || !room) {
        req.flash('error', 'Could not find room');
        return res.redirect('/chat');
    }

    if (!(await room.confirmed.includes(req.user._id))) {
        await room.confirmed.push(req.user._id);
        await room.save();
    }
    removeIfIncluded(req.user.newRooms, room._id); //If user has not seen room before, remove it
    await req.user.save();
    return res.render('chat/show', {platform, room});
}

// GET: Show people in private room
controller.showMembers = async function(req, res) {
    const platform = await setup(Platform);
    const room = await ChatRoom.findById(req.params.id).populate('creator').populate('members');
    if (!platform || !room) {
        req.flash('error', "Unable to find room");
        return res.redirect('back');
    }

    let statuses = concatMatrix([
		platform.statusesProperty,
		platform.statusesPlural,
		multiplyArrays([], platform.statusesProperty.length)
	]).reverse();

    let reversedPerms = [];
	for (let permission of platform.permissionsProperty) {await reversedPerms.unshift(permission);}

    for (let status of statuses) {
		status[2] = [];
		for (let permission of reversedPerms) {
			for (let user of await sortAlph(room.members, "email")) {
				if (status[0] == user.status && permission == user.permission) {await status[2].push(user);}
			}
		}
	}

    if (room.private) {
        return res.render('chat/people', {
            platform, room, statuses,
            permMap: new Map(concatMatrix([
                await platform.permissionsProperty.slice(1),
                await platform.permissionsDisplay.slice(1)
            ])),
            emptyStatuses: concatMatrix([
                platform.statusesProperty,
                platform.statusesPlural,
                multiplyArrays([], platform.statusesProperty.length)
            ]).reverse()
        });
    }
    req.flash("error", "Public rooms are open to all users");
    return res.redirect("back");
}

// GET: Display edit form for room
controller.editRoom = async function(req, res) {
    const platform = await setup(Platform);
    const room = await ChatRoom.findById(req.params.id);
    if (!platform || !room) {
        req.flash('error', "Unable to find room");
        return res.redirect('back');
    }

    const users = await User.find({authenticated: true});
    if (!users) {
        req.flash('error', 'An Error Occurred');
        return res.redirect('back');
    }
    return res.render('chat/edit', {platform, users, room});
}

// POST: Create new room
controller.createRoom = async function(req, res) {
    const platform = await setup(Platform);
    const rooms = await ChatRoom.find({});
    if (!platform || !rooms) {
        req.flash('error', "Unable to access data");
        return res.redirect('back');
    }

    let roomCount = 0;
    for (let room of rooms) {if (await room.creator.equals(req.user._id)) {roomCount++;}} //Iterate through rooms and see how many rooms this user has created
    if (platform.restrictPosts && roomCount >= 3) {
        req.flash('error', "You have already created 3 rooms");
        return res.redirect('back');
    }

    const room = await ChatRoom.create({ // initialize room
        name: await filter.clean(req.body.name),
        creator: req.user._id,
        members: [req.user._id],
        moderate: req.body.moderate == "false",
        thumbnail: {
            url: req.body.thumbnail,
            display: (req.body.showThumbnail == "url")
        },
    });
    if (!room) {
        req.flash('error', 'Room could not be created');
        return res.redirect('/chat/new');
    }

    if (req.files) {
        if (req.files.mediaFile) {
            const file = req.files.mediaFile[0];
            // attempt to compress
            const processedBuffer = await autoCompress(file.originalname, file.buffer);
            // upload to cloudinary
            const [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
            if (cloudErr || !cloudResult) {
                req.flash("error", "Upload failed");
                return res.redirect("back");
            }

            // Add info to image file
            // link to cloudinary-stored address
            room.thumbnailFile = {
                filename: cloudResult.public_id,
                url: cloudResult.secure_url,
                originalName: file.originalname,
                display: req.body.showThumbnail == "upload"
            };
        }
    }

    if (req.body.type == 'true') { //If room is marked as private
        for (let user in req.body.check) {await room.members.push(user);}
        room.private = true;
    }

    if (req.body.description) {room.description = await filter.clean(req.body.description);} //If room has a description (otherwise default applied)
    room.date = dateFormat(room.created_at, "h:MM TT | mmm d");
    await room.save();

    const members = await User.find({authenticated: true, _id: {$in: room.members, $ne: req.user._id}});
    if (!members) {
        req.flash('error', 'Members could not be found');
        return res.redirect('/chat/new');
    }

    for (let member of members) { //Iterate through all new members and add room to their newRooms
        await member.newRooms.push(room._id);
        await member.save();
    }
    req.flash("Created room!");
    return res.redirect(`/chat/${room._id}`);
}

// POST: leave private room
controller.leaveRoom = async function(req, res) {
    const room = await ChatRoom.findById(req.params.id);
    if (!room) {
        req.flash('error', 'Room does not exist');
        return res.redirect('back');
    }

    if (await room.creator.equals(req.user._id)) {
        req.flash('error', 'You cannot leave a room you created');
        return res.redirect('back');
    }

    if (!room.mutable) {
        req.flash('error', 'You cannot leave this room');
        return res.redirect('back');
    }

    const request = await AccessRequest.findOne({author: req.user._id, room: room._id, status: 'accepted'});
    if (request) {await request.remove();} // Will delete past request for now

    //remove user from room's member list and confirmed list
    removeIfIncluded(room.members, req.user._id);
    removeIfIncluded(room.confirmed, req.user._id);
    await room.save();

    req.flash('success', `You have left "${room.name}"`);
    return res.redirect('/chat');
}

// POST: send join request (Access request)
controller.requestJoin = async function(req, res) {
    const platform = await setup(Platform);
    const room = await ChatRoom.findById(req.params.id); // find the room
    if (!platform || !room) {return res.json({error: 'Room does not Exist'});}

    if (room.type == 'public') {return res.json({error: 'Room is public'});
    } else if (!room.mutable) {return res.json({error: 'Room does not accept access requests'});} //If room cannot get new members

    // find if the request already exists to prevent spam
    const existingRequest = await AccessRequest.findOne({author: req.user._id, room: room._id});
    if (existingRequest && existingRequest.status != 'pending') {
        return res.json({error: `Request has already been ${existingRequest.status}`});

    } else if (existingRequest) {return res.json({error: 'Identical request has already been sent'});}

    const request = { // initialize request
        author: req.user._id,
        room: room._id,
        status: "pending",
        recipients: [room.creator]
    };

    // create the request and find the room creator
    const [createdReq, roomCreator] = await Promise.all([
        AccessRequest.create(request),
        User.findById(room.creator)
    ]);

    if (!createdReq || !roomCreator) {return res.json({error: 'An error occurred'});}

    //Add access request to room creator's inbox
    await roomCreator.requests.push(createdReq._id);
    await roomCreator.save();

    if (roomCreator.receiving_emails) {
        await sendGridEmail(roomCreator.email, 'New Room Access Request', `<p>Hello ${roomCreator.firstName},</p><p><strong>${req.user.username}</strong> is requesting to join your room, <strong>${room.name}.</strong></p><p>You can access the full request at https://${platform.url}</p>`, false);
    }
    return res.json({success: 'Request for access sent'});
}

// DELETE: cancel access request
controller.requestCancel = async function(req, res) {
    const room = await ChatRoom.findById(req.params.id).populate("creator");
    if (!room) {return res.json({error: "Unable to find room"});}

    let deletedReq = await AccessRequest.findOne({room: room._id, author: req.user._id, status: "pending"});
    if (!deletedReq) {return res.json({error: "Unable to find request"});}

    //Remove Access Request From from creator's inbox
    removeIfIncluded(room.creator.requests, deletedReq._id);
    await room.creator.save();

    //Delete after removing from inbox (Will not return _id, so cannot be used earlier)
    deletedReq = await AccessRequest.findByIdAndDelete(deletedReq._id);
    if (!deletedReq) {return res.json({error: "Unable to find request"});}
    return res.json({success: "Successfully deleted request"});
}

// PUT: edit/update room
controller.updateRoom = async function(req, res) {
    const room = await ChatRoom.findByIdAndUpdate(req.params.id, {
        name: await filter.clean(req.body.name),
        description: await filter.clean(req.body.description),
        thumbnail: {
            url: req.body.thumbnail,
            display: req.body.showThumbnail == "url"
        }
    });
    if (!room) {
        req.flash('error', 'An Error Occurred');
        return res.redirect('back');
    }

    if (req.body.type == 'true') { //If room is private, iterate through users that need to be removed and added
        for (const rUser in req.body.checkRemove) {
            removeIfIncluded(room.members, rUser);
            removeIfIncluded(room.confirmed, rUser);
        }
        for (const aUser in req.body.checkAdd) {await room.members.push(aUser);}
        room.private = true;
    } else {room.private = false;}

    if (req.body.moderate == 'false') {room.moderate = false;
    } else {room.moderate = true;}

    room.thumbnailFile.display = (req.body.showThumbnail == "upload");
    if (req.files) {
        if (req.files.mediaFile) {
            let cloudErr;
            let cloudResult;
            if (room.thumbnailFile && room.thumbnailFile.filename) {
                [cloudErr, cloudResult] = await cloudDelete(room.thumbnailFile.filename, "image");
                if (cloudErr || !cloudResult || cloudResult.result !== "ok") {
                    req.flash("error", "Error deleting uploaded image");
                    return res.redirect("back");
                }
            }
            
            const file = req.files.mediaFile[0];
            // attempt to compress media
            const processedBuffer = await autoCompress(file.originalname, file.buffer);
            // upload to cloudinary
            [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
            if (cloudErr || !cloudResult) {
                req.flash("error", "Upload failed");
                return res.redirect("back");
            }

            // Add info to image file
            // link to cloudinary-stored address
            room.thumbnailFile = {
                filename: cloudResult.public_id,
                url: cloudResult.secure_url,
                originalName: file.originalname,
                display: room.thumbnailFile.display
            };
        }
    }

    await room.save();
    req.flash('success', 'Updated your group');
    return res.redirect(`/chat/${room._id}`);
}

// DELETE: delete room
controller.deleteRoom = async function(req, res) {
    const room = await ChatRoom.findById(req.params.id).populate("creator");
    if (!room) {
        req.flash('error', 'An error occured');
        return res.redirect('back');
    }

    if (!room.mutable) {
        req.flash('error', 'You cannot delete this room');
        return res.redirect('back');
    }

    // delete comments
    const deletedComments = await ChatMessage.deleteMany({_id: {$in: room.comments}});
    if (!deletedComments) {
        req.flash('error', 'Unable to delete comments');
        return res.redirect('back');
    }

    const requests = await AccessRequest.find({room: room._id});
    if (!requests) {
        req.flash('error', 'Unable to find requests');
        return res.redirect('back');
    }

    let deletedRequest; 
    for (let request of requests) { //Iterate through all active join requests and remove them from room creator's inbox
        removeIfIncluded(room.creator.requests, request._id);
        deletedRequest = await AccessRequest.findByIdAndDelete(request._id);
        if (!deletedRequest) {
            req.flash('error', 'Unable to delete requests');
            return res.redirect('back');
        }
    }
    await room.creator.save();

    // delete room object
    const deletedRoom = await ChatRoom.findByIdAndDelete(req.params.id).populate("members");
    if (!deletedRoom) {
        req.flash('error', 'A problem occured');
        return res.redirect('back');
    }

    // delete any uploads
    if (room.thumbnailFile && room.thumbnailFile.filename) {
        const [cloudErr, cloudResult] = await cloudDelete(room.thumbnailFile.filename, "image");
        if (cloudErr || !cloudResult || cloudResult.result !== "ok") {
            req.flash("error", "Error deleting uploaded image");
            return res.redirect("back");
        }
    }

    for (let member of deletedRoom.members) { //Remove room from all members' newRooms
        removeIfIncluded(member.newRooms, deletedRoom._id);
        await member.save();
    }
    req.flash('success', 'Deleted room!');
    return res.redirect('/chat');
}

// PUT: flag/report a comment message
controller.reportComment = async function(req, res) {
    const comment = await ChatMessage.findById(req.params.id);
    const room = await ChatRoom.findById(req.body.roomId);
    if (!room || !comment) {return res.json('Error finding comment');}
    
    if (!room.moderate) {return res.json('Reporting Is Disabled');}

    // if comment already handled before
    if (comment.status == 'flagged') {return res.json('Already Reported');}
    if (comment.status == 'ignored') {return res.json('Report Ignored by Mod');}
    
    comment.status = 'flagged'; // set status to flagged
    comment.statusBy = req.body.user; // remember who flagged it
    await comment.save();
    return res.json('Reported');
}

module.exports = controller; // export chat controller