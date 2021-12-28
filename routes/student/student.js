const { validate } = require('uuid');
const { status } = require('../../middleware/role');

const Router=require('express').Router();

//get all the information of a student(can be accessed by members of class)
//required headers [id,accesstoken,refreshtoken,classid,memberid]
//uses [VALIDATE,STATUS] middleware(see those middleware for full info)
Router.get('/',validate,status,async(req,res)=>{
    try {
        const memeberId=req.headers.memeberid;
        if(!memeberId)return res.status(400).json('missing field(s) [memberid]');
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})


module.exports=Router;
