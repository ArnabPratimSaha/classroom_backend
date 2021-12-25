const mongoose = require("mongoose");
const { getClasses } = require("../../functions/getclasses");
const { validate } = require("../../middleware/validation");
const { UserModel } = require("../../mongodb/user");
const Router = require("express").Router();

//get all the info of the user
//required headers [id,accesstoken,refreshtoken,q(if empty then returns every info,keywords = 'email name id avatar')]
//required body [name,description(not required)]
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
        const user = req.user;
        if (mongoose.isValidObjectId(user)) {
            user.refreshtoken.pull(req.refreshtoken);
            await user.save();
            return res.sendStatus(200);
        }
        return res.sendStatus(404);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});
//add new field for the user
//required headers [id,accesstoken,refreshtoken,fieldname,fieldvalue]
//used [VALIDATE] middleware(see those middleware for full info)
Router.post('/info', validate, async (req, res) => {
    try {
        const user = await UserModel.findOne({ id: req.user.id });
        const fieldName = req.body.fieldname;
        const fieldValue = req.body.fieldvalue;
        if (!user.information) user.information = new Map();
        if (user.information.has(fieldName)) return res.sendStatus(403);
        user.information.set(fieldName, fieldValue);
        await user.save();
        const response = await UserModel.findOne({ id: req.user.id }, 'name id email information avatar');
        response._id = null;
        res.status(200).json(response);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})
//add new field for the user
//required headers [id,accesstoken,refreshtoken,fieldname]
//used [VALIDATE] middleware(see those middleware for full info)
Router.delete('/info', validate, async (req, res) => {
    try {
        const user = await UserModel.findOne({ id: req.user.id });
        const fieldName = req.body.fieldname;
        if (!user.information) user.information = new Map();
        if (!user.information.has(fieldName)) return res.sendStatus(403);
        user.information.delete(fieldName);
        await user.save();
        const response = await UserModel.findOne({ id: req.user.id }, 'name id email information avatar');
        response._id = null;
        res.status(200).json(response);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})
//add new field for the user
//required headers [id,accesstoken,refreshtoken,fieldname,fieldvalue]
//used [VALIDATE] middleware(see those middleware for full info)
Router.patch('/info', validate, async (req, res) => {
    try {
        const user = await UserModel.findOne({ id: req.user.id });
        const fieldName = req.body.fieldname;
        const fieldValue = req.body.fieldvalue;
        if (!user.information) user.information = new Map();
        if (!user.information.has(fieldName)) return res.sendStatus(403);
        user.information.set(fieldName, fieldValue);
        await user.save();
        const response = await UserModel.findOne({ id: req.user.id }, 'name id email information avatar');
        response._id = null;
        res.status(200).json(response);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})

module.exports = Router;