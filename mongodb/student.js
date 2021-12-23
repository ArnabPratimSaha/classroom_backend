const mongoose=require('mongoose');
const {userSchema}=require('./user');
const studentSchema=new mongoose.Schema({
    nickName:{type:String},
    roll:{type:String},
    id:{type:mongoose.Schema.Types.ObjectId,ref:userSchema,unique:true,required:true}
});

const StudentModel = mongoose.model('StudentSchema', studentSchema);

module.exports={StudentModel,studentSchema};