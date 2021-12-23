const { validate } = require("../../middleware/validation");
const Router = require("../authentication/authentication");
//required headers id-accesstoken-refreshtoken
Router.post('/',validate,(req,res)=>{
    try {
        res.status(200).json({new:req.headers.accesstoken===req.accesstoken?false:true,accesstoken:req.accesstoken});   
    } catch (error) {
        console.log(error);
    }
});

module.exports=Router;