//LIBARIES
const dateFormat = require('dateformat');
const {sendGridEmail} = require("../services/sendGrid");
const {sortByPopularity} = require("../utils/popularity");
const {objectArrIndex, parsePropertyArray, removeIfIncluded} = require("../utils/object-operations");
const {cloudUpload, cloudDelete} = require('../services/cloudinary');
const {autoCompress} = require("../utils/image-compress");
const setup = require("../utils/setup");

//SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const {InboxMessage} = require('../models/notification');
const {Course, ChatRoom} = require('../models/group');
const {Review} = require('../models/post');

const controller = {};

controller.index = async function(req, res) {
    const platform = await setup(Platform);
    const courses = await Course.find({});
    if (!platform || !courses) {
        await req.flash('error', "Unable to find courses");
        return res.redirect('back');
    }

    let courseList = [];
    for (let course of courses) {
        if ((await course.creator.equals(req.user._id)) || (await course.members.includes(req.user._id))) {
            await courseList.push(course);
        } else {
            for (let tutor of course.tutors) {
                if (await tutor.tutor.equals(req.user._id)) {
                    await courseList.push(course);
                }
            }
        }
    }
    return res.render('tutoringCenter/index', {platform, courses: courseList, studentStatuses: platform.studentStatuses, data: platform.features[await objectArrIndex(platform.features, "route", "tutoringCenter")]});
}

controller.createCourse = async function(req, res) {
    let charSetMatrix = []; //Build unique join code for course
    await charSetMatrix.push('qwertyuiopasdfghjklzxcvbnm'.split(''));
    await charSetMatrix.push('QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
    await charSetMatrix.push('1234567890'.split(''));

    let code_length = Math.round((Math.random() * 15)) + 10;
    let joinCode = "";

    let charSet; //Which character set to choose from
    for (let i = 0; i < code_length; i++) {
        charSet = charSetMatrix[Math.floor(Math.random() * 3)];
        joinCode += charSet[Math.floor((Math.random() * charSet.length))];
    }

    const course = await Course.create({ //Create course with specified information
        name: req.body.title,
        thumbnail: {url: req.body.thumbnail, display: req.body.showThumbnail == "url"},
        joinCode,
        description: req.body.description,
        active: true,
        creator: req.user
    });

    if (!course) {
        await req.flash('error', "Unable to create course");
        return res.redirect('back');
    }

    //If thumbnail file has been uploaded, set it up with cloudinary
    if (req.files) {
        if (req.files.mediaFile) {
            const file = req.files.mediaFile[0];
            const processedBuffer = await autoCompress(file.originalname, file.buffer);
            const [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
            if (cloudErr || !cloudResult) {
                await req.flash("error", "Upload failed");
                return res.redirect("back");
            }

            course.thumbnailFile = {
                filename: cloudResult.public_id,
                url: cloudResult.secure_url,
                originalName: file.originalname,
                display: req.body.showThumbnail == "upload"
            };
            await course.save();
        }
    }
    await req.flash('success', "Successfully created course");
    return res.redirect('/tutoringCenter');
}

//Join as tutor or as student
controller.joinCourse = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

    if (req.body.bio) { //Join as tutor
        if (await req.user.tags.includes("Tutor")) {
            const course = await Course.findOne({joinCode: req.body.joincode});
            if (!course) {
                await req.flash('error', "No courses matching this join code were found.");
                return res.redirect('back');
            }

            await course.tutors.push({
                tutor: req.user,
                bio: req.body.bio,
                slots: await parseInt(req.body.slots),
                cost: await parseInt(req.body.cost),
                available: (await parseInt(req.body.slots) > 0),
                dateJoined: new Date(Date.now())
            });
            await course.save();
            await req.flash('success', `Successfully joined ${course.name} as a tutor!`);
            return res.redirect(`/tutoringCenter/${course._id}`);
        }
        await req.flash('error', `You do not have permission to do that`);
        return res.redirect(`back`);
    }

    //Join as student
    if (await platform.studentStatuses.includes(req.user.status)) {
        const course = await Course.findOne({joinCode: req.body.joincode});
        if (!course) {
            await req.flash('error', "No courses matching this join code were found.");
            return res.redirect('back');
        }

        await course.members.push(req.user);
        await course.save();
        await req.flash('success', `Successfully joined ${course.name}!`);
        return res.redirect(`/tutoringCenter/${course._id}`);
    }
    await req.flash('error', `You do not have permission to do that`);
    return res.redirect(`back`);
}

controller.showCourse = async function(req, res) {
    const platform = await setup(Platform);
    const course = await Course.findById(req.params.id).populate('creator members tutors.tutor tutors.reviews blocked');
    if (!platform || !course) {
        await req.flash('error', "Unable to find course");
        return res.redirect('back');
    }

    let studentIds = []; //Collect info on the ids of all members and tutors in the course
    let tutorIds = [];
    let tutors = [];
    for (let student of course.members) {
        await studentIds.push(await student._id.toString());
    }

    let averageRating = 0; //Collect info on tutors and their ratings
    let tutorObject = {};
    for (let tutor of course.tutors) {
        averageRating = 0;
        tutorObject = {};
        await tutorIds.push(await tutor.tutor._id.toString());
        for (let review of tutor.reviews) {
            averageRating += review.rating;
        }
        averageRating = (await Math.round(averageRating / tutor.reviews.length));
        tutorObject = tutor;
        tutorObject.averageRating = averageRating;
        await tutors.push(tutorObject)
    }

    //Sort tutors for display by two characteristics - average rating and reviews
    tutors = await sortByPopularity(tutors, "averageRating", "dateJoined", null).unpopular
    .concat(await sortByPopularity(tutors, "averageRating", "dateJoined", null).popular);

    tutors = await sortByPopularity(tutors, "reviews", "dateJoined", null).unpopular
    .concat(await sortByPopularity(tutors, "reviews", "dateJoined", null).popular);

    const teachers = await User.find({authenticated: true, status: platform.teacherStatus, _id: {$ne: req.user._id}});
    if (!teachers) {
        await req.flash('error', "Unable to find teachers");
        return res.redirect('back');
    }
    return res.render('tutoringCenter/show', {platform, course, studentIds, tutorIds, tutors, teachers, objectArrIndex, data: platform.features[await objectArrIndex(platform.features, "route", "tutoringCenter")]}); //Export function for ejs evaluation
}

controller.unenrollStudent = async function(req, res) {
    const course = await Course.findByIdAndUpdate(req.params.id, {$pull: {members: req.user._id}}).populate("tutors.tutor");
    if (!course) {
        await req.flash('error', "Unable to find course");
        return res.redirect('back');
    }

    //Remove user from all tutors they have signed up with, and delete corresponding chat rooms
    let deletedRoom;
    for (let tutor of course.tutors) {
        if (await objectArrIndex(tutor.members, "student", req.user._id) > -1) { //Update the tutor's members array
            await tutor.formerStudents.push({
                student: req.user._id,
                lessons: tutor.members[await objectArrIndex(tutor.members, "student", req.user._id)].lessons
            });
            deletedRoom = await ChatRoom.findByIdAndDelete(tutor.members[await objectArrIndex(tutor.members, "student", req.user._id)].room);
            await tutor.members.splice(await objectArrIndex(tutor.members, "student", req.user._id), 1);
            tutor.slots++;
            tutor.available = true;

            //Remove rooms from tutor/student newRoomCounts
            await removeIfIncluded(req.user.newRoomCount, deletedRoom._id);
            await req.user.save();
            await removeIfIncluded(tutor.tutor.newRoomCount, deletedRoom._id);
            await tutor.tutor.save();
        }
    }
    await course.save();
    await req.flash('success', `Unenrolled from ${course.name}!`);
    return res.redirect('/tutoringCenter');
}

controller.unenrollTutor = async function(req, res) {
    const course = await Course.findById(req.params.id).populate('tutors.tutor tutors.members.student');
    if (!course) {
        await req.flash('error', "Unable to find course");
        return res.redirect('back');
    }

    for (let i = course.tutors.length - 1; i >= 0; i--) {
        if (await course.tutors[i].tutor._id.equals(req.user._id)) { //If the selected tutor is the current user
            let deletedRoom;
            for (let student of course.tutors[i].members) {
                deletedRoom = await ChatRoom.findByIdAndDelete(student.room);
                if (!deletedRoom) {
                    await req.flash('error', "Unable to remove chat room");
                    return res.redirect('back');
                }

                //Remove rooms from tutor/student newRoomCounts
                await removeIfIncluded(student.student.newRoomCount, deletedRoom._id);
                await student.student.save();
                await removeIfIncluded(req.user.newRoomCount, deletedRoom._id);
                await req.user.save();
            }
            await course.tutors.splice(i, 1); //Remove tutor from course
            break;
        }
    }
    await course.save();
    await req.flash('success', `Unenrolled from ${course.name}!`);
    return res.redirect('/tutoringCenter');
}

controller.updateSettings = async function(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) {
        await req.flash("error", "An error occurred");
        return res.redirect("back");
    }

    for (let attr in req.body) { //Iterate through each of the data's keys and update the course with the corresponding value
        if (attr != "thumbnail" && (await req.body[attr].split(' ').join('') != '')) {course[attr] = req.body[attr];}
    }

    if ((await req.body.thumbnail.split(' ').join('')) != '') {course.thumbnail = {url: req.body.thumbnail, display: req.body.showThumbnail == "url"};}
    course.thumbnailFile.display = req.body.showThumbnail == "upload";

    //Iterate through newly uploaded thumbnail file, handle with cloudinary
    if (req.files) {
        let cloudErr;
        let cloudResult;
        if (course.thumbnailFile.filename) {
            [cloudErr, cloudResult] = await cloudDelete(course.thumbnailFile.filename, "image");
            if (cloudErr || !cloudResult) {
                await req.flash("error", "Error deleting uploaded image");
                return res.redirect("back");
            }
        }

        if (req.files.mediaFile) {
            const file = req.files.mediaFile[0];
            const processedBuffer = await autoCompress(file.originalname, file.buffer);
            [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
            if (cloudErr || !cloudResult) {
                await req.flash("error", "Upload failed");
                return res.redirect("back");
            }

            course.thumbnailFile = { //Update thumbnail display
                filename: cloudResult.public_id,
                url: cloudResult.secure_url,
                originalName: file.originalname,
                display: req.body.showThumbnail == "upload"
            };
        }
    }

    await course.save();
    await req.flash("success", "Updated course settings")
    return res.redirect(`/tutoringCenter/${course._id}`);
}

controller.deleteCourse = async function(req, res) {
    const course = await Course.findOne({_id: req.params.id, joinCode: req.body.joinCode}).populate("tutors.tutor tutors.members.student");
    if (!course) {
        await req.flash("error", "Incorrect join code");
        return res.redirect("back");
    }

    let deletedRoom;
    for (let tutor of course.tutors) { //Iterate through tutors and delete all of their rooms
        for (let student of tutor.members) {
            deletedRoom = await ChatRoom.findByIdAndDelete(student.room);
            if (!deletedRoom) {
                await req.flash("error", "Unable to find room");
                return res.redirect("back");
            }
            await removeIfIncluded(tutor.tutor.newRoomCount, student.room);
            await tutor.tutor.save();
            await removeIfIncluded(student.student.newRoomCount, student.room);
            await student.student.save();
        }
    }

    const deletedCourse = await Course.findByIdAndDelete(course._id);
    if (!deletedCourse) {
        await req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    await req.flash("success", `Deleted ${course.name}!`);
    return res.redirect("/tutoringCenter");
}

//-----------TEACHER ROUTES -----------//

controller.updateTeacher = async function(req, res) { //Update course teacher
    const course = await Course.findById(req.params.id);
    if (!course) {
        await req.flash("error", "Unable to find course");
        return res.redirect("back");
    }

    if (!(course.joinCode == req.body.joinCodeConfirm)) {
        await req.flash("error", "Join code is invalid");
        return res.redirect("back");
    }

    const newTeacher = await User.findById(req.body.teacher);
    if (!newTeacher) {
        await req.flash("error", "Error finding teacher");
        return res.redirect("back");
    }

    course.creator = newTeacher;
    await course.save();
    await req.flash("success", "Updated course teacher!");
    return res.redirect("/tutoringCenter");
}

controller.updateJoinCode = async function(req, res) {
    //Build new join code
    let charSetMatrix = [];
    await charSetMatrix.push('qwertyuiopasdfghjklzxcvbnm'.split(''));
    await charSetMatrix.push('QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
    await charSetMatrix.push('1234567890'.split(''));

    let code_length = Math.round((Math.random() * 15)) + 10;
    let joinCode = "";

    let charSet;
    for (let i = 0; i < code_length; i++) {
        charSet = charSetMatrix[Math.floor(Math.random() * 3)];
        joinCode += charSet[Math.floor((Math.random() * charSet.length))];
    }

    const course = await Course.findById(req.params.id);
    if (!course) {return res.json({error: "An Error Occurred"});}

    course.joinCode = joinCode;
    await course.save();
    return res.json({success: "Succesfully Updated Join Code", joinCode});
}

controller.removeStudent = async function(req, res) {
    const studentId = await User.findById(req.body.studentId);
    const course = await Course.findById(req.params.id).populate('tutors.tutor tutors.members.student');
    if (!studentId || !course) {return res.json({error: "Error removing student"});}

    let deletedRoom;
    for (let tutor of course.tutors) { //Iterate through tutors and remove the student
        if (await objectArrIndex(tutor.members, "student", studentId._id, "_id") > -1) {
            await tutor.formerStudents.push({ //Add student to list of former studnts
                student: studentId._id,
                lessons: tutor.members[await objectArrIndex(tutor.members, "student", studentId._id, "_id")].lessons
            });
            deletedRoom = await ChatRoom.findByIdAndDelete(tutor.members[await objectArrIndex(tutor.members, "student", studentId._id, "_id")].room);
            if (!deletedRoom) {return res.json({error: "Error removing room"});}

            //Update newRoomCount for student and tutor, and remove student from list of tutor's current members
            await removeIfIncluded(studentId.newRoomCount, deletedRoom._id);
            await studentId.save();
            await removeIfIncluded(tutor.tutor.newRoomCount, deletedRoom._id);
            await tutor.tutor.save();
            await tutor.members.splice(await objectArrIndex(tutor.members, "student", studentId._id, "_id"), 1);
        }
    }

    const notif = await InboxMessage.create({  //Create a notification to alert the student that they have been blocked
        subject: `Removal from ${course.name}`,
        text: `You were removed from ${course.name} for the following reason:\n"${req.body.reason}"`,
        author: req.user,
        noReply: true,
        recipients: [studentId._id],
        read: [],
        images: []
    });
    if (!notif) {return res.json({error: "Error removing student"});}

    notif.date = await dateFormat(notif.created_at, "h:MM TT | mmm d");
    await notif.save()
    await studentId.inbox.push({message: notif, new: true});
    await studentId.save();
    if (studentId.receiving_emails) {
        await sendGridEmail(studentId.email, `Removal from ${course.name}`, `<p>Hello ${studentId.firstName},</p><p>${notif.text}</p>`, false);
    }
    await course.blocked.push(studentId);
    await removeIfIncluded(course.members, studentId._id); //Remove student
    await course.save();
    return res.json({success: "Succesfully removed student", student: studentId, course});
}

controller.removeTutor = async function(req, res) { //Remove tutor from course
    let tutorId;
    if (req.body.show) {
        tutorId = await User.findById(req.body.tutorId);
        if (!tutorId) {return res.json({error: "Error removing tutor"});}
    } else {
        tutorId = await User.findById(req.query.tutorId);
        if (!tutorId) {
            await req.flash("error", "Error removing tutor");
            return res.redirect("back");
        }
    }

    const course = await Course.findById(req.params.id).populate('tutors.tutor tutors.members.student');
    if (!course) {
        if (req.body.show) {return res.json({error: "Error removing tutor"});
        } else {
            await req.flash("error", "Error removing tutor");
            return res.redirect("back");
        }
    }

    for (let i = 0; i < course.tutors.length; i++) {
        if (await course.tutors[i].tutor._id.equals(tutorId._id)) {
            let deletedRoom;
            for (let student of course.tutors[i].members) { //For all of the tutor's rooms, remove room and update members' new room counts
                deletedRoom = await ChatRoom.findByIdAndDelete(student.room);
                if (!deletedRoom) {
                    if (req.body.show) {return res.json({error: "Error removing tutor"});
                    } else {
                        await req.flash("error", "Error removing tutor");
                        return res.redirect("back");
                    }
                }
                await removeIfIncluded(student.student.newRoomCount, deletedRoom._id);
                await student.student.save();
                await removeIfIncluded(tutorId.newRoomCount, deletedRoom._id);
                await tutorId.save();
            }

            const notif = await InboxMessage.create({ //Create a notification to alert tutor that they have been removed
                subject: `Removal from ${course.name}`,
                text: `You were removed from ${course.name} for the following reason:\n"${req.body.reason}"`,
                author: req.user,
                noReply: true,
                recipients: [tutorId._id],
                read: [],
                images: []
            });

            if (!notif) {
                if (req.body.show) {
                    return res.json({error: "Error removing tutor"});
                } else {
                    await req.flash("error", "Error removing tutor");
                    return res.redirect("back");
                }
            }
            notif.date = await dateFormat(notif.created_at, "h:MM TT | mmm d");
            await notif.save();

            await tutorId.inbox.push({message: notif, new: true});
            await tutorId.save();
            if (tutorId.receiving_emails) {
                await sendGridEmail(tutorId.email, `Removal from ${course.name}`, `<p>Hello ${tutorId.firstName},</p><p>${notif.text}</p>`, false);
            }

            await course.blocked.push(tutorId); //Remove tutor and block them
            await course.tutors.splice(i, 1);
            await course.save();

            if (req.body.show) {return res.json({success: "Succesfully removed tutor", tutor: tutorId, course});
            } else {
                await req.flash("success", "Succesfully Removed Tutor!");
                return res.redirect(`/tutoringCenter/${course._id}`);
            }
        }
    }
}

controller.unblock = async function(req, res) { //Unblock a previously blocked user
    const blockedId = await User.findById(req.body.blockedId);
    const course = await Course.findById(req.params.id);

    if (!blockedId || !course) {return res.json({error: "Unable to access course"});}
    if (!(await course.blocked.includes(blockedId._id))) {return res.json({error: "User is not blocked from this course"});} //If the user is not blocked, they cannot be unblocked
    
    await removeIfIncluded(course.blocked, blockedId._id); //Unblock user
    await course.save();
    const notif = await InboxMessage.create({  //Create a notification to alert the user
        subject: `Unblocked from ${course.name}`,
        text: `You have been unblocked from ${course.name}. You can rejoin with the join code now whenever you need to.`,
        author: req.user,
        noReply: true,
        recipients: [blockedId._id],
        read: [],
        images: []
    });
    if (!notif) {return res.json({error: "Error removing student"});}

    notif.date = await dateFormat(notif.created_at, "h:MM TT | mmm d");
    await notif.save();

    await blockedId.inbox.push({message: notif, new: true});
    await blockedId.save();
    if (blockedId.receiving_emails) {
        await sendGridEmail(blockedId.email, `Removal from ${course.name}`, `<p>Hello ${blockedId.firstName},</p><p>${notif.text}</p>`, false);
    }
    return res.json({success: "Succesfully unblocked user", blocked: blockedId, course});
}

//-----------TUTOR ROUTES -----------//

controller.markPayment = async function(req, res) {
    const platform = await setup(Platform);
    const course = await Course.findById(req.params.id);
    if (!platform || !course) {return res.json({error: "Unable to find course"});}

    for (let tutor of course.tutors) {
        if (await tutor.tutor.equals(req.user._id)) {
            for (let student of tutor.members) {
                if (await student.student.equals(req.body.studentId)) {
                    if (student.lessons[req.body.index]) {
                        student.lessons[req.body.index].paid = !student.lessons[req.body.index].paid;
                        await course.save();

                        let cost = 0;
                        let time = 0;
                        let costString;
                        for (let lesson of student.lessons) {
                            if (lesson.approved) {time += lesson.time;
                                if (!lesson.paid) {cost += (lesson.time/60)*tutor.cost;}
                            }
                        }
                        if (platform.purchasable) {costString = (await cost.toFixed(2));
                        } else {costString = cost;}
                        return res.json({success: "Successfully changed", time, cost: costString});
                    }
                }
            }
            return res.json({error: "Student not found"});
        }
    }
    return res.json({error: "Tutor not found"});
}

controller.updateBio = async function(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) {return res.json({error: "Unable to find course"});}

    for (let tutor of course.tutors) { //Iterate through tutors and search for current user
        if (await tutor.tutor.equals(req.user._id)) {
            tutor.bio = req.body.bio;
            await course.save();
            return res.json({success: "Successfully changed"})
        }
    }
}

controller.closeLessons = async function(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) {return res.json({error: "Error closing lessons"});}

    for (let tutor of course.tutors) {
        if (await tutor.tutor.equals(req.user._id)) { //If the selected tutor matches the current user, shut down availability
            tutor.available = false;
            await course.save();
            return res.json({success: "Successfully closed lessons"});
        }
    }
}

controller.reopenLessons = async function(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) {return res.json({error: "Error closing lessons"});}

    for (let tutor of course.tutors) {
        if (await tutor.tutor.equals(req.user._id)) { //If the selected tutor matches the current user, reopen availability
            tutor.available = true;
            await course.save();
            return res.json({success: "Successfully closed lessons"});
        }
    }
}

controller.setStudents = async function(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) {return res.json({error: "Error accessing course"});}

    for (let tutor of course.tutors) { //Search through tutors to find requested tutor
        if (await tutor.tutor.equals(req.user._id)) {
            tutor.slots = await parseInt(req.body.slots) - tutor.members.length; //Update slots based on data
            if ((await parseInt(req.body.slots) - tutor.members.length) == 0) { //Update availability based on new slot info
                tutor.available = false;
            }
            await course.save();
            return res.json({success: "Succesfully changed", tutor});
        }
    }
    return res.json({error: "Unable to find tutor"});
}

controller.setCost = async function(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) {return res.json({error: "Error accessing course"});}

    for (let tutor of course.tutors) { //Search through tutors to find requested tutor
        if (await tutor.tutor.equals(req.user._id)) {
            tutor.cost = await parseInt(req.body.cost);
            await course.save();
            return res.json({success: "Succesfully changed", tutor});
        }
    }
    return res.json({error: "Unable to find tutor"});
}

controller.markLesson = async function(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) {return res.json({error: "Error accessing course"});}

    const newLesson = {
        time: await parseInt(req.body.time),
        date: await dateFormat(new Date(), "mmm d"),
        summary: req.body.summary
    };

    //Find specific tutor and add lesson for their student
    for (let tutor of course.tutors) {
        if (await tutor.tutor.equals(req.user._id)) {
            let lessons = [];
            for (let student of tutor.members) {
                for (let lesson of student.lessons) {await lessons.push(lesson);}
                if (await student.student.equals(req.body.studentId)) {
                    await student.lessons.push(newLesson);
                    await lessons.push(newLesson);
                    await course.save();
                    return res.json({success: "Succesfully updated", tutor, lessons});
                }
            }
        }
    }
}

//-----------STUDENT ROUTES -----------//

controller.bookTutor = async function(req, res) {
    const course = await Course.findById(req.params.id).populate('tutors.tutor');
    if (!course) {return res.json({error: "Error accessing course"});}

    let formerStudent = false;
    for (let tutor of course.tutors) { //Iterate through tutors and search for the corresponding one
        if (await tutor.tutor._id.equals(req.body.tutorId) && tutor.available) {
            if (await objectArrIndex(tutor.formerStudents, "student", req.user._id) > -1) { //Remove student from tutor's former members (if they were there)
                formerStudent = true;
                await tutor.formerStudents.splice(await objectArrIndex(tutor.formerStudents, "student", req.user._id), 1);
            }

            tutor.slots--;
            tutor.available = (tutor.slots != 0);

            const room = await ChatRoom.create({ //Create chat room between student and tutor
                name: `${req.user.firstName}'s Tutoring Sessions With ${tutor.tutor.firstName} - ${course.name}`,
                creator: tutor.tutor._id,
                members: [req.user._id, tutor.tutor._id],
                private: true,
                mutable: false
            });
            if (!room) {return res.json({error: "Error creating room"});}

            room.date = await dateFormat(room.created_at, "h:MM TT | mmm d");
            await room.save();
            await tutor.tutor.newRoomCount.push(room._id);
            await req.user.newRoomCount.push(room._id);
            await tutor.tutor.save();
            await req.user.save();

            const studentObject = {
                student: req.user._id,
                lessons: [],
                room: room._id
            }
            await tutor.members.push(studentObject);
            await course.save();

            if (tutor.tutor.receiving_emails) {
                await sendGridEmail(tutor.tutor.email, `New student in ${course.name}`, `<p>Hello ${tutor.tutor.firstName},</p><p>${req.user.username} has signed up as your student in ${course.name}.</p>`, false);
            }

            //All current members of the tutor
            const studentIds = await User.find({authenticated: true, _id: {$in: await parsePropertyArray(tutor.members, "student")}});
            if (!studentIds) {return res.json({error: "Error accessing members"});}

            //All former members of the tutor
            const formerStudents = await User.find({authenticated: true, _id: {$in: await parsePropertyArray(tutor.formerStudents, "student")}});
            if (!formerStudents) {return res.json({error: "Error accessing members"});}

            return res.json({
                success: "Succesfully joined tutor", user: req.user,
                room: studentObject,  tutor,  formerStudent, 
                members: studentIds, formerStudents
            });
        }
    }
}

controller.leaveTutor = async function(req, res) {
    const course = await Course.findById(req.params.id).populate('tutors.tutor');
    if (!course) {return res.json({error: "Error accessing course"});}

    let deletedRoom;
    for (let tutor of course.tutors) { //If the selected tutor is the one being left, and the user is a student of that tutor, leave
        if (await tutor.tutor._id.equals(req.body.tutorId)) {
            if (await objectArrIndex(tutor.members, "student", req.user._id) > -1) {
                deletedRoom = await ChatRoom.findByIdAndDelete(tutor.members[await objectArrIndex(tutor.members, "student", req.user._id)].room);
                if (!deletedRoom) {return res.json({error: "Error deleting room"});}

                //Remove room, add student to tutor's former members
                await removeIfIncluded(tutor.tutor.newRoomCount, tutor.members[await objectArrIndex(tutor.members, "student", req.user._id)].room);
                await tutor.tutor.save();
                await removeIfIncluded(req.user.newRoomCount, tutor.members[await objectArrIndex(tutor.members, "student", req.user._id)].room)
                await req.user.save();
                if (await objectArrIndex(tutor.formerStudents, "student", req.user._id) == -1) {
                    await tutor.formerStudents.push({
                        student: req.user._id,
                        lessons: tutor.members[await objectArrIndex(tutor.members, "student", req.user._id).lessons]
                    });
                }
                await tutor.members.splice(await objectArrIndex(tutor.members, "student", req.user._id), 1);
                tutor.slots++;
                tutor.available = true;

                await course.save();
                return res.json({success: "Succesfully left tutor", user: req.user});
            } else {return res.json({error: "You are not a student of this tutor"});}
        }
    }
}

controller.upvoteTutor = async function(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) {return res.json({error: "Error upvoting tutor"});}

    for (let tutor of course.tutors) {
        if (await tutor.tutor.equals(req.body.tutorId)) { //Search for tutor until they are found
            if (await objectArrIndex((await tutor.members.concat(tutor.formerStudents), "student", req.user._id) > -1)) { //Only current/former members of a tutor can upvote them
                if (await removeIfIncluded(tutor.upvotes, req.user._id)) { //If tutor is currently upvoted by this user, downvote them
                    await course.save();
                    return res.json({success: "Downvoted tutor", upvoteCount: tutor.upvotes.length});
                }
                await tutor.upvotes.push(req.user._id);
                await course.save();
                return res.json({success: "Upvoted tutor", upvoteCount: tutor.upvotes.length});
            }
            return res.json({error: "You are not a student of this tutor"});
        }
    }
}

controller.rateTutor = async function(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) {return res.json({error: "Error reviewing tutor"});}

    for (let tutor of course.tutors) {
        if (await tutor.tutor.equals(req.body.tutorId)) {
            if (await objectArrIndex(await tutor.members.concat(tutor.formerStudents), "student", req.user._id) > -1) { //Only current/former members of a tutor can upvote them
                const review = await Review.create({text: req.body.text.split('<').join('&lt'), sender: req.user, rating: req.body.rating}); //Create comment with review
                if (!review) {return res.json({error: "Error reviewing tutor"});}

                review.date = await dateFormat(review.created_at, "h:MM TT | mmm d");
                await review.save();
                await tutor.reviews.push(review);
                await course.save();

                let averageRating = 0;
                for (let review of tutor.reviews) {averageRating += review.rating;}

                //Update tutor's average rating based on new rating
                averageRating = Math.round(averageRating / tutor.reviews.length);
                return res.json({
                    success: "Succesfully upvoted tutor",
                    averageRating, review,
                    reviews_length: tutor.reviews.length,
                    user: req.user
                });
            }
            return res.json({error: "You are not a student of this tutor"});
        }
    }
}

controller.likeReview = async function(req, res) {
    const review = await Review.findById(req.params.id);
    if (!review) {return res.json({error: "Error accessing review"});}

    if (await removeIfIncluded(review.likes, req.user._id)) { //If user has liked this review, remove a like
        await review.save();
        return res.json({success: "Removed a like", likeCount: review.likes.length, review});
    }
    
    await review.likes.push(req.user._id);
    await review.save();
    return res.json({success: "Liked", likeCount: review.likes.length});
}

controller.approveLesson = async function(req, res) { //Approve lesson as user
    const platform = await setup(Platform);
    const course = await Course.findById(req.params.id);
    if (!platform || !course) { return res.json({error: "Unable to find course"});}
    for (let tutor of course.tutors) {
        if (await tutor.tutor.equals(req.body.tutorId)) { //Iterate through tutors until correct user has been found
            for (let student of tutor.members) {
                if (await student.student.equals(req.user._id)) { //Iterate through tutor's students until correct user has been found
                    if (student.lessons[req.body.index]) {
                        student.lessons[req.body.index].approved = !student.lessons[req.body.index].approved; //Mark lesson as approved
                        await course.save();

                        let cost = 0;
                        let time = 0;
                        let costString;
                        for (let lesson of student.lessons) {
                            if (lesson.approved) {
                                time += lesson.time;
                                if (!lesson.paid) {cost += (lesson.time/60)*tutor.cost;}
                            }
                        }
                        if (platform.dollarPayment) {costString = await cost.toFixed(2);
                        } else {costString = cost;}
                        return res.json({success: "Successfully changed", time, cost: costString});
                    }
                }
            }
            return res.json({error: "Student not found"});
        }
    }
    return res.json({error: "Tutor not found"});
}

//----OTHER----//

controller.showTutor = async function(req, res) {
    const platform = await setup(Platform);
    const course = await Course.findById(req.params.id).populate("tutors.tutor tutors.members.student tutors.formerStudents.student").populate({
        path: "tutors.reviews",
        populate: {path: "sender"}
    });
    if (!platform || !course) {
        await req.flash('error', "Unable to find course");
        return res.redirect('back');
    }

    let tutorIds = [];
    for (let tutor of course.tutors) {await tutorIds.push(await tutor.tutor._id.toString());}
    let courseStudents = [];
    for (let student of course.members) {await courseStudents.push(await student.toString());}

    for (let tutor of course.tutors) {
        if (await tutor.tutor._id.equals(req.query.tutorId)) {
            let studentIds = []; //Collect info on all course members 
            for (let student of course.members) {await studentIds.push(await student.toString());}

            let enrolledCourses = []; //Collect all courses which this tutor teaches (that are not the current one)
            const courses = await Course.find({_id: {$ne: course._id}}).populate("creator");
            if (!courses) {
                await req.flash('error', "Unable to find courses");
                return res.redirect('back');
            }

            for (let c of courses) {
                for (let t of c.tutors) {
                    if (await t.tutor.equals(tutor.tutor._id)) {await enrolledCourses.push(c);}
                }
            }

            let averageRating = 0; //Calculate tutor's average rating
            for (let review of tutor.reviews) {averageRating += review.rating;}
            averageRating = Math.round(averageRating / tutor.reviews.length);
            
            //Collect info on all members who are members of this tutor
            const members = await User.find({authenticated: true, _id: {$in: await parsePropertyArray(tutor.members, "student")}});
            if (!members) {
                await req.flash('error', "Unable to find members");
                return res.redirect('back');
            }

            let lessonMap = new Map(); //Track all lessons of this tutor's members
            let time = 0;
            let costMap = new Map();
            let cost = 0;
            for (let student of (await tutor.members.concat(tutor.formerStudents))) {
                time = 0;
                cost = 0;
                for (let lesson of student.lessons) {
                    if (lesson.approved) {
                        time += lesson.time;
                        if (!lesson.paid) {cost += (lesson.time/60)*tutor.cost;}
                    }
                }
                await lessonMap.set((await student.student._id.toString()), time);
                if (platform.dollarPayment) {await costMap.set((await student.student._id.toString()), (await cost.toFixed(2)));
                } else {await costMap.set((await student.student._id.toString()), cost);}
            }

            if (req.query.studentId) { //If query is to show a tutor's lessons with a specific student
                const allStudents = await (tutor.members.concat(tutor.formerStudents));
                if (await objectArrIndex(allStudents, "student", req.query.studentId, "_id") > -1) {
                    //Check that user is either a student of this tutor, this tutor, or the course's teacher
                    if (allStudents[await objectArrIndex(allStudents, "student", req.query.studentId, "_id")].student._id.equals(req.user._id) || (await tutor.tutor._id.equals(req.user._id)) || (await course.creator.equals(req.user._id))) {
                        return res.render('tutoringCenter/lessons', {
                            platform, course, tutor, student: allStudents[await objectArrIndex(allStudents, "student", req.query.studentId, "_id")], objectArrIndex,
                            time: await lessonMap.get(allStudents[await objectArrIndex(allStudents, "student", req.query.studentId, "_id")].student._id.toString()), 
                            cost: await costMap.get(allStudents[await objectArrIndex(allStudents, "student", req.query.studentId, "_id")].student._id.toString()),
                            data: platform.features[await objectArrIndex(platform.features, "route", "tutoringCenter")]
                        });
                    }
                    await req.flash('error', "You do not have permission to view that student");
                    return res.redirect('back');
                }
                
                await req.flash('error', "You do not have permission to view that student");
                return res.redirect('back');
            }

            return res.render('tutoringCenter/tutor-show', {
                platform, course, tutor, students: members, studentIds, averageRating,
                lessons: lessonMap, courses: enrolledCourses, objectArrIndex,
                data: platform.features[await objectArrIndex(platform.features, "route", "tutoringCenter")]
            });
        }
    }
}

module.exports = controller;