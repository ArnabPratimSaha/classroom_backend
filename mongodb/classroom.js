const mongoose=require('mongoose');
const { userSchema } = require('./user');
const inforamtionSchema=new mongoose.Schema({
    name:{type:String,required:true},
    value:{type:String,required:true},
    priority:{type:Number,required:true,default:-1}
})

const teacherSchema=new mongoose.Schema({
    id:{ type:String,required:true },
    className:{ type:String,required:true },
    classId:{ type:String,required:true },
    role:{type:String,enum:['admin','basic'],default:'basic'},
    information:{type:Array,default:()=>[]}
})
const studentSchema=new mongoose.Schema({
    id:{ type:String,required:true },
    className:{ type:String,required:true },
    classId:{type:String,required:true},
    topInfo:{type:Object,default:()=>new Object()},
    information:{type:Array,default:()=>[]}
})
const fieldSchema=new mongoose.Schema({
    name:{type:String,required:true},
    priority:{type:Number,required:true,default:()=>-1}  
})
const classSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    createdAt : {type:Date,default:()=>new Date()},
    description: {type:String},
    teachers :  {type:Array,required:true,default:()=>[],maxlength:200},
    students : {type:Array,required:true,default:()=>[],maxlength:200},
    requiredFields:{type:Array,required:true,default:()=>[],maxlength:20},
    totalMemberCount:{type:Number,default:()=>1,required:true},
    shadow:{type:Boolean,default:false},
    information:{type:Map,default:()=>new Map()}
});

const ClassModel = mongoose.model('Class', classSchema);
const TeacherModel= mongoose.model('Teacher', teacherSchema);
const StudentModel= mongoose.model('Student', studentSchema);
const MemberInformationModel=mongoose.model('MemberInformation', inforamtionSchema);
const FieldModel=mongoose.model('Field', fieldSchema);
module.exports={ClassModel,TeacherModel,StudentModel,FieldModel,MemberInformationModel};