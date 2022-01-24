const Router=require('express').Router();
const { admin, status } = require("../../middleware/role");
const { validate } = require("../../middleware/validation");
const { ClassModel } = require("../../mongodb/classroom");
const { InviteModel } = require("../../mongodb/invitelink");
const { StudentModel, StudentInformationModel } = require('../../mongodb/studentSchema');
const { v4: uuidv4 } = require('uuid');
//create an invite link-can only be created by an admin
//required headers [id,accesstoken,refreshtoken,expi(default 1 day),type(default student)]
//uses [VALIDATE,ADMIN] middleware(see those middleware for full info)
Router.put('/link', validate, admin, async (req, res) => {
    try {
        const type = req.headers.type || 'student';
        const expireDate = req.headers.expi || 1;
        const link = await InviteModel.findOne({ classId: req.headers.classid });
        const id = uuidv4();
        if (link) {
            link.inviteIds.push({
                id: id,
                type: type,
                show: type === 'teacher' ? false : true,
                expireIn: new Date().setDate(new Date().getDate() + expireDate)
            })
            await link.save();
            return res.status(200).json({ type: type, classId: req.headers.classid, inviteid: id, expireIn: new Date().setDate(new Date().getDate() + expireDate), accesstoken: req.accesstoken });
        }
        const newLink = new InviteModel({
            classId: req.headers.classid,
            inviteIds: [{
                id: id,
                type: type,
                show: type === 'teacher' ? false : true,
                expireIn: new Date().setDate(new Date().getDate() + expireDate)
            }]
        });
        await newLink.save();
        return res.status(200).json({ type: type, classId: req.headers.classid, inviteid: id, expireIn: new Date().setDate(new Date().getDate() + expireDate), accesstoken: req.accesstoken });

    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//see the information about an invite link-can only be seen by someone  not in the classroom
//required headers [id,accesstoken,refreshtoken,inviteid]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.get('/link', validate, status, async (req, res) => {
    try {
        if (req.status) return res.status(409).json('user is aleady part of the class');
        const classId = req.headers.classid;
        const inviteId = req.headers.inviteid;
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
Router.post('/link', validate, status, async (req, res) => {
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
                classId:classData.id,
                className:user.name
            });
            classData.teachers.push(user.id);
            user.classes.push(classId);
            await teacher.save();
            await classData.save();
            await user.save();
            return res.status(200).json({ classid: classId, type: 'teacher', accesstoken: req.accesstoken });
        }
        const student = new StudentModel({
            id: user.id,
            classId:classData.id,
            information:[],
            className:user.name
        });
        let highestPriorityInfo=classData.requiredFields[0];
        classData.requiredFields.forEach(f=>{
            if(!fields.get(f.name))return res.status(400).json(`${f.name} not found`);
            if(f.priority>highestPriorityInfo.priority){
                highestPriorityInfo=f;
            }
            const info = new StudentInformationModel({
                name: f.name,
                value: fields.get(f.name),
                priority: f.priority,
                required:true
            });
            student.information.push(info);
        });
        // student.topInfo={name:highestPriorityInfo.name,value:fields.get(highestPriorityInfo.name)};
        classData.students.push(user.id);
        user.classes.push(classId);
        await classData.save();
        await student.save();
        await user.save();
        return res.status(200).json({ classid: classId, type: 'student', accesstoken: req.accesstoken });
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
})

module.exports=Router;