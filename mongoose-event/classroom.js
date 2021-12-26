const { ClassModel } = require("../mongodb/classroom");
//event that updates memebercount of the classes
const updateMemberCout=async(change)=>{
    try {
      if(change.updateDescription && (change.updateDescription.updatedFields.students || change.updateDescription.updatedFields.teachers)){
        const _id=change.documentKey._id;
        const classData=await ClassModel.findById(_id);
        const memberLength=classData.teachers.length+classData.students.length;
        classData.totalMemberCount=memberLength;
        await classData.save();
        return;
      }
    } catch (error) {
      console.log(error);
      return;
    }
  }
module.exports={updateMemberCout}