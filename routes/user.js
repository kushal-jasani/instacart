const express=require('express');
const router=express.Router();
const userController=require('../controller/user');
const {isAuth}=require('../middleware/is-auth')

router.post('/changeemail',isAuth,userController.changeEmail);
router.post('/changepassword',isAuth,userController.postChangePassword);
router.post('/changename',isAuth,userController.postChangeName);

router.post('/changephonenumber',isAuth,userController.postChangePhoneNumber);
router.post('/verifychangedphonenumber',isAuth,userController.verifyChangedPhoneNumber);


module.exports=router;