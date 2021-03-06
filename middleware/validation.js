const jwt = require('jsonwebtoken');
const { Error } = require('../classes/error');
const { UserModel } = require('../mongodb/user');

//this validates the user if it is in the database or not
//takes the access token and refreshes it if necessery
//required headers [id,accesstoken,refreshtoken]
//adds [user,accesstoken,refreshtoken] to req(accessed as req.user from next middleware)
const validate = async (req, res, next) => {

    console.log('coming');

    try {
        if(!req.headers.accesstoken|| !req.headers.refreshtoken ||!req.headers.id)return next(new Error(404,'missing fields either [accesstoken,id,refreshtoken]'))
        const accesstoken = req.headers.accesstoken;
        var decoded = jwt.verify(accesstoken, process.env.SECRET);
        const user = await UserModel.findOne({ id: decoded.id });
        if (!user) return next(new Error(404,'no user found'));
        req.accesstoken = accesstoken;
        req.refreshtoken = req.headers.refreshtoken;
        req.user = user;
        return next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            //refreshing the access token
            try {
                const refreshtoken = req.headers.refreshtoken;
                const id = req.headers.id;
                const user = await UserModel.findOne({ id: id });
                if (!user) return next(new Error(404,'no user found'));
                if (user.refreshtoken.includes(refreshtoken)) {
                    req.accesstoken = jwt.sign({ id: user.id }, process.env.SECRET, { expiresIn: 60 });//1 min
                    req.user = user;
                    req.refreshtoken = req.headers.refreshtoken;
                    return next();
                }
                //user does not have refresh token or have a wrong refresh token
                user.refreshtoken = [];
                await user.save();
                return next(new Error(401,'Security Breach'));
            } catch (e) {
                console.log(e);
                return next(new Error(500,'Server Error'));
            }
        }
        if (error instanceof jwt.JsonWebTokenError) {
            //security breach(user used a malformed jwt)
            try {
                const id = req.headers.id;
                const user = await UserModel.findOne({ id: id });
                if (!user) return next(new Error(404,'no user found'));
                user.refreshtoken = [];
                await user.save();
                return next(new Error(401,'Security Breach'));
            } catch (e) {
                console.log(e);
                return next(new Error(500,'Server Error'));
            }
        }
        console.log(error);
        return next(new Error(500,'Server Error'));
    }
}
module.exports = { validate };