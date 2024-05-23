
const { generateResponse, sendHttpResponse } = require("../helper/response");

const otpless = require("otpless-node-js-auth-sdk");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const clientId = process.env.OTPLESS_CLIENTID;
const clientSecret = process.env.OTPLESS_CLIETSECRET;

const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../util/jwt");
const {
  findUser,
  insertUser,
  updatePasswordAndToken,
  addTokenToUser,
  generateToken,
} = require("../repository/auth");
const {
  resetPasswordSchema,
  sendOtpRegisterSchema,
  verifyOtpRegisterSchema,
  loginSchema,
  verifyLoginSchema,
  refreshAccessTokenSchema,
  postResetPasswordSchema,
} = require("../validator/validation_schema");

exports.sendOtpRegister = async (req, res, next) => {
  try {
    const { email, phoneno, country_code } = req.body;
    let isEmail = email !== undefined;

    const { error } = sendOtpRegisterSchema.validate(req.body);
    if (error) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: error.details[0].message,
        })
      );
    }
    const [userResults] = await findUser(
      isEmail ? { email } : { phoneno: phoneno }
    );
    if (isEmail && userResults.length > 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: "User with given email number already exists👀",
        })
      );
    }
    if (!isEmail && userResults.length > 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: "User with given phone number already exists👀",
        })
      );
    }

    if (phoneno && country_code) {
      const phonewithcountrycode = country_code + phoneno;
      const response = await otpless.sendOTP(
        phonewithcountrycode,
        "",
        "SMS",
        "",
        "",
        600,
        6,
        clientId,
        clientSecret
      );
      if (response.success === false) {
        return sendHttpResponse(
          req,
          res,
          next,
          generateResponse({
            statusCode: 400,
            status: "error",
            msg: "Failed to generate OTP❌",
          })
        );
      } else {
        return sendHttpResponse(
          req,
          res,
          next,
          generateResponse({
            statusCode: 201,
            status: "success",
            msg: "Otp sent successfully on given mobile number🚀",
            data: {
              otpid: response.orderId,
            },
          })
        );
      }
    } else if (email && isEmail) {
      const response = await otpless.sendOTP(
        "",
        email,
        "EMAIL",
        "",
        "",
        600,
        6,
        clientId,
        clientSecret
      );
      if (response.success === false) {
        return sendHttpResponse(
          req,
          res,
          next,
          generateResponse({
            statusCode: 400,
            status: "error",
            msg: "Failed to generate OTP❌",
          })
        );
      } else {
        return sendHttpResponse(
          req,
          res,
          next,
          generateResponse({
            statusCode: 201,
            status: "success",
            msg: "Otp sent successfully on given mobile number🚀",
            data: {
              otpid: response.orderId,
            },
          })
        );
      }
    }
  } catch (error) {
    console.log(error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error while sending otp👨🏻‍🔧",
      })
    );
  }
};

exports.varifyOtpRegister = async (req, res, next) => {
  try {
    const { email, country_code, phoneno, password, otpid, enteredotp } =
      req.body;
    const { error } = verifyOtpRegisterSchema.validate(req.body);
    if (error) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: error.details[0].message,
        })
      );
    }
    const phonewithcountrycode = country_code + phoneno;

    const varificationresponse = await otpless.verifyOTP(
      email,
      phonewithcountrycode,
      otpid,
      enteredotp,
      clientId,
      clientSecret
    );

    if (varificationresponse.success === false) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          statusCode: 404,
          status: "error",
          msg: varificationresponse.errorMessage,
        })
      );
    }

    if (varificationresponse.isOTPVerified === true) {
      const hashedPassword = await bcrypt.hash(password, 8);
      const is_verify = phoneno ? 1 : 0;
      [userResults] = await insertUser(
        email,
        country_code,
        phoneno,
        is_verify,
        hashedPassword
      );

      const userId = userResults.insertId;
      const accessToken = generateAccessToken(userId);
      const refreshToken = generateRefreshToken(userId);

      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          statusCode: 201,
          status: "success",
          data: {
            JWTToken: { accessToken, refreshToken },
          },
          msg: "User registerd successfully✅",
        })
      );
    }
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        statusCode: 404,
        status: "error",
        msg: varificationresponse.reason
          ? varificationresponse.reason
          : "entered otp is wrong,please try again😓",
      })
    );
  } catch (error) {
    console.log(error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error while varifying register otp👨🏻‍🔧",
      })
    );
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, phoneno, country_code } = req.body;

    const { error } = loginSchema.validate(req.body);
    if (error) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: error.details[0].message,
        })
      );
    }
    const isEmail = email !== undefined;
    let user;
    if (isEmail) {
      [user] = await findUser({ email });
      if (user.length == 0) {
        return sendHttpResponse(
          req,
          res,
          next,
          generateResponse({
            status: "error",
            statusCode: 404,
            msg: "User with provided email not found❌",
          })
        );
      }
      const isPasswordValid = await bcrypt.compare(password, user[0].password);
      if (!isPasswordValid) {
        return sendHttpResponse(
          req,
          res,
          next,
          generateResponse({
            status: "error",
            statusCode: 401,
            msg: "Invalid password",
          })
        );
      }
    } else {
      [user] = await findUser({ phoneno });
      if (!user) {
        return sendHttpResponse(
          req,
          res,
          next,
          generateResponse({
            status: "error",
            statusCode: 404,
            msg: "User with provided phone number not found❌",
          })
        );
      }

      const phonewithcountrycode = country_code + phoneno;
      const response = await otpless.sendOTP(
        phonewithcountrycode,
        "",
        "SMS",
        "",
        "",
        600,
        6,
        clientId,
        clientSecret
      );

      if (response.success === false) {
        return sendHttpResponse(
          req,
          res,
          next,
          generateResponse({
            status: "error",
            statusCode: 400,
            msg: "Failed to send OTP",
          })
        );
      }

      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "success",
          statusCode: 200,
          msg: "OTP sent successfully",
          data: {
            otpid: response.orderId,
          },
        })
      );
    }

    const accessToken = generateAccessToken(user[0].id);
    const refreshToken = generateRefreshToken(user[0].id);

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 200,
        data: {
          JWTToken: { accessToken, refreshToken },
        },
        msg: "Login successful✅",
      })
    );
  } catch (error) {
    console.log(error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error while login👨🏻‍🔧",
      })
    );
  }
};

exports.verifyOtpLogin = async (req, res, next) => {
  try {
    const { country_code, phoneno, otpid, enteredotp } = req.body;
    const { error } = verifyLoginSchema.validate(req.body);
    if (error) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: error.details[0].message,
        })
      );
    }
    const phonewithcountrycode = country_code + phoneno;

    const [user] = await findUser({ phoneno });
    if (!user) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 404,
          msg: "User with provided phone number not found,please register first🚨",
        })
      );
    }

    const varificationresponse = await otpless.verifyOTP(
      "",
      phonewithcountrycode,
      otpid,
      enteredotp,
      clientId,
      clientSecret
    );

    if (varificationresponse.success === false) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          statusCode: 404,
          status: "error",
          msg: varificationresponse.errorMessage,
        })
      );
    }

    if (varificationresponse.isOTPVerified === true) {
      const accessToken = generateAccessToken(user[0].id);
      const refreshToken = generateRefreshToken(user[0].id);

      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          statusCode: 201,
          status: "success",
          data: {
            JWTToken: { accessToken, refreshToken },
          },
          msg: "Login successful✅",
        })
      );
    }
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        statusCode: 404,
        status: "error",
        msg: varificationresponse.reason
          ? varificationresponse.reason
          : "entered otp is wrong,please try again😓",
      })
    );
  } catch (error) {
    console.log(error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error while verifying login otp👨🏻‍🔧",
      })
    );
  }
};

exports.refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const { error } = refreshAccessTokenSchema.validate(req.body);
    if (error) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: error.details[0].message,
        })
      );
    }
    const userId = verifyRefreshToken(refreshToken);
    if (userId === "expired") {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          statusCode: 403,
          status: "error",
          msg: "Refresh token has expired⏳",
        })
      );
    } else if (!userId) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          statusCode: 401,
          status: "error",
          msg: "Invalid refresh token🚨",
        })
      );
    }
    const accessToken = generateAccessToken(userId);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        statusCode: 200,
        status: "success",
        msg: "New access token generated successfully🧾",
        data: {
          accessToken,
        },
      })
    );
  } catch (error) {
    console.log("error while refreshing access token", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error while refreshing access token👨🏻‍🔧",
      })
    );
  }
};

exports.resendOtp = async (req, res, next) => {
  const { otpid } = req.body;
  try {
    const response = await otpless.resendOTP(otpid, clientId, clientSecret);
    if (response.success === false) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: response.errorMessage,
        })
      );
    }
    const newotpId = response.orderId;
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        statusCode: 200,
        status: "success",
        data: {
          otpid: newotpId,
        },
        msg: "otp resent successfully✅",
      })
    );
  } catch (error) {
    console.log(error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error when resending otp",
      })
    );
  }
};

exports.resetPasswordLink = async (req, res, next) => {
  try {
    const { email } = req.body;
    const { error } = resetPasswordSchema.validate(req.body);
    if (error) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: error.details[0].message,
        })
      );
    }
    const [userResults] = await findUser({ email });
    const user = userResults[0];
    if (!user) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 404,
          msg: "user with given mail not found❗️",
        })
      );
    }
    const tokenlength = 32;
    const expiryhours = 24;
    const { resettoken, resettokenexpiry } = await generateToken(
      tokenlength,
      expiryhours
    );
    // console.log(resettoken);
    // console.log(resettokenexpiry);

    await addTokenToUser(resettoken, resettokenexpiry, email);

    const transporter = nodemailer.createTransport(
      sendgridTransport({
        auth: {
          api_key: process.env.SENDGRID_API,
        },
      })
    );
    transporter.sendMail({
      to: email,
      from: "kushaljasani843445@gmail.com",
      subject: "ALERT:Password Reset🚨",
      html: `<h1>Hello,${user.first_name}</h1> <br> <p>You have requested password Reset for your instaCart account</p>
      <p>Click given <a href="http://localhost:3000/change-password/${resettoken}">link</a> to reset password</p>
      <br><p>Note:Link is valid for only 24hours</p>`,
    });

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        statusCode: 200,
        status: "success",
        msg: "link for reset password send successfully✅",
      })
    );
  } catch (error) {
    console.log("error whie reseting password", error);
    sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error while sending reset password link👨🏻‍🔧",
      })
    );
  }
};

exports.postResetPassword = async (req, res, next) => {
  try {
    const { resettoken } = req.params;

    const { newPassword } = req.body;
    const { error } = postResetPasswordSchema.validate(req.body);
    if (error) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: error.details[0].message,
        })
      );
    }

    const [userresults] = await findUser({ resettoken });
    const user = userresults[0];

    if (!user) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 404,
          msg: "Invalid or expired token❌",
        })
      );
    }
    const cuurentTime = new Date();

    if (
      user.resettokenexpiry &&
      cuurentTime > new Date(user.resettokenexpiry)
    ) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 404,
          msg: "Invalid token or expired❌",
        })
      );
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 8);
    await updatePasswordAndToken(hashedNewPassword, user.id);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        statusCode: 200,
        status: "success",
        msg: "Password reset successfully..🥳",
      })
    );
  } catch {
    console.log("error whie reseting password", error);
    sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error while reseting password👨🏻‍🔧",
      })
    );
  }
};
