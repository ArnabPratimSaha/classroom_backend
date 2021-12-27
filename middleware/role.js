
const { ClassModel, StudentModel, TeacherModel } = require("../mongodb/classroom");
//this validates if the user is an admin of a class or not
//THIS NEEDS [VALIDATE] MIDDLEWARE TO EXECUTE FIRST
//required headers [id,accesstoken,refreshtoken,classid]
//ADDS [user,accesstoken,refreshtoken] to req(accessed as req.user from next middleware)
const admin = async (req, res, next) => {
    try {
        if(!req.headers.classid)return res.status(400).json('missing header classid');
        const data = await ClassModel.findOne({ id: req.headers.classid });
        if (!data) return res.status(404).json('class not found');
        const teacher=await TeacherModel.findOne({id:req.user.id,classId:data.id});
        if(teacher && teacher.role==="admin"){
            next();
            return;
        }
        return res.status(403).json('user does not have any access.');
    } catch (error) {
        console.log(e);
        return res.sendStatus(500);
    }
}
//this validates the user if he/she is present in the class or not
//THIS NEEDS [VALIDATE] MIDDLEWARE TO EXECUTE FIRST
//required headers [id,accesstoken,refreshtoken,classid]
//ADDS [status] to req(accessed as req.status from next middleware)
//  if[ user is not in the classsroom ]  status is undefined
//  if[ user is present in the classroom ]
//      if[ user is a teacher ] status.teacher is true
//              if[ teacher is admin ]status.admin is true
//      if[ user is a student ] status.student is true
const status=async (req, res, next) => {
    try {
        const data = await ClassModel.findOne({ id: req.headers.classid });
        if (!data) return res.status(404).json('class not found');
        const status={};
        if (data.teachers.find(e => e === req.user.id)) {
            //teacher
            status.teacher = true;
            const teacher=await TeacherModel.findOne({id:req.user.id,classId:data.id});
            if(teacher.role==='admin') status.admin = true;
            req.status = status;
        }
        if(data.students.find(e => e === req.user.id)){
            status.student = true;
            req.status = status;
        }
        next();
        return;
    } catch (error) {
        console.log(e);
        return res.sendStatus(500);
    }
}

module.exports = { admin,status }


