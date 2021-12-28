const Router=require('express').Router();
const { status } = require('../../middleware/role');
const { validate } = require('../../middleware/validation');
const { ClassModel } = require('../../mongodb/classroom');
const { StudentModel, StudentInformationModel } = require('../../mongodb/studentSchema');


//get all the information of a student(can be accessed by members of class)
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
        if(req.status.student && classData.shadow)return res.status(403).json('class is shadowed');
        const student=await StudentModel.findOne({id:memeberId,classId:classId},'-_id -__v');
        if(!student)return res.status(404).json('student not found');
        const information={...student.toObject(),topInformation:student.topInformation()}
        return res.status(200).json({student:information,accesstoken:req.accesstoken})
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//add new information of a student(can be done by the user who is student)
//required headers [id,accesstoken,refreshtoken,classid,memberid]
//required body [fieldname,fieldvalue]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.post('/info',validate,status,async(req,res)=>{
    try {
        const memeberId=req.headers.memberid;
        const classId=req.headers.classid;
        const fieldName=req.body.fieldname;
        const fieldValue=req.body.fieldvalue;
        if(!memeberId || !classId )return res.status(400).json('missing field(s) [memberid,classid]');
        if(!fieldName || !fieldValue )return res.status(400).json('missing field(s) [memberid,classid]');
        if(memeberId!==req.user.id)return res.status(403).json('this information can only be modified by the same user')
        if(!req.status)return res.status(403).json('user is not a part of the class');
        const student=await StudentModel.findOne({id:memeberId,classId:classId});
        const newInformation=new StudentInformationModel({
            name: fieldName,
            value: fieldValue,
        });
        student.information.push(newInformation);
        await student.save();
        const response=await StudentModel.findOne({id:memeberId,classId:classId},'-_id -__v');
        const information={...student.toObject(),topInformation:student.topInformation()}
        return res.status(200).json({information:information,accesstoken:req.accesstoken})
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//update information of a student(can be done by the user who is student)
//required headers [id,accesstoken,refreshtoken,classid,memberid]
//required body [fieldname,fieldvalue]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.patch('/info',validate,status,async(req,res)=>{
    try {
        const memeberId=req.headers.memberid;
        const classId=req.headers.classid;
        const fieldName=req.body.fieldname;
        const fieldValue=req.body.fieldvalue;
        if(!memeberId || !classId )return res.status(400).json('missing field(s) [memberid,classid]');
        if(!fieldName || !fieldValue )return res.status(400).json('missing field(s) [memberid,classid]');
        if(memeberId!==req.user.id)return res.status(403).json('this information can only be modified by the same user')
        if(!req.status)return res.status(403).json('user is not a part of the class');
        const student=await StudentModel.findOne({id:memeberId,classId:classId});
        const newInformation=new StudentInformationModel({
            name: fieldName,
            value: fieldValue,
        });
        student.information.push(newInformation);
        await student.save();
        const response=await StudentModel.findOne({id:memeberId,classId:classId},'-_id -__v');
        const information={...student.toObject(),topInformation:student.topInformation()}
        return res.status(200).json({information:information,accesstoken:req.accesstoken})
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
module.exports=Router;
