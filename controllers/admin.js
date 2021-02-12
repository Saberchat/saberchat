const Comment = require('../models/comment');

module.exports.index = async function(req, res) {
    res.render("admin/index");
}

module.exports.moderate = async function(req, res) {
    Comment.find({status: 'flagged'})
        .populate({path: 'author', select: ['username', 'imageUrl']})
        .populate({path: 'statusBy', select: ['username', 'imageUrl']})
        .populate({path: 'room', select: ['name']})
        .exec((err, foundComments) => {
            if (err) {
                req.flash('error', 'Cannot access DataBase');
                res.redirect('/admin');

            } else {
                res.render('admin/mod', {comments: foundComments});
            }
        });
}

