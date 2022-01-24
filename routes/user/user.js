const mongoose = require("mongoose");
const { getClasses } = require("../../functions/getclasses");
const { validate } = require("../../middleware/validation");
const { UserModel } = require("../../mongodb/user");
const Router = require("express").Router();

//get all the info of the user
//required headers [id,accesstoken,refreshtoken,q(if empty then returns every info,keywords = 'email name id avatar')]
//used [VALIDATE] middleware(see those middleware for full info)
Router.get('/info', validate, async (req, res) => {

    
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
            queryString+=`${q} `;
        });
        var userData=await UserModel.findOne({id:user.id},`-_id ${queryString}`);
        userData.classes=classes;
        res.status(200).json({ user:userData,accesstoken: req.accesstoken })
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//logout the user
//required headers [id,accesstoken,refreshtoken]
//used [VALIDATE] middleware(see those middleware for full info)
Router.delete('/logout', validate, async (req, res) => {
    try {
        const user = await UserModel.findOne({ id: user.id });
        user.refreshtoken=user.refreshtoken.filter(t=>t!==req.refreshtoken);
        await user.save();
        return res.status(200).json('logout successfull');
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//add new field for the user
//required headers [id,accesstoken,refreshtoken]
//required body [fieldname,fieldvalue]
//used [VALIDATE] middleware(see those middleware for full info)
Router.post('/info', validate, async (req, res) => {
    try {
        const fieldName = req.body.fieldname;
        const fieldValue = req.body.fieldvalue;
        const user = await UserModel.findOne({ id: req.user.id });
        if(!fieldName||!fieldValue)return res.status(400).json('missing field(s) [fieldname,fieldvalue]')
        if (!user.information) user.information = new Map();
        if (user.information.has(fieldName)) return res.status(409).json(`${fieldName} already present`);
        user.information.set(fieldName, fieldValue);
        await user.save();
        const response = await UserModel.findOne({ id: req.user.id }, '-_id name id information');
        return res.status(200).json({user:response,accesstoken:req.accesstoken});
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})
//update field for the user
//required headers [id,accesstoken,refreshtoken]
//required body [fieldname,fieldvalue]
//used [VALIDATE] middleware(see those middleware for full info)
Router.patch('/info', validate, async (req, res) => {
    try {
        const fieldName = req.body.fieldname;
        const fieldValue = req.body.fieldvalue;
        if(!fieldName||!fieldValue)return res.status(400).json('missing field(s) [fieldname,fieldvalue]')
        const user = await UserModel.findOne({ id: req.user.id });
        if (!user.information) user.information = new Map();
        if (!user.information.has(fieldName)) return res.status(409).json(`could not found ${fieldName}`);
        user.information.set(fieldName, fieldValue);
        await user.save();
        const response = await UserModel.findOne({ id: req.user.id }, '-_id name id information');
        return res.status(200).json({user:response,accesstoken:req.accesstoken});
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})
//add new field for the user
//required headers [id,accesstoken,refreshtoken]
//required body [fieldname]
//used [VALIDATE] middleware(see those middleware for full info)
Router.delete('/info', validate, async (req, res) => {
    try {
        const fieldName = req.body.fieldname;
        if(!fieldName)return res.status(400).json('missing field(s) [fieldname]')
        const user = await UserModel.findOne({ id: req.user.id });
        if (!user.information) user.information = new Map();
        if (!user.information.has(fieldName)) return res.status(409).json(`could not found ${fieldName}`);
        user.information.delete(fieldName);
        await user.save();
        const response = await UserModel.findOne({ id: req.user.id }, '-_id name id information');
        return res.status(200).json({user:response,accesstoken:req.accesstoken});
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
module.exports = Router;