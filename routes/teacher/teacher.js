const Router=require('express').Router();
const { status } = require('../../middleware/role');
const { validate } = require('../../middleware/validation');
const { ClassModel } = require('../../mongodb/classroom');
const { TeacherModel, TeacherInformationModel } = require('../../mongodb/teacherSchema');


//get all the information of a teacher(can be accessed by members of class)
//required headers [id,accesstoken,refreshtoken,classid,memberid]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.get('/info',validate,status,async(req,res)=>{
    try {
        const memeberId=req.headers.memberid;
        const classId=req.headers.classid;
        if(!memeberId || !classId)return res.status(400).json('missing field(s) [memberid,classid]');
        if(!req.status)return res.status(403).json('user is not a part of the class');
        const classData=await ClassModel.findOne({id:classId});
        if(!classData)return res.status(404).json('class not found');
        const teacher=await TeacherModel.findOne({id:memeberId,classId:classId},'-_id -__v');
        if(!teacher)return res.status(404).json('teacher not found');
        const information={...teacher.toObject(),topInformation:teacher.topInformation()}
        return res.status(200).json({student:information,accesstoken:req.accesstoken})
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});
//add new information of a teacher(can be done by the user)
//required headers [id,accesstoken,refreshtoken,classid]
//required body [fieldname,fieldvalue,priority]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.post('/info',validate,status,async(req,res)=>{
    try {
        const memeberId=req.user.id;
        const classId=req.headers.classid;
        const fieldName=req.body.fieldname;
        const fieldValue=req.body.fieldvalue;
        const priority=req.body.priority;
        if(!memeberId || !classId )return res.status(400).json('missing field(s) [classid]');
        if(!fieldName || !fieldValue || !priority)return res.status(400).json('missing field(s) [fieldName,fieldValue,priority]');
        if(!req.status)return res.status(403).json('user is not a part of the class');
        if(!req.status.teacher)return res.status(403).json('user is not a teacher');
        const teacher=await TeacherModel.findOne({id:memeberId,classId:classId});
        if(!teacher)return res.status(404).json('teacher not found');
        const foundInformation=teacher.information.find(i=>i.name===fieldName);
        if(foundInformation)return res.status(409).json(`${fieldName} already present`);
        const newInformation=new TeacherInformationModel({
            name: fieldName,
            value: fieldValue,
            priority:+priority
        });
        teacher.information.push(newInformation);
        await teacher.save();
        const response=await TeacherModel.findOne({id:memeberId,classId:classId},'-_id -__v');
        const information={...response.toObject(),topInformation:response.topInformation()}
        return res.status(200).json({information:information,accesstoken:req.accesstoken})
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//update information of a student(can be done by the user)
//required headers [id,accesstoken,refreshtoken,classid]
//required body [fieldname,fieldvalue,priority]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.patch('/info',validate,status,async(req,res)=>{
    try {
        const memeberId=req.user.id;
        const classId=req.headers.classid;
        const fieldName=req.body.fieldname;
        const fieldValue=req.body.fieldvalue;
        const priority=req.body.priority;
        if(!memeberId || !classId )return res.status(400).json('missing field(s) [memberid,classid]');
        if(!fieldName || !fieldValue || !priority)return res.status(400).json('missing field(s) [memberid,classid,]');
        if(memeberId!==req.user.id)return res.status(403).json('this information can only be modified by the same user')
        if(!req.status)return res.status(403).json('user is not a part of the class');
        if(!req.status.teacher)return res.status(403).json('user is not a teacher');
        const teacher=await TeacherModel.findOneAndUpdate(
            {id:memeberId,classId:classId,"information.name":fieldName},
            {$set:{"information.$.value":fieldValue,"information.$.priority":priority}
        });
        if(!teacher)return res.status(409).json(`${fieldName} not found`);
        const response=await TeacherModel.findOne({id:memeberId,classId:classId},'-_id -__v');
        const information={...response.toObject(),topInformation:response.topInformation()}
        return res.status(200).json({information:information,accesstoken:req.accesstoken})
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});
//delete information of a teacher(can be done by the user)
//required headers [id,accesstoken,refreshtoken,classid]
//required body [fieldname]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.delete('/info',validate,status,async(req,res)=>{
    try {
        const memeberId=req.user.id;
        const classId=req.headers.classid;
        const fieldName=req.body.fieldname;
        if(!classId )return res.status(400).json('missing field(s) [classid]');
        if(!fieldName)return res.status(400).json('missing field(s) [fieldname]');
        if(!req.status)return res.status(403).json('user is not a part of the class');
        const teacher=await TeacherModel.findOne({id:memeberId,classId:classId},'-_id -__v');
        const foundInformation=teacher.information.find(i=>i.name===fieldName);
        if(!foundInformation)return res.status(409).json(`${fieldName} not found`);
        await TeacherModel.findOneAndUpdate({ id: memeberId, classId: classId }, { $pull: { information: { name : fieldName} } });
        const response=await TeacherModel.findOne({id:memeberId,classId:classId},'-_id -__v');
        const information={...response.toObject(),topInformation:response.topInformation()}
        return res.status(200).json({information:information,accesstoken:req.accesstoken})
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
})
module.exports=Router;
