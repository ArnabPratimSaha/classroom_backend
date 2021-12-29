const mongoose=require('mongoose');
const { userSchema } = require('./user');

const fieldSchema=new mongoose.Schema({
    name:{type:String,required:true},
    priority:{type:Number,required:true,default:()=>-1}  
});

const classSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
    description: { type: String },
    teachers: { type: Array, required: true, default: () => [], maxlength: 200 },
    students: { type: Array, required: true, default: () => [], maxlength: 200 },
    requiredFields: { type: Array, required: true, default: () => [], maxlength: 20 },
    totalMemberCount: { type: Number, default: () => 1, required: true },
    shadow: { type: Boolean, default: false },
    information: { type: Map, default: () => new Map() },
    time: { from: { type: Date }, to: { type: Date } },
    assignments: { type: Array, default: [] }
});



const FieldModel=mongoose.model('Field', fieldSchema);
const ClassModel = mongoose.model('Class', classSchema);
module.exports={ClassModel,FieldModel};