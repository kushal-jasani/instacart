require("dotenv").config();

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
const { findUser, insertUser } = require("../repository/auth");

exports.sendOtp = async (req, res, next) => {
  try {
    const { email, phoneno, country_code } = req.body;
    let isEmail = email !== undefined;

    const [userResults] = await findUser(
      isEmail ? { email } : { phoneno: phone }
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
      [userResults] = await insertUser(
        email,
        country_code,
        phoneno,
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
          msg: varificationresponse.reason ? varificationresponse.reason : "entered otp is wrong,please try again😓",
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
