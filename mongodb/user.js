const mongoose=require('mongoose');

const userSchema=new mongoose.Schema({
    email:{type:String,required:true,unique:true},
    userName:{type:String,required:true},
    avatar:{type:String,required:false},
});

const UserModel = mongoose.model('UserModel', userSchema);

module.exports={UserModel};