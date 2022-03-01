const { validate } = require("../../middleware/validation");
const Router = require("../authentication/authentication");
const { v4: uuidv4 } = require('uuid');
const { ClassModel, FieldModel } = require("../../mongodb/classroom");
const { admin, status } = require('../../middleware/role');
const { InviteModel } = require("../../mongodb/invitelink");
const { UserModel } = require("../../mongodb/user");
const { classView } = require("../../middleware/classinfo");
const { AssignmentModel, StudentAssignmentModel } = require("../../mongodb/assignment");
const fs = require('fs');
const { StudentModel, StudentInformationModel } = require("../../mongodb/studentSchema");
const { TeacherModel } = require("../../mongodb/teacherSchema");
const { deleteFiles } = require("../../functions/handleFile");
const { Error } = require("../../classes/error");
const { fileHandler, upload } = require("../../middleware/filehandler");
const { uploadFiles, manageFile, destroyFiles, downloadFiles } = require('../../functions/cloudinary');

//create a classroom by an user
//required headers [id,accesstoken,refreshtoken]
//required body [name,description(not required),fields(not required)]
//uses [VALIDATE] middleware(see those middleware for full info)

//uses [VALIDATE,fileHandler] middleware(see those middleware for full info)
Router.post('/create', validate, fileHandler, async (req, res, next) => {
    try {
        const user = req.user;
        const name = req.body.name;
        if (!name) return next(new Error(400, 'missing field(s) [name]'));
        const description = req.body.description;
        const studentFields = new Map(req.body.fields?JSON.parse(req.body.fields):[]);
        const avatar=req.files[0];
        const classId = uuidv4();
        const teacher = new TeacherModel({
            id: user.id,
            classId: classId,
            role: 'admin',
            className: user.name
        });
        const newclass = new ClassModel({
            id: classId,
            name: name,
            createdAt: new Date(),
            description: description,
            students: [],
            teachers: [req.user.id]
        });
        if(avatar){
            const cloudFile= await uploadFiles([avatar])
            newclass.avatar={
                originalFileName:avatar.originalname,
                ...cloudFile[0]
            }
        }
        newclass.requiredFields = [];
        studentFields.forEach((value, key) => {
            newclass.requiredFields.push(new FieldModel({
                name: key,
                priority: value
            }))
        });
        if (!user.classes) user.classes = [classId];
        else user.classes.push(classId);
        await user.save();
        const response = await newclass.save();
        await teacher.save();
        res.status(200).json({ class: response, accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        return next(new Error(500, 'Server Error'));
    }
});


//get information of a classroom by an user (if the user is in the classroom)
//required headers [id,accesstoken,refreshtoken,classid,q]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.get('/info', validate, status, classView, async (req, res) => {
    try {
        if (!req.headers.q) return res.status(200).json(req.view);
        res.status(200).json({ ...view, accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        return next(new Error(500, 'Server Error'));
    }
})
//add new information about a classroom by an user (if the user is an admin)
//required headers [id,accesstoken,refreshtoken,classid]
//required body [fieldname,fieldvalue]
//uses [VALIDATE,ADMIN] middleware(see those middleware for full info)
Router.post('/info', validate, admin, async (req, res) => {
    try {
        const fieldName = req.body.fieldname;
        const fieldValue = req.body.fieldvalue;
        if (!fieldName || !fieldValue) return next(new Error(400, 'missing field(s) [fieldname,fieldvalue]'));
        const classData = await ClassModel.findOne({ id: req.headers.classid });
        if (!classData) return res.sendStatus(400);
        if (!classData.information) classData.information = new Map();
        if (classData.information.has(fieldName)) return next(new Error(409, `${fieldName} already present`));//conflict
        classData.information.set(fieldName, fieldValue);
        const response = await classData.save();
        const sendData = await ClassModel.findOne({ id: response.id }, '-_id id name information');
        return res.status(200).json({ class: sendData, accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        return next(new Error(500, 'Server Error'));
    }
});
//update an information about a classroom by an user (if the user is an admin)
//required headers [id,accesstoken,refreshtoken,classid]
//required body [fieldname,fieldvalue]
//used [VALIDATE,ADMIN] middleware(see those middleware for full info)
Router.patch('/info', validate, admin, async (req, res) => {
    try {
        const fieldName = req.body.fieldname;
        const fieldValue = req.body.fieldvalue;
        if (!fieldName || !fieldValue) return next(new Error(400, 'missing field(s) [fieldname,fieldvalue]'));
        if (!req.headers.classid) return res.sendStatus(400);
        const classData = await ClassModel.findOne({ id: req.headers.classid });
        if (!classData) return res.sendStatus(400);
        if (!classData.information) classData.information = new Map();
        if (!classData.information.has(fieldName)) return next(new Error(409, `${fieldName} not found`));//conflict
        classData.information.set(fieldName, fieldValue);
        const response = await classData.save();
        const sendData = await ClassModel.findOne({ id: response.id }, '-_id id name information');
        return res.status(200).json({ class: sendData, accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        return next(new Error(500, 'Server Error'));
    }
});
//delete an information about a classroom by an user (if the user is an admin)
//required headers [id,accesstoken,refreshtoken,classid]
//required body [fieldname]
//used [VALIDATE,ADMIN] middleware(see those middleware for full info)
Router.delete('/info', validate, admin, async (req, res) => {
    try {
        const fieldName = req.body.fieldname;
        if (!fieldName) return res.status(400).json('missing field(s) [fieldname]');
        const classData = await ClassModel.findOne({ id: req.headers.classid });
        if (!classData.information) classData.information = new Map();
        if (!classData.information.has(fieldName)) return next(new Error(409, `${fieldName} not found`));//conflict
        classData.information.delete(fieldName);
        const response = await classData.save();
        const sendData = await ClassModel.findOne({ id: response.id }, '-_id id name information');
        return res.status(200).json({ class: sendData, accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        return next(new Error(500, 'Server Error'));
    }
});
//kick an user from a classroom
//required headers [id,accesstoken,refreshtoken,classid]
//require body [memberid(student || teacher basically the userid)]
//used [VALIDATE,ADMIN] middleware(see those middleware for full info)
Router.delete('/kick', validate, admin, async (req, res) => {
    try {
        const memberid = req.body.memberid;
        if (!req.headers.classid || !memberid) return next(new Error(400, 'missing fields either [classid,memberid]'));
        if (req.user.id === memberid) return res.status(403).json('can not kick oneself');
        const classData = await ClassModel.findOne({ id: req.headers.classid });
        if (!classData.teachers.find(id => id === memberid) && !classData.students.find(id => id === memberid)) return next(new Error(404, 'User not found'));
        if (classData.students.find(id => id === memberid)) {
            classData.students = classData.students.filter(id => id !== memberid);
            const student = await StudentModel.findOneAndDelete({ id: memberid, classId: classData.id });
            await AssignmentModel.updateMany({ classId: classData.id }, { $pull: { submittedStudent: student.id } });
            const studentAssignments = await StudentAssignmentModel.find({ classId: classData.id, studentId: student.id });
            for (let i = 0; i < studentAssignments.length; i++) {
                const assignment = studentAssignments[i];
                assignment.files.forEach(file => {
                    fs.unlink(file.path, err => {
                        if (err) console.log(err);
                    })
                });
                await assignment.deleteOne();
            }
        } else {
            classData.teachers = classData.teachers.filter(id => id !== memberid);
            await TeacherModel.findOneAndDelete({ id: memberid, classId: classData.id });
        }
        const kickedUser = await UserModel.findOne({ id: memberid });
        kickedUser.classes = kickedUser.classes.filter(k => k != req.headers.classid);
        await classData.save();
        await kickedUser.save();
        const response = await ClassModel.findOne({ id: req.headers.classid }, '-_id');
        return res.status(200).json({ class: response, accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        return next(new Error(500, 'Server Error'));
    }
})
//delete a classroom (can only be done by an admin of the class)
//required headers [id,accesstoken,refreshtoken,classid]
//uses [VALIDATE,ADMIN] middleware(see those middleware for full info)
Router.delete('/', validate, admin, async (req, res) => {
    try {
        const classId = req.headers.classid;
        const studentAssignments = await StudentAssignmentModel.find({ classId: classId });
        studentAssignments.forEach(a => {
            deleteFiles(a.files)
        });
        const classData = await ClassModel.findOne({ id: classId });
        const users = [...classData.teachers, ...classData.students];
        await UserModel.updateMany({ id: { $in: users } }, { $pull: { classes: classId } });
        await ClassModel.findOneAndDelete({ id: classId });
        await StudentAssignmentModel.deleteMany({ classId: classId });
        await TeacherModel.deleteMany({ classId: classId });
        await AssignmentModel.deleteMany({ classId: classId });
        await InviteModel.findOneAndDelete({ classId: classId });
        await StudentModel.deleteMany({ classId: classId });
        res.status(200).json({ accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        return next(new Error(500, 'Server Error'));
    }
})
module.exports = Router;