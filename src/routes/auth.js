const express = require("express");
const authcontroller = require("../controller/auth");

const router = express.Router();
router.post("/register", authcontroller.sendOtpRegister);
router.post("/register/verify", authcontroller.varifyOtpRegister);

router.post("/login", authcontroller.login);
router.post("/login/verify", authcontroller.verifyOtpLogin);

router.post("/resendOtp", authcontroller.resendOtp);

router.post("/refreshAccessToken", authcontroller.refreshAccessToken);

router.post("/resetpassword", authcontroller.resetPasswordLink);
router.post("/change-password/:resettoken", authcontroller.postResetPassword);

module.exports = router;
