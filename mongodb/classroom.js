const mongoose=require('mongoose');
const { userSchema } = require('./user');

const teacherSchema=new mongoose.Schema({
    id:{ type:String,required:true },
    role:{type:String,enum:['admin','basic'],default:'basic'},
    information:{type:Object}
})
const studentSchema=new mongoose.Schema({
    id:{ type:String,required:true },
    information:{type:Object}
})

const classSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    createdAt : {type:Date,default:()=>new Date()},
    description: {type:String},
    teachers :  [teacherSchema],
    students : [studentSchema],
    shadow:{type:Boolean,default:false},
    information:{type:Object}
});

const ClassModel = mongoose.model('Class', classSchema);
const TeacherModel= mongoose.model('Teacher', teacherSchema);
const StudentModel= mongoose.model('Student', studentSchema);

module.exports={ClassModel,TeacherModel,StudentModel};