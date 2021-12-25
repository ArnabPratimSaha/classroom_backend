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
        const classId=uuidv4();
        const newclass = new ClassModel({
            id: classId,
            name: name,
            createdAt: new Date(),
            description: description,
            teachers: [teacher],
            students: [],
        });
        if(!user.classes)user.classes=[classId];
        else user.classes.push(classId);
        await user.save();
        const response = await newclass.save();
        res.status(200).json({ accesstoken: req.accesstoken, response: response });
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});


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
            return res.status(409).json('user is aleady part of the class');
        }
        const classData = await ClassModel.findOne({ id: classId });
        if (!classData) return res.sendStatus(404);
        if (inviteData.type === 'teacher') {
            const teacher = new TeacherModel({
                id: user.id,
            })
            classData.teachers.push(teacher);
            await classData.save();
            user.classes.push(classId);
            await user.save();
            return res.status(200).json({ classid: classId, type: 'teacher', accesstoken: req.accesstoken });
        }
        const student = new StudentModel({
            id: user.id,
        })
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
        res.status(200).json({...view,accesstoken:req.accesstoken});
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})
//add new information about a classroom by an user (if the user is in the classroom)
//required headers [id,accesstoken,refreshtoken,classid,fieldname,fieldvalue]
//used [VALIDATE,ADMIN] middleware(see those middleware for full info)
Router.post('/info', validate, admin, async (req, res) => {
    try {
        const fieldName = req.body.fieldname;
        const fieldValue = req.body.fieldvalue;
        if(!fieldName || !fieldValue)return res.sendStatus(400);
        if(!req.headers.classid)return res.sendStatus(400);
        const classData=await ClassModel.findOne({id:req.headers.classid});
        if(!classData)return res.sendStatus(400);
        if(!classData.information)classData.information=new Map();
        if(classData.information.has(fieldName))return res.status(409).json(`{${fieldName}} already present`);//conflict
        classData.information.set(fieldName,fieldValue);
        const response=await classData.save();
        const sendData=await ClassModel.findOne({id:response.id},'-_id id name information');
        res.status(200).json({...sendData,accesstoken:req.accesstoken});
    } catch (error) {
        console.log(error);
        res.status(500);
    }
});
//update information about a classroom by an user (if the user is in the classroom)
//required headers [id,accesstoken,refreshtoken,classid,fieldname,fieldvalue]
//used [VALIDATE,ADMIN] middleware(see those middleware for full info)
Router.patch('/info', validate, admin, async (req, res) => {
    try {
        const fieldName = req.body.fieldname;
        const fieldValue = req.body.fieldvalue;
        if(!fieldName || !fieldValue)return res.sendStatus(400);
        if(!req.headers.classid)return res.sendStatus(400);
        const classData=await ClassModel.findOne({id:req.headers.classid});
        if(!classData)return res.sendStatus(400);
        if(!classData.information)classData.information=new Map();
        if(!classData.information.has(fieldName))return res.status(409).json(`no such {${fieldName}} found`);//conflict
        classData.information.set(fieldName,fieldValue);
        const response=await classData.save();
        const sendData=await ClassModel.findOne({id:response.id},'-_id id name information');
        res.status(200).json({...sendData,accesstoken:req.accesstoken});
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//delete an information about a classroom by an user (if the user is in the classroom)
//required headers [id,accesstoken,refreshtoken,classid,fieldname]
//used [VALIDATE,ADMIN] middleware(see those middleware for full info)
Router.delete('/info', validate, admin, async (req, res) => {
    try {
        const fieldName = req.body.fieldname;
        if(!fieldName)return res.sendStatus(400);
        if(!req.headers.classid)return res.sendStatus(400);
        const classData=await ClassModel.findOne({id:req.headers.classid});
        if(!classData)return res.sendStatus(400);
        if(!classData.information)classData.information=new Map();
        if(!classData.information.has(fieldName))return res.status(409).json(`no such {${fieldName}} found`);//conflict
        classData.information.delete(fieldName);
        const response=await classData.save();
        const sendData=await ClassModel.findOne({id:response.id},'-_id id name information');
        res.status(200).json({...sendData,accesstoken:req.accesstoken});
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//kick an user from a classroom
//required headers [id,accesstoken,refreshtoken,classid,memberid(student || teacher)]
//used [VALIDATE,ADMIN] middleware(see those middleware for full info)
Router.delete('/kick',validate,admin,async(req,res)=>{
    try {
        const memberid = req.body.memberid;
        if(!req.headers.classid&& !memberid)return res.sendStatus(400);
        if(req.user.id===memberid)return res.status(403).json('can not kick oneself');
        const classData=await ClassModel.findOne({id:req.headers.classid});
        if(!classData)return res.sendStatus(400);
        var member={};
        classData.teachers.forEach(t => {
            if (t.id === memberid) {
                member.info = t, member.type = 'teacher';
                classData.teachers=classData.teachers.filter(i=>i.id!==memberid);
            }
        });
        classData.students.forEach(s => {
            if (s.id === memberid) {
                member.info = s, member.type = 'student';
                classData.students=classData.students.filter(i=>i.id!==memberid);
            }
        });
        if(!member.info)return res.status(404).json('user not found');
        const kickedUser=await UserModel.findOne({id:member.info.id});
        kickedUser.classes=kickedUser.classes.filter(k=>k!==member.info.id);
        await classData.save();
        await kickedUser.save();
        const response=await ClassModel.findOne({id:req.headers.classid},'-_id -__v');
        return res.status(200).json(response);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})


module.exports = Router;