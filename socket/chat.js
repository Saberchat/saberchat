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
    const curseResponse = [ // list of responses to bad words
        "Please Don't curse. Let's keep things family-friendly.",
        "Give the word filter a break! Don't curse.",
        "Not cool. Very not cool.",
        "Come on. Be friendly."
    ];

    let profanity;
    if (msg.text != filter.clean(msg.text)) { // clean the message
        msg.text = filter.clean(msg.text);
        profanity = true;
    }

    const room = await ChatRoom.findById(socket.room);
    if (!room) {return console.log(err);}

    const comment = await ChatMessage.create({text: msg.text, author: msg.authorId});
    if (!comment) {return console.log(err);}

    msg.id = comment._id;
    await socket.to(socket.room).emit('chat message', msg); // broadcast message to all connected users in the room
    comment.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
    await comment.save();
    await room.comments.push(comment._id);
    await room.save();

    if (profanity) { // checks if bad language was used        
        let notif = {text: curseResponse[Math.floor(Math.random() * curseResponse.length)], status: 'notif'};
        await io.in(socket.room).emit('announcement', notif);

        const newComment = await ChatMessage.create({text: notif, status: notif.status});
        if (!newComment) {console.log(err);}

        newChatMessage.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
        await newChatMessage.save();
    }
}

module.exports = chat;
