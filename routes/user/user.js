const mongoose = require("mongoose");
const { validate } = require("../../middleware/validation");
const { UserModel } = require("../../mongodb/user");
const Router = require("express").Router();

//required headers id-accesstoken-refreshtoken
//verify and get user ifo
Router.get('/info', validate, async (req, res) => {
    try {
        const user = req.user;
        if (!req.headers.q) {
            return res.status(200).json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar, accesstoken: req.accesstoken, refreshtoken: req.refreshtoken })
        };
        const query = (req.headers.q).split(' ');
        var obj = {};
        query.forEach(q => {
            if (q === 'email')
                obj.email = user.email;
            if (q === 'name')
                obj.name = user.name;
            if (q === 'id')
                obj.id = user.id;
            if (q === 'avatar')
                obj.avatar = user.avatar;
        })
        res.status(200).json({ ...obj, accesstoken: req.accesstoken, refreshtoken: req.refreshtoken })

    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});



module.exports = Router;