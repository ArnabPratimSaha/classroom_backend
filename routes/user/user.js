const mongoose = require("mongoose");
const { getClasses } = require("../../functions/getclasses");
const { validate } = require("../../middleware/validation");
const { ClassModel } = require("../../mongodb/classroom");
const { UserModel } = require("../../mongodb/user");
const Router = require("express").Router();

//get all the info of the user
//required headers [id,accesstoken,refreshtoken,q(if empty then returns every info,keywords = 'email name id avatar')]
//used [VALIDATE] middleware(see those middleware for full info)
Router.get('/info', validate, async (req, res, next) => {
    try {
        var user = req.user;
        var query = (req.headers.q||'').split(' ');
        let classes;
        if(query.includes('class')){
            query=query.filter(q=>q!=='class');
            classes=await getClasses(user.classes);
        }
        var queryString='';
        query.forEach(q => {
            if(q!=='refreshtoken')
                queryString+=`${q} `;
        });
        var userData=await UserModel.findOne({id:user.id},`-_id ${queryString.trim()||'-refreshtoken'}`);
        userData.classes=classes;
        res.status(200).json({ user:userData,accesstoken: req.accesstoken })
    } catch (error) {
        console.log(error);
        return next(new Error(500,'Server Error'));
    }
});
//get all the info of the classed of the user
//required headers [id,accesstoken,refreshtoken,q(if empty then returns every info,keywords = 'email name id avatar')]
//used [VALIDATE] middleware(see those middleware for full info)
Router.get('/classes', validate, async (req, res, next) => {
    try {
        const user = await UserModel.findOne({ id: req.user.id });
        const limit=+req.query.limit;
        const pageIndex = +req.query.page;
        if (!limit || !pageIndex) return next(new Error(400, 'missing query(s) [limit,pageIndex]'));
        const query = req.query.query ? req.query.query.toString().trim() : '';
        const startIndex = (pageIndex - 1) * limit;
        const classIds = user.classes || [];
        let regex=query?new RegExp(`${query}`,'g'):new RegExp('','g');
        const classes = await ClassModel.find({ id: { $in: classIds }, name: { $regex: regex } }, '-_id -information -shadow').sort({createdAt:-1}).limit(limit).skip(startIndex);
        res.status(200).json({ classes: classes || [], accesstoken: req.accesstoken })
    } catch (error) {
        console.log(error);
        return next(new Error(500,'Server Error'));
    }
})
//logout the user
//required headers [id,accesstoken,refreshtoken]
//used [VALIDATE] middleware(see those middleware for full info)
Router.delete('/logout', validate, async (req, res,next) => {
    try {
        const user = await UserModel.findOne({ id: req.user.id });
        user.refreshtoken=user.refreshtoken.filter(t=>t!==req.refreshtoken);
        await user.save();
        return res.status(200).json('logout successfull');
    } catch (error) {
        console.log(error);
        return next(new Error(500,'Server Error'));
    }
});
//add new field for the user
//required headers [id,accesstoken,refreshtoken]
//required body [fieldname,fieldvalue]
//used [VALIDATE] middleware(see those middleware for full info)
Router.post('/info', validate, async (req, res, next) => {
    try {
        const fieldName = req.body.fieldname;
        const fieldValue = req.body.fieldvalue;
        const user = await UserModel.findOne({ id: req.user.id });
        if(!fieldName||!fieldValue)return next(new Error(400,'missing field(s) [fieldname,fieldvalue]'));
        if (!user.information) user.information = new Map();
        if (user.information.has(fieldName)) return next(new Error(409,`${fieldName} already present`));
        user.information.set(fieldName, fieldValue);
        await user.save();
        const response = await UserModel.findOne({ id: req.user.id }, '-_id name id information');
        return res.status(200).json({user:response,accesstoken:req.accesstoken});
    } catch (error) {
        console.log(error);
        return next(new Error(500,'Server Error'));
    }
})
//update field for the user
//required headers [id,accesstoken,refreshtoken]
//required body [fieldname,fieldvalue]
//used [VALIDATE] middleware(see those middleware for full info)
Router.patch('/info', validate, async (req, res, next) => {
    try {
        const fieldName = req.body.fieldname;
        const fieldValue = req.body.fieldvalue;
        if(!fieldName||!fieldValue)return next(new Error(400,'missing field(s) [fieldname,fieldvalue]'));
        const user = await UserModel.findOne({ id: req.user.id });
        if (!user.information) user.information = new Map();
        if (!user.information.has(fieldName)) return next(new Error(409,`could not found ${fieldName}`));
        user.information.set(fieldName, fieldValue);
        await user.save();
        const response = await UserModel.findOne({ id: req.user.id }, '-_id name id information');
        return res.status(200).json({user:response,accesstoken:req.accesstoken});
    } catch (error) {
        console.log(error);
        return next(new Error(500,'Server Error'));
    }
})
//add new field for the user
//required headers [id,accesstoken,refreshtoken]
//required body [fieldname]
//used [VALIDATE] middleware(see those middleware for full info)
Router.delete('/info', validate, async (req, res, next) => {
    try {
        const fieldName = req.body.fieldname;
        if(!fieldName) return next(new Error(400,'missing field(s) [fieldname]'));
        const user = await UserModel.findOne({ id: req.user.id });
        if (!user.information) user.information = new Map();
        if (!user.information.has(fieldName)) return next(new Error(409,`could not found ${fieldName}`));
        user.information.delete(fieldName);
        await user.save();
        const response = await UserModel.findOne({ id: req.user.id }, '-_id name id information');
        return res.status(200).json({user:response,accesstoken:req.accesstoken});
    } catch (error) {
        console.log(error);
        return next(new Error(500,'Server Error'));
    }
});
module.exports = Router;