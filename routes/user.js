const express=require('express');
const router=express.Router();
const userController=require('../controller/user');
const {isAuth}=require('../middleware/is-auth')

router.post('/changeemail',isAuth,userController.changeEmail);


module.exports=router;