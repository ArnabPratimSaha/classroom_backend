const mongoose=require('mongoose');
const { v4: uuidv4 } = require('uuid');
const inviteSchema = new mongoose.Schema({
    classId: { type: String, required: true, unique: true },
    inviteIds: [{
        id: { type: String, required: true, default: () => uuidv4() },
        type: { type: String, enum: ['teacher', 'student'], required: true },
        show: { type: Boolean, default: false },
        expireIn: {type:Date ,required:true,default:()=>new Date().setDate(new Date().getDate()+1)}
    }]
});
const InviteModel = mongoose.model('Invite', inviteSchema);

module.exports = { InviteModel }