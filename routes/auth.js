const express = require("express");
const authcontroller = require("../controller/auth");

const router = express.Router();
router.post("/register", authcontroller.sendOtp);
router.post("/register/verify", authcontroller.varifyOtpRegister);

module.exports=router;