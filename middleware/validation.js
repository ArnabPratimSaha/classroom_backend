const jwt = require('jsonwebtoken');
const { UserModel } = require('../mongodb/user');
//this validates the user if it is in the database or not
//takes the access token and refreshes it if necessery
//required headers [id,accesstoken,refreshtoken]
//adds [user,accesstoken,refreshtoken] to req(accessed as req.user from next middleware)
const validate = async (req, res, next) => {
    try {
        if(!req.headers.accesstoken|| !req.headers.refreshtoken ||!req.headers.id)return res.status(400).json('missing fields either [accesstoken,id,refreshtoken]')
        const accesstoken = req.headers.accesstoken;
        var decoded = jwt.verify(accesstoken, process.env.SECRET);
        const user = await UserModel.findOne({ id: decoded.id });
        if (!user) return res.status(404).json('no user found');
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
                if (!user) return res.status(404).json('no user found');
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
                return res.status(401).json('security breached');
            } catch (e) {
                console.log(e);
                return res.sendStatus(500);
            }
        }
        if (error instanceof jwt.JsonWebTokenError) {
            //security breach(user used a malformed jwt)
            try {
                console.log('4');
                const id = req.headers.id;
                const user = await UserModel.findOne({ id: id });
                if (!user) return res.status(404).json('no user found');
                user.refreshtoken = [];
                await user.save();
                return res.status(401).json('security breached');
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