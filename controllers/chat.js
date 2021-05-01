//LIBRARIES
const Filter = require('bad-words');
const filter = new Filter();
const dateFormat = require('dateformat');
const {sendGridEmail} = require("../services/sendGrid");
const {removeIfIncluded, concatMatrix, multiplyArrays, sortAlph} = require("../utils/object-operations");
const setup = require("../utils/setup");

//SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const {ChatMessage, AccessRequest} = require("../models/notification");
const {ChatRoom} = require('../models/group');

const controller = {};

controller.index = async function(req, res) {
    const platform = await setup(Platform);
    const rooms = await ChatRoom.find({}).populate("creator").populate({
        path: "comments",
        populate: {path: "author"}
    });
    if (!platform || !rooms) {
        await req.flash('error', 'Unable to find rooms');
        return res.redirect('back');
    }

    let commentObject = {};
    for (let room of rooms) {
        commentObject[room._id.toString()] = null;
        for (let comment of room.comments.reverse()) {
            if (comment.status != "deleted") {
                commentObject[room._id.toString()] = comment;
                break;
            }
        }
    }

    //Track all of the current user's requests
    const requests = await AccessRequest.find({author: req.user._id, status: "pending"});
    if (!requests) {
        await req.flash('error', 'Unable to find access requests');
        return res.redirect('back');
    }
    return res.render('chat/index', {platform, rooms, requests, commentObject});
}

controller.newRoom = async function(req, res) {
    const platform = await setup(Platform);
    const users = await User.find({authenticated: true});
    if (!platform || !users) {
        await req.flash('error', "An Error Occurred");
        return res.redirect('back');
    }
    return res.render('chat/new', {platform, users});
}

controller.showRoom = async function(req, res) {
    const platform = await setup(Platform);
    const room = await ChatRoom.findById(req.params.id).populate({
        path: "comments",
        populate: {path: "author"}
    });
    if (!platform || !room) {
        await req.flash('error', 'Could not find room');
        return res.redirect('/chat');
    }

    if (!(room.confirmed.includes(req.user._id))) {
        await room.confirmed.push(req.user._id);
        await room.save();
    }
    removeIfIncluded(req.user.newRoomCount, room._id); //If user has not seen room before, remove it
    await req.user.save();
    return res.render('chat/show', {platform, room});
}

controller.showMembers = async function(req, res) {
    const platform = await setup(Platform);
    const room = await ChatRoom.findById(req.params.id).populate('creator').populate('members');
    if (!platform || !room) {
        await req.flash('error', "Unable to find room");
        return res.redirect('back');
    }

    let statuses = concatMatrix([
		platform.statusesProperty,
		platform.statusesPlural,
		multiplyArrays([], platform.statusesProperty.length)
	]).reverse();

    let reversedPerms = [];
	for (let permission of platform.permissionsProperty) {reversedPerms.unshift(permission);}

    for (let status of statuses) {
		status[2] = [];
		for (let permission of reversedPerms) {
			for (let user of sortAlph(room.members, "email")) {
				if (status[0] == user.status && permission == user.permission) {status[2].push(user);}
			}
		}
	}

    if (room.private) {
        return res.render('chat/people', {
            platform, room, statuses,
            permMap: new Map(concatMatrix([
                platform.permissionsProperty.slice(1),
                platform.permissionsDisplay.slice(1)
            ])),
            emptyStatuses: concatMatrix([
                platform.statusesProperty,
                platform.statusesPlural,
                multiplyArrays([], platform.statusesProperty.length)
            ]).reverse()
        });
    }
    await req.flash("error", "Public rooms are open to all users");
    return res.redirect("back");
}

controller.editRoom = async function(req, res) {
    const platform = await setup(Platform);
    const room = await ChatRoom.findById(req.params.id);
    if (!platform || !room) {
        await req.flash('error', "Unable to find room");
        return res.redirect('back');
    }

    const users = await User.find({authenticated: true});
    if (!users) {
        await req.flash('error', 'An Error Occurred');
        return res.redirect('back');
    }
    return res.render('chat/edit', {platform, users, room});
}

controller.createRoom = async function(req, res) {
    const rooms = await ChatRoom.find({});
    if (!rooms) {
        await req.flash('error', "Unable to access data");
        return res.redirect('back');
    }

    let roomCount = 0;
    //Iterate through rooms and see how many rooms this user has created
    for (let room of rooms) {
        if (room.creator.equals(req.user._id)) {
            roomCount++;
        }
    }
    if (roomCount >= 3) {
        await req.flash('error', "You have already created 3 rooms");
        return res.redirect('back');
    }

    const roomObject = {
        name: filter.clean(req.body.name),
        creator: req.user._id,
        members: [req.user._id]
    };

    const room = await ChatRoom.create(roomObject);
    if (!room) {
        await req.flash('error', 'Room could not be created');
        return res.redirect('/chat/new');

    } else {
        //If room is marked as private
        if (req.body.type == 'true') {
            for (const user in req.body.check) {
                room.members.push(user);
            }
            room.private = true;
        }

        //If room is marked to have moderation
        if (req.body.moderate == 'false') {
            room.moderate = false;
        }

        //If room has a description
        if (req.body.description) {
            room.description = filter.clean(req.body.description);
        }

        room.date = dateFormat(room.created_at, "h:MM TT | mmm d");
        await room.save();

        const members = await User.find({authenticated: true, _id: {$in: room.members, $ne: req.user._id}});
        if (!members) {
            await req.flash('error', 'Members could not be found');
            return res.redirect('/chat/new');
        }

        for (let member of members) { //Iterate through all new members and add room to their newRoomCount
            await member.newRoomCount.push(room._id);
            await member.save();
        }
        return res.redirect('/chat/' + room._id);
    }
}

controller.leaveRoom = async function(req, res) {
    const room = await ChatRoom.findById(req.params.id);
    if (!room) {
        await req.flash('error', 'Room does not exist');
        return res.redirect('back');
    }

    if (room.creator.equals(req.user._id)) {
        await req.flash('error', 'You cannot leave a room you created');
        return res.redirect('back');
    }

    if (!room.mutable) {
        await req.flash('error', 'You cannot leave this room');
        return res.redirect('back');
    }

    const request = await AccessRequest.findOne({author: req.user._id, room: room._id, status: 'accepted'});
    if (request) { // will delete past request for now
        await request.remove();
    }

    //remove user from room's member list and confirmed list
    removeIfIncluded(room.members, req.user._id);
    removeIfIncluded(room.confirmed, req.user._id);
    await room.save();

    await req.flash('success', 'You have left ' + room.name);
    return res.redirect('/chat');
}

controller.requestJoin = async function(req, res) {
    const platform = await setup(Platform);
    const room = await ChatRoom.findById(req.params.id); // find the room
    if (!platform || !room) {
        return res.json({error: 'Room does not Exist'});
    }

    if (room.type == 'public') {
        return res.json({error: 'Room is public'});

    } else if (!room.mutable) { //If room cannot get new members
        return res.json({error: 'Room does not accept access requests'});
    }

    // find if the request already exists to prevent spam
    const existingRequest = await AccessRequest.findOne({author: req.user._id, room: room._id});
    if (existingRequest && existingRequest.status != 'pending') {
        return res.json({error: `Request has already been ${existingRequest.status}`});

    } else if (existingRequest) {
        return res.json({error: 'Identical request has already been sent'});
    }

    const request = {
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

    if (!createdReq || !roomCreator) {
        return res.json({error: 'An error occurred'});
    }

    //Add access request to room creator's inbox
    await roomCreator.requests.push(createdReq._id);
    await roomCreator.save();

    if (roomCreator.receiving_emails) {
        await sendGridEmail(roomCreator.email, 'New Room Access Request', `<p>Hello ${roomCreator.firstName},</p><p><strong>${req.user.username}</strong> is requesting to join your room, <strong>${room.name}.</strong></p><p>You can access the full request at https://${platform.url}</p>`, false);
    }
    return res.json({success: 'Request for access sent'});
}

controller.requestCancel = async function(req, res) {
    const room = await ChatRoom.findById(req.params.id).populate("creator");
    if (!room) {
        return res.json({error: "Unable to find room"});
    }

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

controller.updateRoom = async function(req, res) {
    const room = await ChatRoom.findByIdAndUpdate(req.params.id, {
        name: filter.clean(req.body.name),
        description: filter.clean(req.body.description)
    });
    if (!room) {
        await req.flash('error', 'An Error Occurred');
        return res.redirect('back');
    }

    if (req.body.type == 'true') { //If room is private, iterate through users that need to be removed and added
        for (const rUser in req.body.checkRemove) {
            removeIfIncluded(room.members, rUser);
            removeIfIncluded(room.confirmed, rUser);
        }
        for (const aUser in req.body.checkAdd) {
            await room.members.push(aUser);
        }
        room.private = true;
    } else {
        room.private = false;
    }

    if (req.body.moderate == 'false') {
        room.moderate = false;
    } else {
        room.moderate = true;
    }

    await room.save();
    await req.flash('success', 'Updated your group');
    return res.redirect('/chat/' + room._id);
}

controller.deleteRoom = async function(req, res) {
    const room = await ChatRoom.findById(req.params.id).populate("creator");
    if (!room) {
        await req.flash('error', 'An error occured');
        return res.redirect('back');
    }

    if (!room.mutable) {
        await req.flash('error', 'You cannot delete this room');
        return res.redirect('back');
    }

    const deletedComments = await ChatMessage.deleteMany({_id: {$in: room.comments}});
    if (!deletedComments) {
        await req.flash('error', 'Unable to delete comments');
        return res.redirect('back');
    }

    const requests = await AccessRequest.find({room: room._id});
    if (!requests) {
        await req.flash('error', 'Unable to find requests');
        return res.redirect('back');
    }

    let deletedRequest; 
    for (let request of requests) { //Iterate through all active join requests and remove them from room creator's inbox
        removeIfIncluded(room.creator.requests, request._id);
        deletedRequest = await AccessRequest.findByIdAndDelete(request._id);
        if (!deletedRequest) {
            await req.flash('error', 'Unable to delete requests');
            return res.redirect('back');
        }
    }
    await room.creator.save();

    const deletedRoom = await ChatRoom.findByIdAndDelete(req.params.id).populate("members");
    if (!deletedRoom) {
        await req.flash('error', 'A problem occured');
        return res.redirect('back');
    }

    for (let member of deletedChatRoom.members) { //Remove room from all members' newRoomCounts
        removeIfIncluded(member.newRoomCount, deletedChatRoom._id);
        await member.save();
    }
    await req.flash('success', 'Deleted room');
    return res.redirect('/chat');
}

controller.reportComment = async function(req, res) {
    const comment = await ChatMessage.findById(req.params.id);
    if (!comment) {
        return res.json('Error finding comment');
    }

    const room = await ChatRoom.findById(req.body.roomId);
    if (!room) {
        return res.json("Error finding comment");
    }

    if (!room.moderate) {
        return res.json('Reporting Is Disabled');
    }
    
    if (comment.status == 'flagged') {
        return res.json('Already Reported');
    }
    
    if (comment.status == 'ignored') {
        return res.json('Report Ignored by Mod');
    }
    
    comment.status = 'flagged'; // set status to flagged
    comment.statusBy = req.body.user; // remember who flagged it
    await comment.save();
    return res.json('Reported');
}

module.exports = controller;