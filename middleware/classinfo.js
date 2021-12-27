const { ClassModel, TeacherModel, StudentModel } = require("../mongodb/classroom");
const { UserModel } = require("../mongodb/user");


//send the information of the classroom from the perspective of the user
//THIS NEEDS [VALIDATE,STATUS] MIDDLEWARE TO EXECUTE FIRST
//required headers [id,accesstoken,refreshtoken,classid]
//ADDS [VIEW] to req(accessed as req.view from next middleware)
const classView = async (req, res, next) => {
    try {
        const user = req.user;
        const status = req.status;
        if (!status) return res.status(403).json('user is not part of the class');
        const classData = await ClassModel.findOne({ id: req.headers.classid });
        var information = { ...status, shadow: classData.shadow ? true : false, information: classData.information,totalMemberCount:classData.totalMemberCount };
        const teachers = await TeacherModel.find({ id: { $in: classData.teachers },classId:classData.id }, '-_id -__v');
        information.teachers = teachers.map(e => {
            if(e.id===user.id){
                information.requestedPerson=e;
            }
            return e;
        });
        const students = await StudentModel.find({ id: { $in: classData.students },classId:classData.id }, '-_id -__v');
        information.students = students.map(e => {
            if(e.id===user.id){
                information.requestedPerson=e;
            }
            return e;
        });
        if (classData.shadow) {
            if (status.student) {
                information.students = undefined;
                information.totalMemberCount=undefined;
            }
        }
        req.view = information;
        next();
        return;
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
}
module.exports = { classView }