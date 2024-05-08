const express = require("express");
const passport=require('passport');
const authcontroller = require("../controller/auth");

const router = express.Router();

router.get('/auth/google',passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google'), authcontroller.loginOrRegisterWithGoogle);

router.post("/register", authcontroller.sendOtpRegister);
router.post("/register/verify", authcontroller.verifyOtpRegister);

router.post("/login", authcontroller.login);
router.post("/login/verify", authcontroller.verifyOtpLogin);

router.post("/resendOtp", authcontroller.resendOtp);

router.post("/refreshAccessToken", authcontroller.refreshAccessToken);

router.post("/resetpassword", authcontroller.resetPasswordLink);
router.post("/change-password/:resettoken",authcontroller.postResetPassword);

module.exports=router;