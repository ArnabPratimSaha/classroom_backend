const jwt = require('jsonwebtoken');
const { UserModel } = require('../mongodb/user');

//required headers id-accesstoken-refreshtoken
const validate = async (req, res, next) => {
    try {
        const accesstoken = req.headers.accesstoken;
        var decoded = jwt.verify(accesstoken, process.env.SECRET);
        const user = await UserModel.findOne({ id: decoded.id });
        if (!user) return res.sendStatus(404);
        req.accesstoken = accesstoken;
        req.refreshtoken = req.headers.refreshtoken;
        req.user = user;
        next();
        return;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            //refreshing the access token
            try {
                const refreshtoken = req.headers.refreshtoken;
                const id = req.headers.id;
                const user = await UserModel.findOne({ id: id });
                if (!user) return res.sendStatus(404);
                if (user.refreshtoken.includes(refreshtoken)) {
                    req.accesstoken = jwt.sign({ id: user.id }, process.env.SECRET, { expiresIn: 60 });//1 min
                    req.user = user;
                    req.refreshtoken = req.headers.refreshtoken;
                    next();
                    return;
                }
                //user does not have refresh token or have a wrong refresh token
                user.refreshtoken = [];
                await user.save();
                return res.sendStatus(401);
            } catch (e) {
                console.log(e);
                return res.sendStatus(500);
            }
        }
        if (error instanceof jwt.JsonWebTokenError) {
            //security breach(user used a malformed jwt)
            try {
                const id = req.headers.id;
                const user = await UserModel.findOne({ id: id });
                if (!user) return res.sendStatus(404);
                user.refreshtoken = [];
                await user.save();
                return res.sendStatus(401);
            } catch (e) {
                console.log(e);
                return res.sendStatus(500);
            }
        }
        console.log(error);
        return res.sendStatus(500);
    }
}
module.exports = { validate };