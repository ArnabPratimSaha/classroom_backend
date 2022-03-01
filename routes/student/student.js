const Router=require('express').Router();
const { deleteFiles } = require('../../functions/handleFile');
const { status } = require('../../middleware/role');
const { validate } = require('../../middleware/validation');
const { StudentAssignmentModel, AssignmentModel } = require('../../mongodb/assignment');
const { ClassModel } = require('../../mongodb/classroom');
const { StudentModel, StudentInformationModel } = require('../../mongodb/studentSchema');
const { UserModel } = require('../../mongodb/user');


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
        return res.sendStatus(500);
    }
});
//add new information of a student(can be done by the user who is student)
//required headers [id,accesstoken,refreshtoken,classid]
//required body [fieldname,fieldvalue]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.post('/info',validate,status,async(req,res)=>{
    try {
        const memeberId=req.user.id;
        const classId=req.headers.classid;
        const fieldName=req.body.fieldname;
        const fieldValue=req.body.fieldvalue;
        if(!memeberId || !classId )return res.status(400).json('missing field(s) [classid]');
        if(!fieldName || !fieldValue )return res.status(400).json('missing field(s) [classid]');
        if(!req.status)return res.status(403).json('user is not a part of the class');
        if(!req.status.student)return res.status(403).json('user is not a student');
        const student=await StudentModel.findOne({id:memeberId,classId:classId});
        if(!student)return res.status(404).json('student not found');
        const foundInformation=student.information.find(i=>i.name===fieldName);
        if(foundInformation)return res.status(409).json(`${fieldName} already present`);
        const newInformation=new StudentInformationModel({
            name: fieldName,
            value: fieldValue,
        });
        student.information.push(newInformation);
        await student.save();
        const response=await StudentModel.findOne({id:memeberId,classId:classId},'-_id -__v');
        const information={...response.toObject(),topInformation:student.topInformation()}
        return res.status(200).json({information:information,accesstoken:req.accesstoken})
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//update information of a student(can be done by the user who is student)
//required headers [id,accesstoken,refreshtoken,classid]
//required body [fieldname,fieldvalue]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.patch('/info',validate,status,async(req,res)=>{
    try {
        const memeberId=req.user.id;
        const classId=req.headers.classid;
        const fieldName=req.body.fieldname;
        const fieldValue=req.body.fieldvalue;
        if(!memeberId || !classId )return res.status(400).json('missing field(s) [memberid,classid]');
        if(!fieldName || !fieldValue )return res.status(400).json('missing field(s) [memberid,classid]');
        if(memeberId!==req.user.id)return res.status(403).json('this information can only be modified by the same user')
        if(!req.status)return res.status(403).json('user is not a part of the class');
        if(!req.status.student)return res.status(403).json('user is not a student');
        const student=await StudentModel.findOneAndUpdate({id:memeberId,classId:classId,"information.name":fieldName},{$set:{"information.$.value":fieldValue}});
        if(!student)return res.status(409).json(`${fieldName} not found`);
        const response=await StudentModel.findOne({id:memeberId,classId:classId},'-_id -__v');
        const information={...response.toObject(),topInformation:response.topInformation()}
        return res.status(200).json({information:information,accesstoken:req.accesstoken})
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});
//delete information of a student(can be done by the user who is student)
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
        if(!req.status.student)return res.status(403).json('user is not a student');
        const student=await StudentModel.findOne({id:memeberId,classId:classId},'-_id -__v');
        const foundInformation=student.information.find(i=>i.name===fieldName);
        if(!foundInformation)return res.status(409).json(`${fieldName} not found`);
        if(foundInformation.required===true)return res.status(409).json(`${fieldName} can not be deleted`);
        await StudentModel.findOneAndUpdate({ id: memeberId, classId: classId }, { $pull: { information: { name : fieldName} } });
        const response=await StudentModel.findOne({id:memeberId,classId:classId},'-_id -__v');
        const information={...response.toObject(),topInformation:response.topInformation()}
        return res.status(200).json({information:information,accesstoken:req.accesstoken})
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});
//leave a class as a student(can be done by the user who is student)
//required headers [id,accesstoken,refreshtoken,classid]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.delete('/leave',validate,status,async(req,res)=>{
    try {
        const memeberId=req.user.id;
        const classId=req.headers.classid;
        if(!classId )return res.status(400).json('missing field(s) [classid]');
        if(!req.status)return res.status(403).json('user is not a part of the class');
        if(!req.status.student)return res.status(403).json('user is not a student');
        const student=await StudentModel.findOne({id:memeberId,classId:classId});
        if(!student)return res.status(404).json('student not found');
        const assignments=await StudentAssignmentModel.find({studentId:memeberId,classId:classId});
        const assignmentIds=assignments.map(a=>{
            deleteFiles(a.files);
            return a.assignmentId;
        });
        await AssignmentModel.updateMany({classId:classId,submittedStudent:{$in:memeberId}},{$pull:{submittedStudent:memeberId}})
        await StudentModel.findOneAndDelete({id:memeberId,classId:classId});
        await StudentAssignmentModel.deleteMany({studentId:memeberId,classId:classId});
        await ClassModel.findOneAndUpdate({id:classId},{$pull:{students:memeberId}});
        await UserModel.findOneAndUpdate({id:memeberId},{$pull:{classes:classId}});
        res.status(200).json({accesstoken:req.accesstoken});
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});
module.exports=Router;
