const mongoose = require("mongoose");

const userSchema=new mongoose.Schema({
    id:{type:String,required:true,unique:true},
    email:{type:String,required:true,unique:true},
    name:{type:String,required:true},
    avatar:{type:String,required:false},
    refreshtoken:{type:[String],required:true},
});

const UserModel = mongoose.model('User', userSchema);

module.exports={UserModel,userSchema};
