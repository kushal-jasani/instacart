const express = require("express");
const passport = require("passport");
const authcontroller = require("../controller/auth");
const { google } = require("googleapis");

const router = express.Router();

router.get(
  "/auth/google",
  passport.authenticate("google", {session:false,scope: ["profile", "email"] })
//   (req, res) =>
//     res.redirect("http://localhost:8080/store/category?main_category_id=1")
);

// const oauth2Client = new google.auth.OAuth2(
//   process.env.GOOGLE_AUTH_CLIENT_ID,
//   process.env.GOOGLE_AUTH_CLIENT_SECRET,
//   "http://localhost:8080/auth/google/callback"
// );

// router.get("/auth/google", (req, res) => {
//   const url = oauth2Client.generateAuthUrl({
//     access_type: "offline",
//     scope: ["https://www.googleapis.com/auth/userinfo.email"],
//     redirect_uri: "https://gostor.com",
//   });
//   res.redirect(url);
// });

router.get(
  "/auth/google/callback",
  passport.authenticate("google",
    {session:false}
  ),
  authcontroller.loginOrRegisterWithGoogle
);

router.post("/register", authcontroller.sendOtpRegister);
router.post("/register/verify", authcontroller.verifyOtpRegister);

router.post("/login", authcontroller.login);
router.post("/login/verify", authcontroller.verifyOtpLogin);

router.post("/resendOtp", authcontroller.resendOtp);

router.post("/refreshAccessToken", authcontroller.refreshAccessToken);

router.post("/resetpassword", authcontroller.resetPasswordLink);
router.post("/change-password/:resettoken", authcontroller.postResetPassword);

module.exports = router;
