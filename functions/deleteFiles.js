const fs=require('fs');
const deleteFiles=(files)=>{
    try {
        files.forEach(file => {
            fs.unlink(file.path, err => {
                if(err)console.log(err);
            })
        });
    } catch (error) {
        return;
    }
}
module.exports={deleteFiles};