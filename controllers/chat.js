//SCHEMAS
const Comment = require('../models/chat/comment');
const User = require('../models/user');
const Room = require('../models/chat/room');
const AccessReq = require('../models/inbox/accessRequest');

//LIBRARIES
const Filter = require('bad-words');
const filter = new Filter();
const dateFormat = require('dateformat');
const {sendGridEmail} = require("../services/sendGrid");
const {removeIfIncluded} = require("../utils/object-operations");

const controller = {};

controller.index = async function(req, res) {
    const rooms = await Room.find({}).populate("creator");
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

        //Find latest comment
        } else {
            for (let i = roomComments.length - 1; i >= 0; i -= 1) {
                if (roomComments[i].author) {
                    commentObject[room._id.toString()] = roomComments[i];
                    break;
                }
            }
        }
    }

    //Track all of the current user's beliefs
    const requests = await AccessReq.find({requester: req.user._id, status: "pending"});
    if (!requests) {
        req.flash('error', 'Unable to find access requests');
        return res.redirect('back');
    }
    return res.render('chat/index', {rooms, requests, commentObject});
}

controller.newRoom = async function(req, res) {
    const users = await User.find({authenticated: true});
    if (!users) {
        req.flash('error', "An Error Occurred");
        return res.redirect('back');
    }
    return res.render('chat/new', {users: users});
}

controller.showRoom = async function(req, res) {
    const room = await Room.findById(req.params.id);
    if (!room) {
        req.flash('error', 'Could not find room');
        return res.redirect('/chat');
    }

    if (!(room.confirmed.includes(req.user._id))) {
        room.confirmed.push(req.user._id);
        await room.save();
    }
    removeIfIncluded(req.user.newRoomCount, room._id); //If user has not seen room before, remove it
    await req.user.save();

    const comments = await Comment.find({room: room._id}).sort({_id: -1}).limit(30)
    .populate({path: 'author', select: ['username', 'imageUrl']});
    if (!comments) {
        req.flash('error', 'Could not find comments');
        return res.redirect('/chat');
    }

    return res.render('chat/show', {comments, room: room});
}

controller.showMembers = async function(req, res) {
    const room = await Room.findById(req.params.id).populate('creator').populate('members');
    if (!room) {
        req.flash('error', "Unable to find room");
        return res.redirect('back');
    }
    if (room.private) {
        return res.render('chat/people', {room});
    }
    req.flash("error", "Public rooms are open to all users");
    return res.redirect("back");
}

controller.editRoom = async function(req, res) {
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

controller.createRoom = async function(req, res) {
    const rooms = await Room.find({});
    if (!rooms) {
        req.flash('error', "Unable to access data");
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
        req.flash('error', "You have already created 3 rooms");
        return res.redirect('back');
    }

    const roomObject = {
        name: filter.clean(req.body.name),
        creator: req.user._id,
        members: [req.user._id]
    };

    const room = await Room.create(roomObject);
    if (!room) {
        req.flash('error', 'Room could not be created');
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
            req.flash('error', 'Members could not be found');
            return res.redirect('/chat/new');
        }

        for (let member of members) { //Iterate through all new members and add room to their newRoomCount
            member.newRoomCount.push(room._id);
            await member.save();
        }
        return res.redirect('/chat/' + room._id);
    }
}

controller.leaveRoom = async function(req, res) {
    const room = await Room.findById(req.params.id);
    if (!room) {
        req.flash('error', 'Room does not exist');
        return res.redirect('back');
    }

    if (room.creator.equals(req.user._id)) {
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
    removeIfIncluded(room.members, req.user._id);
    removeIfIncluded(room.confirmed, req.user._id);
    await room.save();

    req.flash('success', 'You have left ' + room.name);
    return res.redirect('/chat');
}

controller.requestJoin = async function(req, res) {
    const room = await Room.findById(req.params.id); // find the room
    if (!room) {
        return res.json({error: 'Room does not Exist'});
    }

    if (room.type == 'public') {
        return res.json({error: 'Room is public'});

    } else if (!room.mutable) { //If room cannot get new members
        return res.json({error: 'Room does not accept access requests'});
    }

    // find if the request already exists to prevent spam
    const request = await AccessReq.findOne({requester: req.user._id, room: room._id});
    if (request && request.status != 'pending') {
        return res.json({error: `Request has already been ${request.status}`});

    } else if (request) {
        return res.json({error: 'Identical request has already been sent'});
    }

    const request = {
        requester: req.user._id,
        room: room._id,
        receiver: room.creator
    };

    // create the request and find the room creator
    const [createdReq, roomCreator] = await Promise.all([
        AccessReq.create(request),
        User.findById(room.creator)
    ]);

    if (!createdReq || !roomCreator) {
        return res.json({error: 'An error occurred'});
    }

    //Add access request to room creator's inbox
    roomCreator.requests.push(createdReq._id);
    roomCreator.reqCount ++;
    await roomCreator.save();

    if (roomCreator.receiving_emails) {
        await sendGridEmail(roomCreator.email, 'New Room Access Request', `<p>Hello ${roomCreator.firstName},</p><p><strong>${req.user.username}</strong> is requesting to join your room, <strong>${room.name}.</strong></p><p>You can access the full request at https://saberchat.net</p>`, false);
    }
    return res.json({success: 'Request for access sent'});
}

controller.requestCancel = async function(req, res) {
    const room = await Room.findById(req.params.id).populate("creator");
    if (!room) {
        return res.json({error: "Unable to find room"});
    }

    const deletedReq = await AccessReq.deleteOne({room: room._id, requester: req.user._id, status: "pending"});
    if (!deletedReq) {
        return res.json({error: "Unable to find request"});
    }

    //Remove Access Request From from creator's inbox
    removeIfIncluded(room.creator.requests, deletedReq._id);
    room.creator.reqCount --;
    await room.creator.save();
    return res.json({success: "Successfully deleted request"});
}

controller.updateRoom = async function(req, res) {
    const room = await Room.findByIdAndUpdate(req.params.id, {
        name: filter.clean(req.body.name),
        description: filter.clean(req.body.description)
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
        for (const aUser in req.body.checkAdd) {
            room.members.push(aUser);
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
    req.flash('success', 'Updated your group');
    return res.redirect('/chat/' + room._id);
}

controller.deleteRoom = async function(req, res) {
    const room = await Room.findById(req.params.id).populate("creator");
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
    for (let request of requests) { //Iterate through all active join requests and remove them from room creator's inbox
        removeIfIncluded(room.creator.requests, request._id);
        deletedRequest = await AccessReq.findByIdAndDelete(request._id);
        if (!deletedRequest) {
            req.flash('error', 'Unable to delete requests');
            return res.redirect('back');
        }
    }
    await room.creator.save();

    const deletedRoom = await Room.findByIdAndDelete(req.params.id).populate("members");
    if (!deletedRoom) {
        req.flash('error', 'A problem occured');
        return res.redirect('back');
    }

    for (let member of deletedRoom.members) { //Remove room from all members' newRoomCounts
        removeIfIncluded(member.newRoomCount, deletedRoom._id);
        await member.save();
    }
    req.flash('success', 'Deleted room');
    return res.redirect('/chat');
}

controller.reportComment = async function(req, res) {
    const comment = await Comment.findById(req.params.id).populate({path: 'room', select: 'moderate'});
    if (!comment) {
        return res.json('Error finding comment');
    } else if (!comment.room.moderate) {
        return res.json('Reporting Is Disabled');
    } else if (comment.status == 'flagged') {
        return res.json('Already Reported');
    } else if (comment.status == 'ignored') {
        return res.json('Report Ignored by Mod');
    }
    
    comment.status = 'flagged'; // set status to flagged
    comment.statusBy = req.body.user; // remember who flagged it
    await comment.save();
    return res.json('Reported');
}

module.exports = controller;