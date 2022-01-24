const mongoose=require('mongoose');
const teacherSchema = new mongoose.Schema({
    id: { type: String, required: true },
    className: { type: String, required: true },
    classId: { type: String, required: true },
    role: { type: String, enum: ['admin', 'basic'], default: 'basic' },
    information: { type: Array, default: () => [] }
});
const inforamtionSchema=new mongoose.Schema({
    name:{type:String,required:true},
    value:{type:String,required:true},
    priority:{type:Number,required:true,default:-1},
});
teacherSchema.methods.topInformation=function () {
    try {
        let highestPriorityInfo = this.information[0];
        this.information.forEach(f => {
            if (f.priority > highestPriorityInfo.priority) {
                highestPriorityInfo = f;
            }
        });
        return highestPriorityInfo;
    } catch (error) {
        console.log(error);
        return null;
    }
}

const TeacherModel= mongoose.model('Teacher', teacherSchema);
const TeacherInformationModel=mongoose.model('TeacherInformation', inforamtionSchema);
module.exports={TeacherModel,TeacherInformationModel}