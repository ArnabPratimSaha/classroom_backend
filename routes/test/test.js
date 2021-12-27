const { fileHandler } = require("../../middleware/filehandler");
const Router=require('express').Router();
const fs=require('fs');

Router.post('/',fileHandler,(req,res)=>{
    try {
        return res.status(200).json('file accepted');
    } catch (error) {
        console.log("error");
        res.sendStatus(500);
    }
});

module.exports=Router;
