const mongoose=require('mongoose');
const inforamtionSchema=new mongoose.Schema({
    name:{type:String,required:true},
    value:{type:String,required:true},
    priority:{type:Number,required:true,default:-1},
    required:{type:Boolean,default:false}
})
const studentSchema=new mongoose.Schema({
    id:{ type:String,required:true },
    className:{ type:String,required:true },
    classId:{type:String,required:true},
    information:{type:Array,default:()=>[]}
});
studentSchema.methods.topInformation=function () {
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

const StudentModel= mongoose.model('Student', studentSchema);
const StudentInformationModel=mongoose.model('StudentInformation', inforamtionSchema);
module.exports={StudentModel,StudentInformationModel}