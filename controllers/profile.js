const User = require('../models/user');
const {sendGridEmail} = require("../services/sendGrid");
const {multipleUpload} = require('../middleware/multer');

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

module.exports.id = async function(req, res) {
    const user = await User.findById(req.params.id).populate('followers');

    if (!user) {
        req.flash('error', 'Error. Cannot find user.');
        return res.redirect('back');
    }

    let followerIds = [];
    let following = [];
    let currentUserFollowing = [];

    for (let follower of user.followers) {
        followerIds.push(follower._id);
    }

    const users = await User.find({authenticated: true});

    for (let u of users) {
        if (u.followers.includes(user._id)) {
            following.push(u);
        }

        if (u.followers.includes(req.user._id)) {
            currentUserFollowing.push(u);
        }
    }

    const convertedDescription = convertToLink(user.description);
    res.render('profile/show', {user, following, followerIds, convertedDescription});
}

module.exports.profilePut = async function(req, res) {
    const overlap = await User.find({
        authenticated: true,
        username: filter.clean(req.body.username),
        _id: {$ne: req.user._id}
    });
    if (!overlap) {
        req.flash('error', "Unable to find users");
        return res.redirect('back');

    } else if (overlap.length > 0) {
        req.flash('error', "Another user already has that username.");
        return res.redirect('back');
    }

    let status;
    if (req.body.status == '') {
        status = req.user.status;
    } else {
        status = req.body.status;
    }

    let user = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        username: filter.clean(req.body.username),
        description: filter.clean(req.body.description),
        title: filter.clean(req.body.title),
        status: status.toLowerCase(),
        imageFile: {
            url: req.user.imageFile.url,
            filename: req.user.imageFile.filename,
            display: req.body.showProfileImage == "upload"
        },
        bannerFile: {
            url: req.user.bannerFile.url,
            filename: req.user.bannerFile.filename,
            display: req.body.showBannerImage == "upload"
        },
    };

    if (req.body.imageUrl) {
        user.imageUrl = {
            url: req.body.imageUrl,
            display: req.body.showProfileImage == "url"
        };
    }
    if (req.body.bannerUrl) {
        user.bannerUrl = {
            url: req.body.bannerUrl,
            display: req.body.showBannerImage == "url"
        };
    }

    if (req.files) {
        let cloudErr;
        let cloudResult;
        if (req.files.imageFile) {
            if (req.user.imageFile.filename) {
                [cloudErr, cloudResult] = await cloudDelete(req.user.imageFile.filename, "image");
                if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                    req.flash('error', 'Error deleting uploaded image');
                    return res.redirect('back');
                }
            }
            [cloudErr, cloudResult] = await cloudUpload(req.files.imageFile[0], "image");
            if (cloudErr || !cloudResult) {
                req.flash('error', 'Upload failed');
                return res.redirect('back');
            }
            user.imageFile = {
                filename: cloudResult.public_id,
                url: cloudResult.secure_url,
                originalName: req.files.imageFile[0].originalname,
                display: req.body.showProfileImage == "upload"
            };
        }

        if (req.files.imageFile2) {
            if (req.user.bannerFile.filename) {
                [cloudErr, cloudResult] = await cloudDelete(req.user.bannerFile.filename, "image");
                if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                    req.flash('error', 'Error deleting uploaded image 1');
                    return res.redirect('back');
                }
            }

            [cloudErr, cloudResult] = await cloudUpload(req.files.imageFile2[0], "image");
            if (cloudErr || !cloudResult) {
                req.flash('error', 'Upload failed');
                return res.redirect('back');
            }
            user.bannerFile = {
                filename: cloudResult.public_id,
                url: cloudResult.secure_url,
                originalName: req.files.imageFile2[0].originalname,
                display: req.body.showBannerImage == "upload"
            };
        }
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, user); //find and update the user with new info
    if (!updatedUser) {
        req.flash('error', 'There was an error updating your profile');
        return res.redirect('back');
    }

    if (updatedUser.receiving_emails) {
        await sendGridEmail(updatedUser.email, 'Profile Update Confirmation', `<p>Hello ${updatedUser.firstName},</p><p>You are receiving this email because you recently made changes to your Saberchat profile.\n\nIf you did not recently make any changes, contact a faculty member immediately.</p>`, false);
    }

    req.flash('success', 'Updated your profile');
    return res.redirect(`/profiles/${req.user._id}`);
}

module.exports.tagPut = async function(res, req) {
    if (req.user.tags.includes(req.body.tag)) {
        req.user.tags.splice(req.user.tags.indexOf(req.body.tag), 1);
        req.user.save();
        res.json({success: "Succesfully removed status", tag: req.body.tag, user: req.user._id});

    } else {
        req.user.tags.push(req.body.tag);
        req.user.save();
        res.json({success: "Succesfully added status", tag: req.body.tag, user: req.user._id});
    }
}

module.exports.changeEmailPut = async function(res, req) {
    if (req.body.receiving_emails) {
        req.user.receiving_emails = true;
        await req.user.save();

    } else {
        req.user.receiving_emails = false;
        await req.user.save();
    }

    if (req.user.email == req.body.email) {
        req.flash('success', "Email sending settings updated");
        return res.redirect(`/profiles/${req.user._id}`);

    } else {
        const emails = await Email.find({address: req.body.email, version: "whitelist"});

        if (!emails) {
            req.flash('error', "Unable to find emails");
            return res.redirect('back');

        } else if (emails.length == 0 && req.body.email.split("@")[1] != "alsionschool.org") {
            req.flash('error', "New email must be an Alsion-verified email");
            return res.redirect('back');
        }

        const overlap = await User.find({authenticated: true, email: req.body.email, _id: {$ne: req.user._id}});

        if (!overlap) {
            req.flash('error', "Unable to find users");
            return res.redirect('back');

        } else if (overlap.length > 0) {
            req.flash('error', "Another user already has that email.");
            return res.redirect('back');
        }

        const url = process.env.SENDGRID_BASE_URL + '/mail/send';
        const data = {
            "personalizations": [
                {
                    "to": [
                        {
                            "email": req.body.email
                        }
                    ],
                    "subject": 'Profile Update Confirmation'
                }
            ],
            "from": {
                "email": "noreply.saberchat@gmail.com",
                "name": "SaberChat"
            },
            "content": [
                {
                    "type": "text/html",
                    "value": `<p>Hello ${req.user.firstName},</p><p>You are receiving this email because you recently requested to change your Saberchat email to ${req.body.email}.</p><p>Click <a href="https://alsion-saberchat.herokuapp.com/profiles/confirm-email/${req.user._id}?token=${req.user.authenticationToken}&email=${req.body.email}">this link</a> to confirm your new email address.`
                }
            ]
        }

        axios({
            method: 'post',
            url: url,
            data: data,
            headers: {
                "Authorization": "Bearer " + process.env.SENDGRID_KEY
            }
        }).then(response => {
            console.log(`Email Sent with status code: ${response.status}`);
        }).catch(error => {
            console.log(error);
        });

        req.flash('success', 'Go to your new email to confirm new address');
        return res.redirect('/profiles/change-login-info');
    }
}

module.exports.confirmEmailID = async function(req, res) {
    User.findById(req.params.id, (err, user) => {
        if (err || !user) {
            req.flash('error', "Unable to find user");
            res.redirect('back');

        } else {

            //Update authentication token
            let charSetMatrix = [];

            charSetMatrix.push('qwertyuiopasdfghjklzxcvbnm'.split(''));
            charSetMatrix.push('QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
            charSetMatrix.push('1234567890'.split(''));
            charSetMatrix.push('()%!~$#*[){]|,.<>');

            let tokenLength = Math.round((Math.random() * 15)) + 15;
            let token = "";

            let charSet; //Which character set to choose from

            for (let i = 0; i < tokenLength; i += 1) {
                charSet = charSetMatrix[Math.floor(Math.random() * 4)];
                token += charSet[Math.floor((Math.random() * charSet.length))];
            }

            if (req.query.token.toString() == user.authenticationToken) {
                user.email = req.query.email;
                user.authenticationToken = token;
                user.save();

                sendGridEmail(user, 'Email Update Confirmation', `<p>Hello ${user.firstName},</p><p>You are receiving this email because you recently made changes to your Saberchat email. This is a confirmation of your profile.</p><p>Your username is ${user.username}.</p><p>Your full name is ${user.firstName} ${user.lastName}.</p><p>Your email is ${user.email}.</p>`, false);
                req.flash('success', "Email updated!")
                res.redirect('/');

            } else {
                req.flash('error', "Invalid authentication token");
                res.redirect('/');
            }
        }
    });
}

module.exports.changePasswordPut = async function(req, res) {
    if (req.body.newPassword == req.body.newPasswordConfirm) {
        User.findById(req.user._id, (err, user) => {
            if (err || !user) {
                req.flash('error', 'Error, cannot find user');
                res.redirect('/');

            } else {
                user.changePassword(req.body.oldPassword, req.body.newPassword, (err) => {
                    if (err) {
                        req.flash('error', 'Error changing your password. Check if old password is correct.');
                        res.redirect('/');

                    } else {
                        sendGridEmail(req.user.email, 'Password Update Confirmation', `<p>Hello ${req.user.firstName},</p><p>You are receiving this email because you recently made changes to your Saberchat password. This is a confirmation of your profile.\n\nYour username is ${req.user.username}.\nYour full name is ${req.user.firstName} ${req.user.lastName}.\nYour email is ${req.user.email}\n\nIf you did not recently change your password, reset it immediately and contact a faculty member.</p>`, false);
                        req.flash('success', 'Successfully changed your password');
                        res.redirect('/profiles/' + req.user._id);
                    }
                });
            }
        });

    } else {
        req.flash('error', "Passwords do not match");
        res.redirect('back');
    }
}

module.exports.followID = async function(req, res) {
    User.findById(req.params.id, (err, user) => {
        if (err || !user) {
            res.json({error: "Error finding user"});

        } else if (user.followers.includes(req.user._id)) {
            res.json({error: "You are already following this user"});

        } else if (user._id.equals(req.user._id)) {
            res.json({error: "You may not follow yourself"});

        } else {
            user.followers.push(req.user);
            user.save();
            res.json({success: "Succesfully followed user", user: req.user});
        }
    });
}

module.exports.unfollowID = async function(req, res) {
    User.findById(req.params.id, (err, user) => {
        if (err || !user) {
            res.json({error: "Error finding user"});

        } else {
            let index = -1;
            for (let i = 0; i < user.followers.length; i++) {
                if (user.followers[i].equals(req.user._id)) {
                    index = i;
                }
            }

            if (index > -1) {
                user.followers.splice(index, 1);
                user.save();
                res.json({success: "Unfollowed user", user: req.user});

            } else {
                res.json({error: "You are not following this user"});
            }
        }
    });
}

module.exports.removeID = async function(req, res) {
    User.findById(req.params.id, (err, user) => {
        if (err || !user) {
            res.json({error: "Error finding user"});

        } else {
            if (req.user.followers.includes(user._id)) {
                req.user.followers.splice(req.user.followers.indexOf(user._id), 1);
                req.user.save();
                res.json({success: "Succesfully removed user"});

            } else {
                res.json({error: "User is not following you"});
            }
        }
    });
}