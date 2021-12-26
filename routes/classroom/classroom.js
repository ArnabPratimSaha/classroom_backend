const { validate } = require("../../middleware/validation");
const Router = require("../authentication/authentication");
const { v4: uuidv4 } = require('uuid');
const { TeacherModel, ClassModel, StudentModel, FieldModel, MemberInformationModel } = require("../../mongodb/classroom");
const { admin, status } = require('../../middleware/role');
const { InviteModel } = require("../../mongodb/invitelink");
const { UserModel } = require("../../mongodb/user");
const { classView } = require("../../middleware/classinfo");
//create a classroom by an user
//required headers [id,accesstoken,refreshtoken]
//required body [name,description(not required),fields(not required)]
//uses [VALIDATE] middleware(see those middleware for full info)
Router.post('/create', validate, async (req, res) => {
    try {
        const user = req.user;
        const name = req.body.name;
        if(!name)return res.status(400).json('missing field(s) [name]');
        const description = req.body.description;
        var studentFields = (req.body.fields || '').split(' ');
        const teacher = new TeacherModel({
            id: user.id,
            role: 'admin',
        });
        const classId = uuidv4();
        const newclass = new ClassModel({
            id: classId,
            name: name,
            createdAt: new Date(),
            description: description,
            teachers: [teacher],
            students: [],
        });
        newclass.requiredFields = [];
        studentFields.forEach(s => {
            newclass.requiredFields.push(new FieldModel({
                name: s.split('>')[0],
                priority: s.split('>')[1]
            }))
        });
        if (!user.classes) user.classes = [classId];
        else user.classes.push(classId);
        await user.save();
        const response = await newclass.save();
        res.status(200).json({  class: response,accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//create an invite link-can only be created by an admin
//required headers [id,accesstoken,refreshtoken,expi(default 30 days),type(default student)]
//uses [VALIDATE,ADMIN] middleware(see those middleware for full info)
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
//see the information about an invite link-can only be seen by someone  not in the classroom
//required headers [id,accesstoken,refreshtoken]
//required body [inviteid] 
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.get('/invite/info', validate, status, async (req, res) => {
    try {
        if (req.status) return res.status(409).json('user is aleady part of the class');
        const classId = req.headers.classid;
        const inviteId = req.body.inviteid;
        const invite = await InviteModel.findOne({ classId: classId });
        if (!invite) return res.status(404).json('invite not found');
        const inviteData = invite.inviteIds.find(e => e.id === inviteId)
        if (!inviteData) return res.status(404).json('invalid invite id');
        if (inviteData.expireIn < new Date()) {
            //delete this info
            //
            return res.sendStatus(404);
        }
        const classData = await ClassModel.findOne({ id: classId }, '-_id id name requiredFields totalMemberCount information shadow teachers');
        return res.status(200).json({ class: classData, invite: inviteId, accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})

//accept the invitation link by an user
//required headers [id,accesstoken,refreshtoken,classid]
//required body [inviteid] 
//uses [VALIDATE,STATUS] middleware (see those middleware for full info)
Router.post('/invite', validate, status, async (req, res) => {
    try {
        const user = req.user;
        const classId = req.headers.classid;
        const inviteId = req.body.inviteid;
        const fields=new Map(req.body.fields||[]);
        if (!inviteId) return res.status(400).json('missing field(s) [inviteid]');
        const invite = await InviteModel.findOne({ classId: classId });
        if (!invite) return res.status(404).json('invite not found');
        const inviteData = invite.inviteIds.find(e => e.id === inviteId)
        if (!inviteData) return res.status(404).json('invalid invite id');
        if (inviteData.expireIn < new Date()) {
            //delete this info
            return res.status(404).json('invite expired');
        }
        if (req.status) {
            return res.status(409).json('user is aleady part of the class');
        }
        const classData = await ClassModel.findOne({ id: classId });
        if (!classData) return res.status(404).json('class not found');
        if (classData.totalMemberCount >= 200) return res.status(409).json('class is full');
        if (inviteData.type === 'teacher') {
            const teacher = new TeacherModel({
                id: user.id,
            });
            classData.teachers.push(teacher);
            await classData.save();
            user.classes.push(classId);
            await user.save();
            return res.status(200).json({ classid: classId, type: 'teacher', accesstoken: req.accesstoken });
        }
        const student = new StudentModel({
            id: user.id,
            information:[]
        });
        let highestPriorityInfo=classData.requiredFields[0];
        classData.requiredFields.forEach(f=>{
            if(!fields.get(f.name))return res.status(400).json(`${f.name} not found`);
            if(f.priority>highestPriorityInfo.priority){
                highestPriorityInfo=f;
            }
            const info = new MemberInformationModel({
                name: f.name,
                value: fields.get(f.name),
                priority: f.priority
            });
            student.information.push(info);
        });
        student.topInfo={name:highestPriorityInfo.name,value:fields.get(highestPriorityInfo.name)};
        classData.students.push(student);
        await classData.save();
        user.classes.push(classId);
        await user.save();
        return res.status(200).json({ classid: classId, type: 'student', accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})

//get information of a classroom by an user (if the user is in the classroom)
//required headers [id,accesstoken,refreshtoken,classid]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.get('/info', validate, status, classView, async (req, res) => {
    try {
        if (!req.headers.q) return res.status(200).json(req.view);
        const query = req.headers.q.split(' ');
        var view = { teacher: req.view.teacher, student: req.view.student, admin: req.view.admin, requestedPerson: req.view.requestedPerson };
        query.forEach(e => {
            if (e === 'teacher') view.teachers = req.view.teachers;
            if (e === 'student') view.students = req.view.students;
        });
        res.status(200).json({ ...view, accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
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
        if (!fieldName || !fieldValue) return res.status(400).json('missing field(s) [fieldname,fieldvalue]');
        const classData = await ClassModel.findOne({ id: req.headers.classid });
        if (!classData) return res.sendStatus(400);
        if (!classData.information) classData.information = new Map();
        if (classData.information.has(fieldName)) return res.status(409).json(`${fieldName} already present`);//conflict
        classData.information.set(fieldName, fieldValue);
        const response = await classData.save();
        const sendData = await ClassModel.findOne({ id: response.id }, '-_id id name information');
        return res.status(200).json({ class: sendData, accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        res.status(500);
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
        if (!fieldName || !fieldValue)  return res.status(400).json('missing field(s) [fieldname,fieldvalue]');
        if (!req.headers.classid) return res.sendStatus(400);
        const classData = await ClassModel.findOne({ id: req.headers.classid });
        if (!classData) return res.sendStatus(400);
        if (!classData.information) classData.information = new Map();
        if (!classData.information.has(fieldName)) return res.status(409).json(`${fieldName} not found`);//conflict
        classData.information.set(fieldName, fieldValue);
        const response = await classData.save();
        const sendData = await ClassModel.findOne({ id: response.id }, '-_id id name information');
        return res.status(200).json({ class: sendData, accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
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
        if (!classData.information.has(fieldName)) return res.status(409).json(`${fieldName} not found`);//conflict
        classData.information.delete(fieldName);
        const response = await classData.save();
        const sendData = await ClassModel.findOne({ id: response.id }, '-_id id name information');
        return res.status(200).json({ class: sendData, accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//kick an user from a classroom
//required headers [id,accesstoken,refreshtoken,classid]
//require body [memberid(student || teacher basically the userid)]
//used [VALIDATE,ADMIN] middleware(see those middleware for full info)
Router.delete('/kick', validate, admin, async (req, res) => {
    try {
        const memberid = req.body.memberid;
        if (!req.headers.classid || !memberid) return res.status(400).json('missing fields either [classid,memberid]');
        if (req.user.id === memberid) return res.status(403).json('can not kick oneself');
        const classData = await ClassModel.findOne({ id: req.headers.classid });
        var member = {};
        classData.teachers.forEach(t => {
            if (t.id === memberid) {
                member.info = t, member.type = 'teacher';
                classData.teachers = classData.teachers.filter(i => i.id !== memberid);
            }
        });
        classData.students.forEach(s => {
            if (s.id === memberid) {
                member.info = s, member.type = 'student';
                classData.students = classData.students.filter(i => i.id !== memberid);
            }
        });
        if (!member.info) return res.status(404).json('user not found');
        const kickedUser = await UserModel.findOne({ id: member.info.id });
        kickedUser.classes = kickedUser.classes.filter(k => k != req.headers.classid);
        await classData.save();
        await kickedUser.save();
        const response = await ClassModel.findOne({ id: req.headers.classid }, '-_id');
        return res.status(200).json({class:response,accesstoken:req.accesstoken});
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})


module.exports = Router;