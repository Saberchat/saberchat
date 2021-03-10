const dateFormat = require('dateformat');
const {sendGridEmail} = require("../services/sendGrid");
const {sortByPopularity} = require("../utils/popularity");
const {objectArrIndex, parsePropertyArray, removeIfIncluded} = require("../utils/object-operations");
const {cloudUpload, cloudDelete} = require('../services/cloudinary');
const platformInfo = require("../platform-data");

const User = require('../models/user');
const Notification = require('../models/inbox/message');
const Course = require('../models/homework/course');
const PostComment = require('../models/postComment');
const Room = require('../models/chat/room');

if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const controller = {};
const platform = platformInfo[process.env.PLATFORM];

controller.index = async function(req, res) {
    const courses = await Course.find({});
    if (!courses) {
        req.flash('error', "Unable to find courses");
        return res.redirect('back');
    }

    let courseList = [];
    for (let course of courses) {
        if ((course.teacher.equals(req.user._id)) || (course.students.includes(req.user._id))) {
            courseList.push(course);
        } else {
            for (let tutor of course.tutors) {
                if (tutor.tutor.equals(req.user._id)) {
                    courseList.push(course);
                }
            }
        }
    }
    return res.render('homework/index', {courses: courseList});
}

controller.createCourse = async function(req, res) {
    let charSetMatrix = []; //Build unique join code for course
    charSetMatrix.push('qwertyuiopasdfghjklzxcvbnm'.split(''));
    charSetMatrix.push('QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
    charSetMatrix.push('1234567890'.split(''));

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
        teacher: req.user
    });

    if (!course) {
        req.flash('error', "Unable to create course");
        return res.redirect('back');
    }

    //If thumbnail file has been uploaded, set it up with cloudinary
    if (req.files) {
        if (req.files.mediaFile) {
            let [cloudErr, cloudResult] = await cloudUpload(req.files.mediaFile[0], "image");
            if (cloudErr || !cloudResult) {
                req.flash("error", "Upload failed");
                return res.redirect("back");
            }

            course.thumbnailFile = {
                filename: cloudResult.public_id,
                url: cloudResult.secure_url,
                originalName: req.files.mediaFile[0].originalname,
                display: req.body.showThumbnail == "upload"
            };
            await course.save();
        }
    }
    req.flash('success', "Successfully created course");
    return res.redirect('/homework');
}

//Join as tutor or as student
controller.joinCourse = async function(req, res) {
    if (req.body.bio) { //Join as tutor
        if (req.user.tags.includes("Tutor")) {
            const course = await Course.findOne({joinCode: req.body.joincode});
            if (!course) {
                req.flash('error', "No courses matching this join code were found.");
                return res.redirect('back');
            }

            course.tutors.push({
                tutor: req.user,
                bio: req.body.bio,
                slots: parseInt(req.body.slots),
                available: (parseInt(req.body.slots) > 0),
                dateJoined: new Date(Date.now())
            });
            await course.save();
            req.flash('success', `Successfully joined ${course.name} as a tutor!`);
            return res.redirect(`/homework/${course._id}`);
        }
        req.flash('error', `You do not have permission to do that`);
        return res.redirect(`back`);
    }

    //Join as student
    const studentStatuses = platform.statusesProperty.slice(0, 6);
    if (studentStatuses.includes(req.user.status)) {
        const course = await Course.findOne({joinCode: req.body.joincode});
        if (!course) {
            req.flash('error', "No courses matching this join code were found.");
            return res.redirect('back');
        }

        course.students.push(req.user);
        await course.save();
        req.flash('success', `Successfully joined ${course.name}!`);
        return res.redirect(`/homework/${course._id}`);
    }
    req.flash('error', `You do not have permission to do that`);
    return res.redirect(`back`);
}

controller.showCourse = async function(req, res) {
    const course = await Course.findById(req.params.id).populate('teacher students tutors.tutor tutors.reviews.review blocked');
    if (!course) {
        req.flash('error', "Unable to find course");
        return res.redirect('back');
    }

    let studentIds = []; //Collect info on the ids of all students and tutors in the course
    let tutorIds = [];
    let tutors = [];
    for (let student of course.students) {
        studentIds.push(student._id.toString());
    }

    let averageRating = 0; //Collect info on tutors and their ratings
    let tutorObject = {};
    for (let tutor of course.tutors) {
        averageRating = 0;
        tutorObject = {};
        tutorIds.push(tutor.tutor._id.toString());
        for (let review of tutor.reviews) {
            averageRating += review.rating;
        }
        averageRating = Math.round(averageRating / tutor.reviews.length);
        tutorObject = tutor;
        tutorObject.averageRating = averageRating;
        tutors.push(tutorObject)
    }

    //Sort tutors for display by two characteristics - average rating and reviews
    tutors = await sortByPopularity(tutors, "averageRating", "dateJoined", null).unpopular
    .concat(sortByPopularity(tutors, "averageRating", "dateJoined", null).popular);

    tutors = await sortByPopularity(tutors, "reviews", "dateJoined", null).unpopular
    .concat(sortByPopularity(tutors, "reviews", "dateJoined", null).popular);

    const teachers = await User.find({authenticated: true, status: "faculty", _id: {$ne: req.user._id}});
    if (!teachers) {
        req.flash('error', "Unable to find teachers");
        return res.redirect('back');
    }
    return res.render('homework/show', {course, studentIds, tutorIds, tutors, teachers, objectArrIndex}); //Export function for ejs evaluation
}

controller.unenrollStudent = async function(req, res) {
    const course = await Course.findByIdAndUpdate(req.params.id, {$pull: {students: req.user._id}}).populate("tutors.tutor");
    if (!course) {
        req.flash('error', "Unable to find course");
        return res.redirect('back');
    }

    //Remove user from all tutors they have signed up with, and delete corresponding chat rooms
    let deletedRoom;
    for (let tutor of course.tutors) {
        if (objectArrIndex(tutor.students, "student", req.user._id) > -1) { //Update the tutor's students array
            tutor.formerStudents.push({
                student: req.user._id,
                lessons: tutor.students[objectArrIndex(tutor.students, "student", req.user._id)].lessons
            });
            deletedRoom = await Room.findByIdAndDelete(tutor.students[objectArrIndex(tutor.students, "student", req.user._id)].room);
            tutor.students.splice(objectArrIndex(tutor.students, "student", req.user._id), 1);
            tutor.slots++;
            tutor.available = true;

            //Remove rooms from teacher/student newRoomCounts
            await removeIfIncluded(req.user.newRoomCount, deletedRoom._id);
            await req.user.save();
            await removeIfIncluded(tutor.tutor.newRoomCount, deletedRoom._id);
            await tutor.tutor.save();
        }
    }
    await course.save();
    req.flash('success', `Unenrolled from ${course.name}!`);
    return res.redirect('/homework');
}

controller.unenrollTutor = async function(req, res) {
    const course = await Course.findById(req.params.id).populate('tutors.tutor tutors.students.student');
    if (!course) {
        req.flash('error', "Unable to find course");
        return res.redirect('back');
    }

    for (let i = course.tutors.length - 1; i >= 0; i--) {
        if (course.tutors[i].tutor._id.equals(req.user._id)) { //If the selected tutor is the current user
            let deletedRoom;
            for (let student of course.tutors[i].students) {
                deletedRoom = await Room.findByIdAndDelete(student.room);
                if (!deletedRoom) {
                    req.flash('error', "Unable to remove chat room");
                    return res.redirect('back');
                }

                //Remove rooms from teacher/student newRoomCounts
                await removeIfIncluded(student.student.newRoomCount, deletedRoom._id);
                await student.student.save();
                await removeIfIncluded(req.user.newRoomCount, deletedRoom._id);
                await req.user.save();
            }
            course.tutors.splice(i, 1); //Remove tutor from course
            break;
        }
    }
    await course.save();
    req.flash('success', `Unenrolled from ${course.name}!`);
    return res.redirect('/homework');
}

controller.updateSettings = async function(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }

    for (let attr in req.body) { //Iterate through each of the data's keys and update the course with the corresponding value
        if (attr != "thumbnail") {
            if (req.body[attr].split(' ').join('') != '') {
                course[attr] = req.body[attr];
            }
        }
    }

    if (req.body.thumbnail.split(' ').join('') != '') {
        course.thumbnail = {url: req.body.thumbnail, display: req.body.showThumbnail == "url"};
    }
    course.thumbnailFile.display = req.body.showThumbnail == "upload";

    //Iterate through newly uploaded thumbnail file, handle with cloudinary
    if (req.files) {
        let cloudErr;
        let cloudResult;
        if (course.thumbnailFile.filename) {
            [cloudErr, cloudResult] = await cloudDelete(course.thumbnailFile.filename, "image");
            if (cloudErr || !cloudResult) {
                req.flash("error", "Error deleting uploaded image");
                return res.redirect("back");
            }
        }

        if (req.files.mediaFile) {
            [cloudErr, cloudResult] = await cloudUpload(req.files.mediaFile[0], "image");
            if (cloudErr || !cloudResult) {
                req.flash("error", "Upload failed");
                return res.redirect("back");
            }

            course.thumbnailFile = { //Update thumbnail display
                filename: cloudResult.public_id,
                url: cloudResult.secure_url,
                originalName: req.files.mediaFile[0].originalname,
                display: req.body.showThumbnail == "upload"
            };
        }
    }

    await course.save();
    req.flash("success", "Updated course settings")
    return res.redirect(`/homework/${course._id}`);
}

controller.deleteCourse = async function(req, res) {
    const course = await Course.findOne({_id: req.params.id, joinCode: req.body.joinCode})
    .populate("tutors.tutor tutors.students.student");
    if (!course) {
        req.flash("error", "Incorrect join code");
        return res.redirect("back");
    }

    let deletedRoom;
    for (let tutor of course.tutors) { //Iterate through tutors and delete all of their rooms
        for (let student of tutor.students) {
            deletedRoom = await Room.findByIdAndDelete(student.room);
            if (!deletedRoom) {
                req.flash("error", "Unable to find room");
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
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    req.flash("success", `Deleted ${course.name}!`);
    return res.redirect("/homework");
}

//-----------TEACHER ROUTES -----------//

controller.updateTeacher = async function(req, res) { //Update course teacher
    const course = await Course.findById(req.params.id);
    if (!course) {
        req.flash("error", "Unable to find course");
        return res.redirect("back");
    }

    if (!(course.joinCode == req.body.joinCodeConfirm)) {
        req.flash("error", "Join code is invalid");
        return res.redirect("back");
    }

    const newTeacher = await User.findById(req.body.teacher);
    if (!newTeacher) {
        req.flash("error", "Error finding teacher");
        return res.redirect("back");
    }

    course.teacher = newTeacher;
    await course.save();
    req.flash("success", "Updated course teacher!");
    return res.redirect("/homework");
}

controller.updateJoinCode = async function(req, res) {
    //Build new join code
    let charSetMatrix = [];
    charSetMatrix.push('qwertyuiopasdfghjklzxcvbnm'.split(''));
    charSetMatrix.push('QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
    charSetMatrix.push('1234567890'.split(''));

    let code_length = Math.round((Math.random() * 15)) + 10;
    let joinCode = "";

    let charSet;
    for (let i = 0; i < code_length; i++) {
        charSet = charSetMatrix[Math.floor(Math.random() * 3)];
        joinCode += charSet[Math.floor((Math.random() * charSet.length))];
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
        return res.json({error: "An Error Occurred"});
    }

    course.joinCode = joinCode;
    await course.save();
    return res.json({success: "Succesfully Updated Join Code", joinCode});
}

controller.removeStudent = async function(req, res) {
    const studentId = await User.findById(req.body.studentId);
    if (!studentId) {
        return res.json({error: "Error removing student"});
    }

    const course = await Course.findById(req.params.id).populate('tutors.tutor tutors.students.student');
    if (!course) {
        return res.json({error: "Error removing student"});
    }

    let deletedRoom;
    for (let tutor of course.tutors) { //Iterate through tutors and remove the student
        if (objectArrIndex(tutor.students, "student", studentId._id, "_id") > -1) {
            tutor.formerStudents.push({ //Add student to list of former studnts
                student: studentId._id,
                lessons: tutor.students[objectArrIndex(tutor.students, "student", studentId._id, "_id")].lessons
            });
            deletedRoom = await Room.findByIdAndDelete(tutor.students[objectArrIndex(tutor.students, "student", studentId._id, "_id")].room);
            if (!deletedRoom) {
                return res.json({error: "Error removing room"});
            }

            //Update newRoomCount for student and tutor, and remove student from list of tutor's current students
            await removeIfIncluded(studentId.newRoomCount, deletedRoom._id);
            await studentId.save();
            await removeIfIncluded(tutor.tutor.newRoomCount, deletedRoom._id);
            await tutor.tutor.save();
            tutor.students.splice(objectArrIndex(tutor.students, "student", studentId._id, "_id"), 1);
        }
    }

    const notif = await Notification.create({  //Create a notification to alert the student that they have been blocked
        subject: `Removal from ${course.name}`,
        text: `You were removed from ${course.name} for the following reason:\n"${req.body.reason}"`,
        sender: req.user,
        noReply: true,
        recipients: [studentId],
        read: [],
        images: []
    });
    if (!notif) {
        return res.json({error: "Error removing student"});
    }

    notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
    await notif.save()
    studentId.inbox.push(notif);
    studentId.msgCount++;
    await studentId.save();
    if (studentId.receiving_emails) {
        await sendGridEmail(studentId.email, `Removal from ${course.name}`, `<p>Hello ${studentId.firstName},</p><p>${notif.text}</p>`, false);
    }
    course.blocked.push(studentId);

    removeIfIncluded(course.students, studentId._id, "_id"); //Remove student
    await course.save();
    return res.json({success: "Succesfully removed student", student: studentId, course});
}

controller.removeTutor = async function(req, res) { //Remove tutor from course
    let tutorId;
    if (req.body.show) {
        tutorId = await User.findById(req.body.tutorId);
        if (!tutorId) {
            return res.json({error: "Error removing tutor"});
        }

    } else {
        tutorId = await User.findById(req.query.tutorId);
        if (!tutorId) {
            req.flash("error", "Error removing tutor");
            return res.redirect("back");
        }
    }

    const course = await Course.findById(req.params.id).populate('tutors.tutor tutors.students.student');
    if (!course) {
        if (req.body.show) {
            return res.json({error: "Error removing tutor"});
        } else {
            req.flash("error", "Error removing tutor");
            return res.redirect("back");
        }
    }

    for (let i = 0; i < course.tutors.length; i++) {
        if (course.tutors[i].tutor._id.equals(tutorId._id)) {
            let deletedRoom;
            for (let student of course.tutors[i].students) { //For all of the tutor's rooms, remove room and update students' new room counts
                deletedRoom = await Room.findByIdAndDelete(student.room);
                if (!deletedRoom) {
                    if (req.body.show) {
                        return res.json({error: "Error removing tutor"});
                    } else {
                        req.flash("error", "Error removing tutor");
                        return res.redirect("back");
                    }
                }
                await removeIfIncluded(student.student.newRoomCount, deletedRoom._id);
                await student.student.save();
                await removeIfIncluded(tutorId.newRoomCount, deletedRoom._id);
                await tutorId.save();
            }

            const notif = await Notification.create({ //Create a notification to alert tutor that they have been removed
                subject: `Removal from ${course.name}`,
                text: `You were removed from ${course.name} for the following reason:\n"${req.body.reason}"`,
                sender: req.user,
                noReply: true,
                recipients: [tutorId],
                read: [],
                images: []
            });

            if (!notif) {
                if (req.body.show) {
                    return res.json({error: "Error removing tutor"});
                } else {
                    req.flash("error", "Error removing tutor");
                    return res.redirect("back");
                }
            }
            notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
            await notif.save();

            tutorId.inbox.push(notif);
            tutorId.msgCount++;
            await tutorId.save();
            if (tutorId.receiving_emails) {
                await sendGridEmail(tutorId.email, `Removal from ${course.name}`, `<p>Hello ${tutorId.firstName},</p><p>${notif.text}</p>`, false);
            }

            course.blocked.push(tutorId); //Remove tutor and block them
            course.tutors.splice(i, 1);
            await course.save();

            if (req.body.show) {
                return res.json({success: "Succesfully removed tutor", tutor: tutorId, course});
            } else {
                req.flash("success", "Succesfully Removed Tutor!");
                return res.redirect(`/homework/${course._id}`);
            }
        }
    }
}

controller.unblock = async function(req, res) { //Unblock a previously blocked user
    const blockedId = await User.findById(req.body.blockedId);
    if (!blockedId) {
        return res.json({error: "Unable to access user"});
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
        return res.json({error: "Unable to access course"});
    }

    if (!course.blocked.includes(blockedId._id)) { //If the user is not blocked, they cannot be unblocked
        return res.json({error: "User is not blocked from this course"});
    }
    
    removeIfIncluded(course.blocked, blockedId._id); //Unblock user
    await course.save();
    const notif = await Notification.create({  //Create a notification to alert the user
        subject: `Unblocked from ${course.name}`,
        text: `You have been unblocked from ${course.name}. You can rejoin with the join code now whenever you need to.`,
        sender: req.user,
        noReply: true,
        recipients: [blockedId],
        read: [],
        images: []
    });

    if (!notif) {
        return res.json({error: "Error removing student"});
    }

    notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
    await notif.save();

    blockedId.inbox.push(notif);
    blockedId.msgCount++;
    await blockedId.save();
    if (blockedId.receiving_emails) {
        await sendGridEmail(blockedId.email, `Removal from ${course.name}`, `<p>Hello ${blockedId.firstName},</p><p>${notif.text}</p>`, false);
    }
    return res.json({success: "Succesfully unblocked user", blocked: blockedId, course});
}

//-----------TUTOR ROUTES -----------//

controller.updateBio = async function(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) {
        return res.json({error: "Unable to find course"});
    }

    for (let tutor of course.tutors) { //Iterate through tutors and search for current user
        if (tutor.tutor.equals(req.user._id)) {
            tutor.bio = req.body.bio;
            await course.save();
            return res.json({success: "Successfully changed"})
        }
    }
}

controller.closeLessons = async function(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) {
        return res.json({error: "Error closing lessons"});
    }

    for (let tutor of course.tutors) {
        if (tutor.tutor.equals(req.user._id)) { //If the selected tutor matches the current user, shut down availability
            tutor.available = false;
            await course.save();
            return res.json({success: "Successfully closed lessons"});
        }
    }
}

controller.reopenLessons = async function(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) {
        return res.json({error: "Error closing lessons"});
    }

    for (let tutor of course.tutors) {
        if (tutor.tutor.equals(req.user._id)) { //If the selected tutor matches the current user, reopen availability
            tutor.available = true;
            await course.save();
            return res.json({success: "Successfully closed lessons"});
        }
    }
}

controller.setStudents = async function(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) {
        return res.json({error: "Error accessing course"});
    }

    let found = false;
    for (let tutor of course.tutors) { //Search through tutors to find requested tutor
        if (tutor.tutor.equals(req.user._id)) {
            found = true;
            tutor.slots = parseInt(req.body.slots) - tutor.students.length; //Update slots based on data
            if ((parseInt(req.body.slots) - tutor.students.length) == 0) { //Update availability based on new slot info
                tutor.available = false;
            }
            await course.save();
            return res.json({success: "Succesfully changed", tutor});
        }
    }
    if (!found) {
        return res.json({error: "Unable to find tutor"});
    }
}

controller.markLesson = async function(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) {
        return res.json({error: "Error accessing course"});
    }
    //Find specific tutor and add lesson for their student
    for (let tutor of course.tutors) {
        if (tutor.tutor.equals(req.user._id)) {
            for (let student of tutor.students) {
                if (student.student.equals(req.body.studentId)) {
                    student.lessons.push({
                        time: req.body.time,
                        date: dateFormat(new Date(), "mmm d"),
                        summary: req.body.summary
                    });
                    await course.save();
                    return res.json({success: "Succesfully updated", tutor});
                }
            }
        }
    }
}

//-----------STUDENT ROUTES -----------//

controller.bookTutor = async function(req, res) {
    const course = await Course.findById(req.params.id).populate('tutors.tutor');
    if (!course) {
        return res.json({error: "Error accessing course"});
    }

    let formerStudent = false;
    for (let tutor of course.tutors) { //Iterate through tutors and search for the corresponding one
        if (tutor.tutor._id.equals(req.body.tutorId) && tutor.available) {
            if (objectArrIndex(tutor.formerStudents, "student", req.user._id) > -1) { //Remove student from tutor's former students (if they were there)
                formerStudent = true;
                tutor.formerStudents.splice(objectArrIndex(tutor.formerStudents, "student", req.user._id), 1);
            }

            tutor.slots--;
            if (tutor.slots == 0) {
                tutor.available = false;
            }

            const room = await Room.create({ //Create chat room between student and tutor
                name: `${req.user.firstName}'s Tutoring Sessions With ${tutor.tutor.firstName} - ${course.name}`,
                creator: tutor.tutor._id,
                members: [req.user._id, tutor.tutor._id],
                private: true,
                mutable: false
            });
            if (!room) {
                return res.json({error: "Error creating room"});
            }

            room.date = dateFormat(room.created_at, "h:MM TT | mmm d");
            await room.save();
            tutor.tutor.newRoomCount.push(room._id);
            req.user.newRoomCount.push(room._id);
            await tutor.tutor.save();
            await req.user.save();

            const studentObject = {
                student: req.user._id,
                lessons: [],
                room: room._id
            }
            tutor.students.push(studentObject);
            await course.save();

            //All current students of the tutor
            const studentIds = await User.find({authenticated: true, _id: {$in: parsePropertyArray(tutor.students, "student")}});
            if (!studentIds) {
                return res.json({error: "Error accessing students"});
            }

            //All former students of the tutor
            const formerStudents = await User.find({authenticated: true, _id: {$in: parsePropertyArray(tutor.formerStudents, "student")}});
            if (!formerStudents) {
                return res.json({error: "Error accessing students"});
            }

            return res.json({
                success: "Succesfully joined tutor", user: req.user,
                room: studentObject,  tutor,  formerStudent, 
                students: studentIds, formerStudents
            });
        }
    }
}

controller.leaveTutor = async function(req, res) {
    const course = await Course.findById(req.params.id).populate('tutors.tutor');
    if (!course) {
        return res.json({error: "Error accessing course"});
    }

    let deletedRoom;
    for (let tutor of course.tutors) { //If the selected tutor is the one being left, and the user is a student of that tutor, leave
        if (tutor.tutor._id.equals(req.body.tutorId)) {
            if (objectArrIndex(tutor.students, "student", req.user._id) > -1) {
                deletedRoom = await Room.findByIdAndDelete(tutor.students[objectArrIndex(tutor.students, "student", req.user._id)].room);
                if (!deletedRoom) {
                    return res.json({error: "Error deleting room"});
                }

                //Remove room, add student to tutor's former students
                await removeIfIncluded(tutor.tutor.newRoomCount, tutor.students[objectArrIndex(tutor.students, "student", req.user._id)].room);
                await tutor.tutor.save();
                await removeIfIncluded(req.user.newRoomCount, tutor.students[objectArrIndex(tutor.students, "student", req.user._id)].room)
                await req.user.save();
                if (objectArrIndex(tutor.formerStudents, "student", req.user._id) == -1) {
                    tutor.formerStudents.push({
                        student: req.user._id,
                        lessons: tutor.students[objectArrIndex(tutor.students, "student", req.user._id).lessons]
                    });
                }
                tutor.students.splice(objectArrIndex(tutor.students, "student", req.user._id), 1);
                tutor.slots++;
                tutor.available = true;

                await course.save();
                return res.json({success: "Succesfully left tutor", user: req.user});
            } else {
                return res.json({error: "You are not a student of this tutor"});
            }
        }
    }
}

controller.upvoteTutor = async function(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) {
        return res.json({error: "Error upvoting tutor"});
    }

    for (let tutor of course.tutors) {
        if (tutor.tutor.equals(req.body.tutorId)) { //Search for tutor until they are found
            if (objectArrIndex(tutor.students.concat(tutor.formerStudents), "student", req.user._id) > -1) { //Only current/former students of a tutor can upvote them
                if (removeIfIncluded(tutor.upvotes, req.user._id)) { //If tutor is currently upvoted by this user, downvote them
                    await course.save();
                    return res.json({success: "Downvoted tutor", upvoteCount: tutor.upvotes.length});
                }
                tutor.upvotes.push(req.user._id);
                await course.save();
                return res.json({success: "Upvoted tutor", upvoteCount: tutor.upvotes.length});
            }
            return res.json({error: "You are not a student of this tutor"});
        }
    }
}

controller.rateTutor = async function(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) {
        return res.json({error: "Error reviewing tutor"});
    }

    for (let tutor of course.tutors) {
        if (tutor.tutor.equals(req.body.tutorId)) {
            if (objectArrIndex(tutor.students.concat(tutor.formerStudents), "student", req.user._id) > -1) { //Only current/former students of a tutor can upvote them
                let review = await PostComment.create({type: "review", text: req.body.text.split('<').join('&lt'), sender: req.user}); //Create comment with review
                if (!review) {
                    return res.json({error: "Error reviewing tutor"});
                }

                review.date = dateFormat(review.created_at, "h:MM TT | mmm d");
                await review.save();
                const reviewObject = {review, rating: req.body.rating};
                tutor.reviews.push(reviewObject);
                await course.save();

                let averageRating = 0;
                for (let review of tutor.reviews) {
                    averageRating += review.rating;
                }

                //Update tutor's average rating based on new rating
                averageRating = Math.round(averageRating / tutor.reviews.length);
                return res.json({
                    success: "Succesfully upvoted tutor",
                    averageRating,
                    reviews_length: tutor.reviews.length,
                    review: reviewObject,
                    user: req.user
                });
            }
            return res.json({error: "You are not a student of this tutor"});
        }
    }
}

controller.likeReview = async function(req, res) {
    const review = await PostComment.findById(req.params.id);
    if (!review) {
        return res.json({error: "Error accessing review"});
    }

    if (removeIfIncluded(review.likes, req.user._id)) { //If user has liked this review, remove a like
        await review.save();
        return res.json({success: "Removed a like", likeCount: review.likes.length, review});
    }
    
    review.likes.push(req.user._id);
    await review.save();
    return res.json({success: "Liked", likeCount: review.likes.length});
}

//----OTHER----//

controller.showTutor = async function(req, res) {
    const course = await Course.findById(req.params.id).populate("tutors.tutor tutors.students.student tutors.formerStudents.student").populate({
        path: "tutors.reviews.review",
        populate: {path: "sender"}
    });
    if (!course) {
        req.flash('error', "Unable to find course");
        return res.redirect('back');
    }

    let tutorIds = [];
    for (let tutor of course.tutors) {
        tutorIds.push(tutor.tutor._id.toString());
    }

    let courseStudents = [];
    for (let student of course.students) {
        courseStudents.push(student.toString());
    }

    for (let tutor of course.tutors) {
        if (tutor.tutor._id.equals(req.query.tutorId)) {
            let studentIds = []; //Collect info on all students who are members of this tutor
            for (let student of course.students) {
                studentIds.push(student.toString());
            }

            let enrolledCourses = []; //Collect all courses which this tutor teaches (that are not the current one)
            const courses = await Course.find({_id: {$ne: course._id}}).populate("teacher");
            if (!courses) {
                req.flash('error', "Unable to find courses");
                return res.redirect('back');
            }

            for (let course of courses) {
                for (let t of course.tutors) {
                    if (t.tutor.equals(tutor.tutor._id)) {
                        enrolledCourses.push(course);
                    }
                }
            }

            let averageRating = 0; //Calculate tutor's average rating
            for (let review of tutor.reviews) {
                averageRating += review.rating;
            }
            averageRating = Math.round(averageRating / tutor.reviews.length);

            const students = await User.find({authenticated: true, _id: {$in: parsePropertyArray(tutor.students, "student")}});
            if (!students) {
                req.flash('error', "Unable to find students");
                return res.redirect('back');
            }

            let lessonMap = new Map(); //Track all lessons of this tutor's students
            let time = 0;
            for (let student of tutor.students.concat(tutor.formerStudents)) {
                time = 0;
                for (let lesson of student.lessons) {
                    time += lesson.time;
                }
                lessonMap.set(student.student._id.toString(), time);
            }

            if (req.query.studentId) { //If query is to show a tutor's lessons with a specific student
                const allStudents = tutor.students.concat(tutor.formerStudents);
                if (objectArrIndex(allStudents, "student", req.query.studentId, "_id") > -1) {
                    //Check that user is either a student of this tutor, this tutor, or the course's teacher
                    if (allStudents[objectArrIndex(allStudents, "student", req.query.studentId, "_id")].student._id.equals(req.user._id) || tutor.tutor._id.equals(req.user._id) || course.teacher.equals(req.user._id)) {
                        return res.render('homework/lessons', {
                            course, tutor, student: allStudents[objectArrIndex(allStudents, "student", req.query.studentId, "_id")],
                            time: lessonMap.get(allStudents[objectArrIndex(allStudents, "student", req.query.studentId, "_id")].student._id.toString()), objectArrIndex
                        });
                    }
                    req.flash('error', "You are ge");
                    return res.redirect('back');
                }
                
                req.flash('error', "You do not have permission to view that student");
                return res.redirect('back');
            }

            return res.render('homework/tutor-show', {
                course, tutor, students, studentIds, averageRating,
                lessons: lessonMap, courses: enrolledCourses, objectArrIndex
            });
        }
    }
}

module.exports = controller;