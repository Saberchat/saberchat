//LIBRARIES
const Filter = require('bad-words');
const filter = new Filter();
const dateFormat = require('dateformat');

//SCHEMA
const {ChatMessage} = require('../models/notification');
const {ChatRoom} = require('../models/group');

const chat = {};

chat.switchRoom = function(io, socket, newroom) { //Switch Chat Room
    socket.leave(socket.room);
    socket.join(newroom);
    socket.room = newroom;
}

chat.chatMessage = async function(io, socket, msg) { //Send Chat Room Message
    let profanity;
    // clean the message
    if (msg.text != filter.clean(msg.text)) {
        msg.text = filter.clean(msg.text);
        profanity = true;
    }
    // create/save comment to db
    const room = await ChatRoom.findById(socket.room);
    if (!room) {
        return console.log(err);
    }

    const comment = await ChatMessage.create({text: msg.text, author: msg.authorId});
    if (!comment) {
        return console.log(err); // sends error msg if comment could not be created
    }

    msg.id = comment._id;
    socket.to(socket.room).emit('chat message', msg); // broadcast message to all connected users in the room
    comment.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
    await comment.save();
    room.comments.push(comment._id);
    await room.save();

    if (profanity) { // checks if bad language was used
        let notif = {
            text: getRandMessage(curseResponse),
            status: 'notif'
        };

        await io.in(socket.room).emit('announcement', notif);

        const newComment = await ChatMessage.create({text: notif, status: notif.status});
        if (!newComment) {
            console.log(err);
        }

        newChatMessage.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
        await newChatMessage.save();
    }
}

module.exports = chat;