
const { ClassModel } = require("../mongodb/classroom");
//this validates the user if an admin of a class or not
//THIS NEEDS [VALIDATE] MIDDLEWARE TO EXECUTE FIRST
//required headers [id,accesstoken,refreshtoken]
//ADDS [user,accesstoken,refreshtoken] to req(accessed as req.user from next middleware)
const admin = async (req, res, next) => {
    try {
        const data = await ClassModel.findOne({ id: req.headers.classid });
        if (!data) return res.sendStatus(404);
        if (data.teachers.find(e=>e.id===req.user.id) && data.teachers.find(e => e.role === 'admin')) {
            //admin role
            req.class=data;
            next();
            return;
        }
        return res.sendStatus(403);
    } catch (error) {
        
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
        if (!data) return res.sendStatus(404);
        const status={};
        if (data.teachers.find(e => e.id === req.user.id)) {
            //teacher
            status.teacher = true;
            if (data.teachers.find(e => e.role === 'admin'))
                status.admin = true;
            req.status = status;
            next();
            return;
        }
        if(data.students.find(e => e.id === req.user.id)){
            status.student = true;
            req.status = status;
            next();
            return;
        }
        next();
        return;
    } catch (error) {
        console.log(e);
        return res.sendStatus(500);
    }
}

module.exports = { admin,status }


