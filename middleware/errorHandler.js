const { Error } = require("../classes/error");
const fs=require('fs')
const errorHandler = (err, req, res, next) => {
    if(req.files){
        req.files.forEach(file => {
            fs.unlink(file.path, err => { if (err) console.log(err); })
        });
    }
    if(err instanceof Error){
        console.log(err.message);
        return res.status(err.status||500).json(err.message||'Unknow Error');
    }
    return res.status(500).json('Unknow Error');
}
module.exports=errorHandler;