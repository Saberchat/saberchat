const User = require('../models/user');

module.exports.index = async function(req, res) {
    const users = await User.find({authenticated: true});
    if (!users) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }

    return res.render("profile/index", {users});
}

module.exports.edit = async function(req, res) {
    res.render('profile/edit');
}

module.exports.changeLoginInfo = async function(req, res) {
    res.render('profile/edit_pwd_email');
}

