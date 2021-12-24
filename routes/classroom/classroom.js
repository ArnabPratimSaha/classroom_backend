const { validate } = require("../../middleware/validation");
const Router = require("../authentication/authentication");
const { v4: uuidv4 } = require('uuid');
const { TeacherModel, ClassModel, StudentModel } = require("../../mongodb/classroom");
const { admin, status } = require('../../middleware/role');
const { InviteModel } = require("../../mongodb/invitelink");
const { UserModel } = require("../../mongodb/user");
const { classView } = require("../../middleware/classinfo");
//create a classroom by an user
//required headers [id,accesstoken,refreshtoken]
//required body [name,description(not required)]
//used [VALIDATE] middleware(see those middleware for full info)
Router.post('/create', validate, async (req, res) => {
    try {
        const user = req.user;
        const name = req.body.name;
        const description = req.body.description;
        const teacher = new TeacherModel({
            id: user.id,
            role: 'admin',
        });
        const newclass = new ClassModel({
            id: uuidv4(),
            name: name,
            createdAt: new Date(),
            description: description,
            teachers: [teacher],
            students: [],
        });
        const response = await newclass.save();
        res.status(200).json({ accesstoken: req.accesstoken, response: response });
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//get information of a classroom by an user (if the user is in the classroom)
//required headers [id,accesstoken,refreshtoken,classid]
//used [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.get('/info', validate, status,classView, async (req, res) => {
    try {
        if(!req.headers.q)return res.status(200).json(req.view);
        const query=req.headers.q.split(' ');
        var view={teacher:req.view.teacher,student:req.view.student,admin:req.view.admin,requestedPerson:req.view.requestedPerson};
        query.forEach(e => {
            if(e==='teacher')view.teachers=req.view.teachers;
            if(e==='student')view.students=req.view.students;
        });
        res.status(200).json(view);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})

//create an invite link-can only be created by and admin
//required headers [id,accesstoken,refreshtoken,expi(default 30 days),type(default student)]
//used [VALIDATE] middleware(see those middleware for full info)
Router.get('/invite', validate, admin, async (req, res) => {
    try {
        const user = req.user;
        const type = req.headers.type || 'student';
        const expireDate = req.headers.expi || 30;
        const classData = req.class;
        const link = await InviteModel.findOne({ classId: classData.id });
        const id = uuidv4();
        if (link) {
            link.inviteIds.push({
                id: id,
                type: type,
                show: type === 'teacher' ? false : true,
                expireIn: new Date().setDate(new Date().getDate() + expireDate)
            })
            await link.save();
            return res.status(200).json({ type: type, classId: classData.id, inviteid: id, expireIn: new Date().setDate(new Date().getDate() + expireDate), accesstoken: req.accesstoken });
        }
        const newLink = new InviteModel({
            classId: classData.id,
            inviteIds: [{
                id: id,
                type: type,
                show: type === 'teacher' ? false : true,
                expireIn: new Date().setDate(new Date().getDate() + expireDate)
            }]
        });
        await newLink.save();
        return res.status(200).json({ type: type, classId: classData.id, inviteid: id, expireIn: new Date().setDate(new Date().getDate() + expireDate), accesstoken: req.accesstoken });

    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//accept the invitation link by an user
//required headers [id,accesstoken,refreshtoken,classid]
//required body [inviteid] 
//used [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.post('/invite', validate, status, async (req, res) => {
    try {
        const user = req.user;
        const classId = req.headers.classid;
        const inviteId = req.body.inviteid;
        if (!classId || !inviteId) return res.sendStatus(400);
        const invite = await InviteModel.findOne({ classId: classId });
        if (!invite) return res.sendStatus(404);
        const inviteData = invite.inviteIds.find(e => e.id === inviteId)
        if (!inviteData) return res.sendStatus(404);
        if (inviteData.expireIn < new Date()) {
            //delete this info
            //
            return res.sendStatus(404);
        }
        if (req.status) {
            return res.status(200).json({ status: 'failed', reason: 'You are already a part of this class room', accesstoken: req.accesstoken });
        }
        const classData = await ClassModel.findOne({ id: classId });
        if (!classData) return res.sendStatus(404);
        if (inviteData.type === 'teacher') {
            const teacher = new TeacherModel({
                id: user.id,
            })
            classData.teachers.push(teacher);
            await classData.save();
            return res.status(200).json({ status: 'success', type: 'teacher', accesstoken: req.accesstoken });
        }
        const student = new StudentModel({
            id: user.id,
        })
        classData.students.push(student);
        await classData.save();
        return res.status(200).json({ status: 'success', type: 'student', accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})

module.exports = Router;