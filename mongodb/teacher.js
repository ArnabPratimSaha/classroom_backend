const mongoose=require('mongoose');
const {userSchema}=require('./user');
const teacherSchema=new mongoose.Schema({
    nickName:{type:String},
    id:{type:mongoose.Schema.Types.ObjectId,ref:userSchema,unique:true,required:true}
});

const TeacherModel = mongoose.model('TeacherSchema', teacherSchema);

module.exports={TeacherModel,teacherSchema};