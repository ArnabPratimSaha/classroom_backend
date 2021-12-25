const { ClassModel } = require("../mongodb/classroom");

const getClasses=async(arr)=>{
    try {
        const classes = await ClassModel.find({ id: { $in: arr } });
        if (!classes) return [];
        return classes.map(c => {
            return { name: c.name, id: c.id }
        })
    } catch (error) {
        console.log(error);
      return [];  
    }
}
module.exports={getClasses}