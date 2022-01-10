const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})
const fs=require('fs');

const uploadFiles=async(files=[])=>{
    let uploadedFiles=[];
    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const cloudFile = await cloudinary.uploader.upload(file.path,{
                resource_type:'auto'
            });
            uploadedFiles.push(cloudFile);
            fs.unlink(file.path, err => { if (err) console.log(err); })
        }
        return uploadedFiles;
    } catch (error) {
        console.log(error);
        throw error;
    }
}
const destroyFiles=async(files=[])=>{
    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
             await cloudinary.uploader.destroy(file.public_id,{
                 resource_type:file.resource_type
             });
        }
    } catch (error) {
        console.log(error);
        throw error;
    }
}
const manageFile = async (newFiles = [],prevFiles=[]) => {
    try {
        await destroyFiles(prevFiles);
        return await uploadFiles(newFiles);
    } catch (error) {
        console.log(error);
        throw error;
    }
}
const downloadFiles=(files=[])=>{
    try {
        const downloadedFiles=[];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            downloadedFiles.push(cloudinary.utils.download_archive_url(file.public_id, file.format))
        }
        return downloadedFiles;
    } catch (error) {
        console.log(error);
        throw error;
    }
}
module.exports = { manageFile,uploadFiles ,destroyFiles,downloadFiles}