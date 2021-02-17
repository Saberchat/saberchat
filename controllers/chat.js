//SCHEMAS
const Comment = require('../models/chat/comment');
const User = require('../models/user');
const Room = require('../models/chat/room');
const AccessReq = require('../models/inbox/accessRequest');

//LIBRARIES
const express = require('express');
const Filter = require('bad-words');
const {filter} = new Filter();
const dateFormat = require('dateformat');
const router = express.Router();
const {sendGridEmail} = require("../services/sendGrid");
const convertToLink = require("../utils/convert-to-link");
const {validateRoom} = require('../middleware/validation');
const middleware = require('../middleware');

module.exports.index = async function(req, res) {
    const rooms = await Room.find({}).populate("creator.id");

    if (!rooms) {
        req.flash('error', 'Unable to find rooms');
        return res.redirect('back');
    }

    let commentObject = {};
    let roomComments;

    for (let room of rooms) {
        roomComments = await Comment.find({room: room._id, status: {$in: ["none", "ignored"]}}).populate("author");
        if (!roomComments) {
            req.flash('error', 'Unable to find comments');
            return res.redirect('back');
        }

        if (roomComments.length == 0) {
            commentObject[room._id.toString()] = null;

        } else {
            for (let i = roomComments.length - 1; i >= 0; i -= 1) {
                if (roomComments[i].author) {
                    commentObject[room._id.toString()] = roomComments[i];
                    break;
                }
            }
        }
    }

    const requests = await AccessReq.find({requester: req.user._id, status: "pending"});
    if (!requests) {
        req.flash('error', 'Unable to find access requests');
        return res.redirect('back');
    }

    return res.render('chat/index', {rooms, requests, commentObject});
}

module.exports.newRoom = async function(req, res) {
    const users = await User.find({authenticated: true});

    if (!users) {
        req.flash('error', "An Error Occurred");
        return res.redirect('back');
    }

    return res.render('chat/new', {users: users});
}

module.exports.showRoom = async function(req, res) {
    const room = await Room.findById(req.params.id);
    if (!room) {
        req.flash('error', 'Could not find room');
        return res.redirect('/chat');
    }

    if (!(room.confirmed.includes(req.user._id))) {
        room.confirmed.push(req.user._id);
        await room.save();
    }

    if (req.user.newRoomCount.includes(room._id)) {
        req.user.newRoomCount.splice(req.user.newRoomCount.indexOf(room._id), 1);
        await req.user.save();
    }

    const comments = await Comment.find({room: room._id}).sort({_id: -1}).limit(30)
    .populate({path: 'author', select: ['username', 'imageUrl']});
    if (!comments) {
        req.flash('error', 'Could not find comments');
        return res.redirect('/chat');
    }

    return res.render('chat/show', {comments: comments, room: room});
}

module.exports.showMembers = async function(req, res) {
    const room = await Room.findById(req.params.id).populate('creator.id').populate('members');
    if (!room) {
        req.flash('error', "Unable to find room");
        return res.redirect('back');
    }

    return res.render('chat/people', {room});
}

module.exports.editRoom = async function(req, res) {
    const room = await Room.findById(req.params.id);

    if (!room) {
        req.flash('error', "Unable to find room");
        return res.redirect('back');
    }

    const users = await User.find({authenticated: true});
    if (!users) {
        req.flash('error', 'An Error Occurred');
        return res.redirect('back');
    }

    return res.render('chat/edit', {users, room});
}

module.exports.createRoom = async function(req, res) {
    const rooms = await Room.find({});
    if (!rooms) {
        req.flash('error', "Unable to access data");
        return res.redirect('back');
    }

    let roomCount = 0;
    for (let room of rooms) {
        if (room.creator.id.equals(req.user._id)) {
            roomCount++;
        }
    }
    if (roomCount >= 3) {
        req.flash('error', "You have already created 3 rooms");
        return res.redirect('back');
    }

    const roomObject = {
        name: filter.clean(req.body.name),
        'creator.id': req.user._id,
        'creator.username': req.user.username,
        members: [req.user._id]
    };

    const room = await Room.create(roomObject);
    if (!room) {
        req.flash('error', 'Room could not be created');
        return res.redirect('/chat/new');

    } else {
        if (req.body.type == 'true') {
            for (const user in req.body.check) {
                room.members.push(user);
            }
            room.type = 'private';
        }
        if (req.body.moderate == 'false') {
            room.moderate = false;
        }
        if (req.body.description) {
            room.description = filter.clean(req.body.description);
        }

        room.date = dateFormat(room.created_at, "h:MM TT | mmm d");
        await room.save();

        const members = await User.find({authenticated: true, _id: {$in: room.members}});
        if (!members) {
            req.flash('error', 'Members could not be found');
            return res.redirect('/chat/new');
        }

        for (let member of members) {
            member.newRoomCount.push(room._id);
            await member.save();
        }

        return res.redirect('/chat/' + room._id);
    }
}

module.exports.leaveRoom = async function(req, res) {
    const room = await Room.findById(req.params.id);
    if (!room) {
        req.flash('error', 'Room does not exist');
        return res.redirect('back');
    }

    if (room.creator.id.equals(req.user._id)) {
        req.flash('error', 'You cannot leave a room you created');
        return res.redirect('back');
    }

    if (!room.mutable) {
        req.flash('error', 'You cannot leave this room');
        return res.redirect('back');
    }

    const request = await AccessReq.findOne({requester: req.user._id, room: room._id, status: 'accepted'});
    if (request) { // will delete past request for now
        await request.remove();
    }

    //remove user from room's member list and confirmed list
    let index = room.members.indexOf(req.user._id);
    room.members.splice(index, 1);
    index = room.confirmed.indexOf(req.user._id);
    room.confirmed.splice(index, 1);
    await room.save();

    req.flash('success', 'You have left ' + room.name);
    return res.redirect('/chat');
}

module.exports.requestJoin = async function(req, res) {
    const room = await Room.findById(req.params.id); // find the room
    if (!room) {
        return res.json({error: 'Room does not Exist'});
    }

    if (room.type == 'public') {
        return res.json({error: 'Room is public'});

    } else if (!room.mutable) {
        return res.json({error: 'Room does not accept access requests'});
    }

    // find if the request already exists to prevent spam
    const request = await AccessReq.findOne({requester: req.user._id, room: room._id});

    if (request && request.status != 'pending') {
        return res.json({error: `Request has already been ${request.status}`});

    } else if (request) {
        return res.json({error: 'Identical request has already been sent'});

    } else {

        const request = {
            requester: req.user._id,
            room: room._id,
            receiver: room.creator.id
        };

        // create the request and find the room creator
        const [createdReq, roomCreator] = await Promise.all([
            AccessReq.create(request),
            User.findById(room.creator.id)
        ]);

        if (!createdReq || !roomCreator) {
            return res.json({error: 'An error occurred'});
        }

        await roomCreator.requests.push(createdReq._id);
        await roomCreator.save();

        if (roomCreator.receiving_emails) {
            await sendGridEmail(roomCreator.email, 'New Room Access Request', `<p>Hello ${roomCreator.firstName},</p><p><strong>${req.user.username}</strong> is requesting to join your room, <strong>${room.name}.</strong></p><p>You can access the full request at https://alsion-saberchat.herokuapp.com</p>`, false);
        }
        return res.json({success: 'Request for access sent'});
    }
}

module.exports.requestCancel = async function(req, res) {
    const room = await Room.findById(req.params.id).populate("creator.id");
    if (!room) {
        return res.json({error: "Unable to find room"});
    }

    const deletedReq = await AccessReq.deleteOne({room: room._id, requester: req.user._id, status: "pending"});
    if (!deletedReq) {
        return res.json({error: "Unable to find request"});
    }

    room.creator.id.requests.splice(room.creator.id.requests.indexOf(deletedReq._id), 1);
    await room.creator.id.save();

    return res.json({success: "Successfully deleted request"});
}

module.exports.updateRoom = async function(req, res) {
    const room = await Room.findByIdAndUpdate(req.params.id, {
        name: filter.clean(req.body.name),
        description: filter.clean(req.body.description)
    });

    if (!room) {
        req.flash('error', 'An Error Occurred');
        return res.redirect('back');
    }

    if (req.body.type == 'true') {
        for (const rUser in req.body.checkRemove) {
            let index = room.members.indexOf(rUser);
            room.members.splice(index, 1);
            index = room.confirmed.indexOf(rUser);
            room.confirmed.splice(index, 1);
        }
        for (const aUser in req.body.checkAdd) {
            room.members.push(aUser);
        }
        room.type = 'private';
    } else {
        room.type = 'public';
    }

    if (req.body.moderate == 'false') {
        room.moderate = false;
    } else {
        room.moderate = true;
    }

    room.save();
    req.flash('success', 'Updated your group');
    return res.redirect('/chat/' + room._id);
}

module.exports.deleteRoom = async function(req, res) {
    const room = await Room.findById(req.params.id).populate("creator.id");
    if (!room) {
        req.flash('error', 'An error occured');
        return res.redirect('back');
    }

    if (!room.mutable) {
        req.flash('error', 'You cannot delete this room');
        return res.redirect('back');
    }

    const deletedComments = await Comment.deleteMany({room: room._id});
    if (!deletedComments) {
        req.flash('error', 'Unable to delete comments');
        return res.redirect('back');
    }

    const requests = await AccessReq.find({room: room._id});
    if (!requests) {
        req.flash('error', 'Unable to find requests');
        return res.redirect('back');
    }

    let deletedRequest;
    for (let request of requests) {
        if (room.creator.id.requests.includes(request._id)) {
            room.creator.id.requests.splice(room.creator.id.requests.indexOf(request._id), 1);
        }

        deletedRequest = await AccessReq.findByIdAndDelete(request._id);
        if (!deletedRequest) {
            req.flash('error', 'Unable to delete requests');
            return res.redirect('back');
        }
    }

    await room.creator.id.save();

    const deletedRoom = await Room.findByIdAndDelete(req.params.id).populate("members");
    if (!deletedRoom) {
        req.flash('error', 'A problem occured');
        return res.redirect('back');
    }

    for (let member of deletedRoom.members) {
        if (member.newRoomCount.includes(deletedRoom._id)) {
            member.newRoomCount.splice(member.newRoomCount.indexOf(deletedRoom._id), 1);
            await member.save();
        }
    }
    req.flash('success', 'Deleted room');
    return res.redirect('/chat');
}

module.exports.reportComment = async function(req, res) {
    const comment = await Comment.findById(req.params.id).populate({path: 'room', select: 'moderate'});

    if (!comment) {
        return res.json('Error');
    } else if (!comment.room.moderate) {
        return res.json('Reporting Is Disabled');
    } else if (comment.status == 'flagged') {
        return res.json('Already Reported');
    } else if (comment.status == 'ignored') {
        return res.json('Report Ignored by Mod');
    } else {
        comment.status = 'flagged'; // set status to flagged
        comment.statusBy = req.body.user; // remember who flagged it
        await comment.save();
        return res.json('Reported');
    }
}
