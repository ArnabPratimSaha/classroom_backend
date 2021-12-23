const mongoose=require('mongoose');
const { userSchema } = require('./user');

const classSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    teachers:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const ClassModel = mongoose.model('Class', classSchema);

module.exports={ClassModel,classSchema};