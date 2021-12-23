const passport =require('passport');
const { UserModel } = require('../../mongodb/user');
const Router=require('express').Router();
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const {validate}=require('../../middleware/validation');
Router.get('/',passport.authenticate('google', { scope: ['profile','email'] }));

Router.get('/callback',passport.authenticate('google', { failureRedirect: '/login' }),async (req, res) => {
    try {
      const user=await UserModel.findOne({email:req.user.email});
      if(user){
        const accesstoken = jwt.sign({ id: user.id }, process.env.SECRET,{ expiresIn:  60});//1 min 
        const refreshtoken=jwt.sign({ id: user.id }, process.env.SECRET,{expiresIn:'1y'});
        user.refreshtoken.push(refreshtoken);
        await user.save();
        return res.redirect(`http://localhost:3000?id=${user.id}&accessToken=${accesstoken}&refreshToken=${refreshtoken}`);
      }
      const newUser=new UserModel({
        id:uuidv4(),
        email:req.user.email,
        name:req.user.name,
        avatar:req.user.avatar,
        refreshtoken:[]
      });
      const response=await newUser.save();
      const accesstoken=jwt.sign({ id: response.id }, process.env.SECRET,{ expiresIn: 60 });
      const refreshtoken=jwt.sign({ id: response.id }, process.env.SECRET,{expiresIn:'1y'});
      response.refreshtoken.push(refreshtoken);
      await response.save();
      return res.redirect(`http://localhost:3000?id=${response.id}&accessToken=${accesstoken}&refreshToken=${refreshtoken}`);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});



module.exports=Router;