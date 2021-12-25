const { ClassModel } = require("../mongodb/classroom");
const { UserModel } = require("../mongodb/user");


//send the information of the classroom from the perspective of the user
//THIS NEEDS [VALIDATE,STATUS] MIDDLEWARE TO EXECUTE FIRST
//required headers [id,accesstoken,refreshtoken,classid]
//ADDS [VIEW] to req(accessed as req.view from next middleware)
const classView = async (req, res, next) => {
    try {
        const user = req.user;
        const status = req.status;
        if (!status) return res.sendStatus(403);
        const classData = await ClassModel.findOne({ id: req.headers.classid });
        var information = { ...status, shadow: classData.shadow ? true : false, information: classData.information };
        const teachers = classData.teachers.map(e => {
            return { id: e.id, information: e.information, role: e.role };
        });
        const users_teachers = await UserModel.find({ id: { $in: classData.teachers.map(e => e.id) } }, 'id name');
        information.teachers = teachers.map(e => {
            const data = users_teachers.find(d => d.id === e.id);
            if (data.id === user.id && e.id === user.id) {
                information.requestedPerson = {
                    name: data.name, ...e
                }
            }
            if (data) {
                return { name: data.name, ...e }
            }
        });
        const students = classData.students.map(e => {
            return { id: e.id, information: e.information };
        });
        const users_students = await UserModel.find({ id: { $in: classData.students.map(e => e.id) } }, 'id name');
        information.students = students.map(e => {
            const data = users_students.find(d => d.id === e.id);
            if (data.id === user.id && e.id === user.id) {
                information.requestedPerson = {
                    name: data.name, ...e
                }
            }
            if (data) {
                return { name: data.name, ...e }
            }
        });
        if (classData.shadow) {
            if (status.student) {
                information.students = null;
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