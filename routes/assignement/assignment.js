const Router = require('express').Router();
const { status } = require('../../middleware/role');
const { validate } = require('../../middleware/validation');
const { AssignmentModel, StudentAssignmentModel } = require('../../mongodb/assignment');
const { v4: uuidv4 } = require('uuid');
const { ClassModel } = require('../../mongodb/classroom');
const { fileHandler } = require('../../middleware/filehandler');
const fs = require('fs');
const { StudentModel } = require('../../mongodb/studentSchema');
const { TeacherModel } = require('../../mongodb/teacherSchema');
const { deleteFiles } = require('../../functions/handleFile');
const { uploadFiles, manageFile, destroyFiles, downloadFiles } = require('../../functions/cloudinary');
const { Mongoose } = require('mongoose');

// get all the assignments in a class
// required headers [id , accesstoken , refreshtoken , classid]
// validate checks for authentication
// status checks if the user is in the class or not

Router.get('/allassignments' , validate , status , async(req , res) => {
    try {
        
        if(req.status === undefined) return res.status(403).json('user is not in the class');
        if(!req.headers.classid) return res.status(403).json('missing class id')

        const allAssignments = await AssignmentModel.find({classId : req.headers.classid});

        return res.status(200).json({
            assignments : allAssignments
        })

    } catch (error) {
        console.log({error});
        return res.sendStatus(500);
    }
})

//create assignment by teacher
//required headers [id,accesstoken,refreshtoken,classid]
//required body [title,description(not required),submissiondate(not required)]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.post('/', validate, status, async (req, res) => {
    try {
        const title = req.body.title;
        const description = req.body.description;
        const submissionDate = req.body.submissiondate || null;
        if (!req.status.teacher) return res.status(403).json('user is not a teacher');
        if (!title) return res.status(400).json('missing fields [title]');
        const id = uuidv4();
        const assignment = new AssignmentModel({
            id: id,
            classId: req.headers.classid,
            title: title,
            details: description,
            createdAt: new Date(),
            lastSubmittedDate: submissionDate ? new Date(submissionDate) : null,
            submittedStudent: [],
        });
        const classData = await ClassModel.findOne({ id: req.headers.classid });
        classData.assignments.push(id);
        await assignment.save();
        await classData.save();
        const response = await AssignmentModel.findOne({ id: id, classId: req.headers.classid }, '-_id -__v');
        return res.status(200).json({ assignment: response, accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//get the information about an assignment(by class member)
//required headers [id,accesstoken,refreshtoken,classid,assignmentid]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.get('/', validate, status, async (req, res) => {
    try {
        const assignmentId = req.headers.assignmentid;
        if (!req.status.teacher && !req.status.student) return res.status(403).json('user is not a part of the class');
        if (!assignmentId) return res.status(400).json('missing fields [assignmentid]');
        const assignment = await AssignmentModel.findOne({ id: assignmentId, classId: req.headers.classid }, `-_id -__v ${req.status.student ? '-submittedStudent' : ''}`);
        if (!assignment) return res.status(404).json('assignment not found');
        return res.status(200).json({ assignment: assignment, accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//delete assignment by teacher
//required headers [id,accesstoken,refreshtoken,classid]
//required body [assignmentid]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.delete('/', validate, status, async (req, res) => {
    try {
        const assignmentId = req.body.assignmentid;
        if (!req.status.teacher) return res.status(403).json('user is not a teacher');
        if (!assignmentId) return res.status(400).json('missing fields [assignmentid]');
        const assignment = await AssignmentModel.findOneAndDelete({ id: assignmentId, classId: req.headers.classid });
        if (!assignment) return res.status(404).json('assignment not found');
        const classData = await ClassModel.findOne({ id: req.headers.classid });
        classData.assignments = classData.assignments.filter(a => a !== assignmentId);
        await classData.save();
        //delete the assignments from the students
        await StudentAssignmentModel.deleteMany({
            assignmentId: assignmentId,
            studentId: { $in: assignment.submittedStudent },
            classId: req.headers.classid,
        });
        return res.status(200).json({ assignment: assignment, accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//submit an assignment by a student
//required headers [id,accesstoken,refreshtoken,classid]
//required body [assignmentid,files]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.post('/submit', validate, status, fileHandler, async (req, res) => {
    try {
        const assignmentId = req.body.assignmentid;
        const files = req.files;
        if (!req.status) {
            deleteFiles(req.files)
            return res.status(403).json('user is not a part of the class');
        }
        if (req.status.teacher) {
            deleteFiles(req.files);
            return res.status(403).json('teacher can not submit assignment');
        }
        if (!assignmentId || !files) {
            deleteFiles(req.files);
            return res.status(400).json('missing fields [assignmentid,files]');
        }
        const assignment = await AssignmentModel.findOne({ id: assignmentId, classId: req.headers.classid });
        if (!assignment) {
            deleteFiles(req.files);
            return res.status(404).json('no such assignment published by teacher');
        }
        const submittedAssignment = await StudentAssignmentModel.findOne({
            assignmentId: assignmentId,
            studentId: req.user.id,
            classId: assignment.classId,
        });
        if (submittedAssignment) return res.status(400).json('you have already submitted the assignment')
        const uploadedFiles = await uploadFiles(files);
        const studentAssignment = new StudentAssignmentModel({
            assignmentId: assignmentId,
            studentId: req.user.id,
            classId: assignment.classId,
            files: uploadedFiles,
            submittedAt: new Date()
        });
        assignment.submittedStudent.push(req.user.id);
        await studentAssignment.save();
        await assignment.save();
        const response = await StudentAssignmentModel.findOne({ assignmentId: assignmentId, studentId: req.user.id, },'-_id');
        response.files=response.files.map(file=>{
            return {
                width: file.width,
                height: file.height,
                format: file.format,
                bytes: file.bytes,
                secure_url: file.secure_url,
                original_filename: file.original_filename,
            }
        });
        return res.status(200).json({ assignmet: response, accesstoken: req.accesstoken });
    } catch (error) {
        deleteFiles(req.files);
        console.log(error);
        res.sendStatus(500);
    }
})
//get the information of a submitted assignment by both teacher and student
//required headers [id,accesstoken,refreshtoken,classid,assignmentid]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.get('/submit', validate, status, async (req, res) => {
    try {
        const assignmentId = req.headers.assignmentid;
        if (!req.status) return res.status(403).json('user is not a part of the class');
        if (!assignmentId) return res.status(400).json('missing fields [assignmentid]');
        const assignment = await StudentAssignmentModel.findOne({
            assignmentId: assignmentId,
            studentId: req.user.id,
            classId: req.headers.classid,
        }, '-_id -__v');
        if (!assignment) return res.status(404).json('could not find student assignment');
        assignment.files=assignment.files.map(file=>{
            return {
                width: file.width,
                height: file.height,
                format: file.format,
                bytes: file.bytes,
                secure_url: file.secure_url,
                original_filename: file.original_filename,
            }
        });
        res.status(200).json({ assignment: assignment, accesstoken: req.accesstoken })
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//modify an assignment by a student
//required headers [id,accesstoken,refreshtoken,classid]
//required body [assignmentid,files]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.patch('/submit', validate, status, fileHandler, async (req, res) => {
    try {
        const assignmentId = req.body.assignmentid;
        const files = req.files;
        if (!req.status) return res.status(403).json('user is not a part of the class');
        if (req.status.teacher) return res.status(403).json('teacher can not submit assignment');
        if (!assignmentId || !files) return res.status(400).json('missing fields [assignmentid,files]');
        const assignment = await AssignmentModel.findOne({ id: assignmentId, classId: req.headers.classid });
        if (!assignment) return res.status(404).json('no such assignment published by teacher');
        const submittedAssignment = await StudentAssignmentModel.findOne({
            assignmentId: assignmentId,
            studentId: req.user.id,
            classId: assignment.classId,
        });
        if (!submittedAssignment) return res.status(403).json('could not find student assignment');
        const prevFiles = submittedAssignment.files || [];
        const cloudFiles = await manageFile(files || [], prevFiles);
        submittedAssignment.files = cloudFiles;
        submittedAssignment.submittedAt = new Date();
        await submittedAssignment.save();
        const response = await StudentAssignmentModel.findOne({
            assignmentId: assignmentId,
            studentId: req.user.id,
            classId: assignment.classId,
        },'-_id');
        response.files=response.files.map(file=>{
            return {
                width: file.width,
                height: file.height,
                format: file.format,
                bytes: file.bytes,
                secure_url: file.secure_url,
                original_filename: file.original_filename,
            }
        });
        res.status(200).json({ assignment: response, accesstoken: req.accesstoken })

    } catch (error) {
        deleteFiles(req.files);
        console.log(error);
        res.sendStatus(500);
    }
})
//delete a assignment by a student
//required headers [id,accesstoken,refreshtoken,classid]
//required body [assignmentid]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.delete('/submit', validate, status, async (req, res) => {
    try {
        const assignmentId = req.body.assignmentid;
        if (!req.status) return res.status(403).json('user is not a part of the class');
        if (req.status.teacher) return res.status(403).json('teacher can not delete assignmet');
        if (!assignmentId) return res.status(400).json('missing fields [assignmentid]');
        const assignment = await AssignmentModel.findOne({ id: assignmentId, classId: req.headers.classid });
        if (!assignment) return res.status(404).json('no such assignment published by teacher');
        const deletedAssignment = await StudentAssignmentModel.findOneAndDelete({
            assignmentId: assignmentId,
            studentId: req.user.id,
            classId: assignment.classId,
        });
        if (!deletedAssignment) return res.status(403).json('could not find student assignment');
        const prevFiles = deletedAssignment.files;
        await destroyFiles(prevFiles);
        assignment.submittedStudent = assignment.submittedStudent.filter(id => id !== req.user.id);
        await assignment.save();
        res.status(200).json({ accesstoken: req.accesstoken })
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})
module.exports = Router;