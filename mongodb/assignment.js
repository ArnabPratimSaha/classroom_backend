const mongoose=require('mongoose');

const assignmentSchema=new mongoose.Schema({
    id:{type:String,required:true,unique:true},
    classId:{type:String,required:true},
    title:{type:String,required:true},
    details:{type:String},
    createdAt:{type:Date,default:new Date()},
    lastSubmittedDate:{type:Date,default:null},
    submittedStudent:{type:Array,default:[]},
});
const studentAssignmentSchema=new mongoose.Schema({
    assignmentId:{type:String,required:true},
    studentId:{type:String,required:true},
    classId:{type:String,required:true},
    files:{type:Array,maxlength:20},
    submittedAt:{type:Date,default:new Date()}
});

const AssignmentModel=mongoose.model('Assignment',assignmentSchema);
const StudentAssignmentModel=mongoose.model('StudentAssignment', studentAssignmentSchema);
module.exports={AssignmentModel,StudentAssignmentModel};