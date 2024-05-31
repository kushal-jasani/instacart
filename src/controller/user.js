const bcrypt = require("bcryptjs");
const otpless = require("otpless-node-js-auth-sdk");

const {
  generateResponse,
  sendHttpResponse,
} = require("../helper/response");
const { findUser } = require("../repository/auth");
const { findPasswordOfUser, updateUser } = require("../repository/user");
const {
  changeEmailSchema,
  changePasswordSchema,
  changeNameSchema,
  changePhoneNumberSchema,
} = require('../validator/user_section_schema');
const { findReferralInfo } = require("../repository/user");
const clientId = process.env.OTPLESS_CLIENTID;
const clientSecret = process.env.OTPLESS_CLIETSECRET;

exports.changeEmail = async (req, res, next) => {
  try {
    const { updatedEmail, confirmEmail, password } = req.body;
    const userId = req.user.userId;

    let updatedField = {};

    const { error } = changeEmailSchema.validate(req.body);
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

    if (updatedEmail !== confirmEmail) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: "updated email and email confirmation has to match👀",
        })
      );
    }

    const [user] = await findUser({ email: confirmEmail });
    if (user.length && user[0].id !== userId) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          statusCode: 400,
          status: "error",
          msg: `Can't update..User with this ${confirmEmail} email is already registered👀`,
        })
      );
    }

    const [dbPassword] = await findPasswordOfUser(userId);
    const hashedDbPassword = dbPassword[0].password;
    const passwordMatch = await bcrypt.compare(password, hashedDbPassword);
    if (passwordMatch) {
      updatedField["email"] = confirmEmail;
      const [updateResult] = await updateUser(updatedField, userId);

      if (updateResult.affectedRows == 0) {
        return sendHttpResponse(
          req,
          res,
          next,
          generateResponse({
            status: "error",
            statusCode: 404,
            msg: "no user found or no changes have be made",
          })
        );
      }
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          statusCode: 200,
          status: "success",
          msg: "Your Email address is updated successfully🚀",
        })
      );
    } else {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: "entered password is incorrect🚨",
        })
      );
    }
  } catch (error) {
    console.log("error while updateing email: ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error when updating email👨🏻‍🔧",
      })
    );
  }
};

exports.postChangePassword = async (req, res, next) => {
  try {
    const newPassword = req.body.newPassword;
    const confirmNewPassword = req.body.confirmNewPassword;
    const userId = req.user.userId;
    let updatedField = {};

    const { error } = changePasswordSchema.validate(req.body);
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

    if (newPassword !== confirmNewPassword) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: "new password and confirm password is not matching😓",
        })
      );
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 8);
    updatedField["password"] = hashedNewPassword;
    await updateUser(updatedField, userId);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        statusCode: 200,
        status: "success",
        msg: "password changed successfully✅",
      })
    );
  } catch (error) {
    console.log("error while changing password", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error when changing password👨🏻‍🔧",
      })
    );
  }
};

exports.postChangeName = async (req, res, next) => {
  try {
    const { firstName, lastName } = req.body;
    const userId = req.user.userId;
    let updatedFields = {};

    const { error } = changeNameSchema.validate(req.body);
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

    if (firstName) {
      updatedFields["first_name"] = firstName;
    }
    if (lastName) {
      updatedFields["last_name"] = lastName;
    }

    await updateUser(updatedFields, userId);

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        statusCode: 200,
        status: "success",
        msg: "Name changed successfully✅",
      })
    );
  } catch (error) {
    console.log("error while changing Name", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error when changing name👨🏻‍🔧",
      })
    );
  }
};

exports.postChangePhoneNumber = async (req, res, next) => {
  try {
    const { country_code, phoneno, action } = req.body;
    const userId = req.user.userId;

    const { error } = changePhoneNumberSchema.validate(req.body);
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

    const [isRegistered] = await findUser({ phoneno: phoneno });
    if (isRegistered.length > 0 && isRegistered[0].id === userId) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: `The provided phone number ${phoneno} is already registered by you. To update, please enter a different number.☹️`,
        })
      );
    } else if (isRegistered.length > 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: `The provided phone number ${phoneno} is already registered by another user.☹️`,
        })
      );
    }

    let updatedFields = {};

    updatedFields["country_code"] = country_code;
    updatedFields["phoneno"] = phoneno;

    if (action == "change") {
      updatedFields["is_verify"] = 0;
      await updateUser(updatedFields, userId);
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          statusCode: 200,
          status: "success",
          msg: "Phone number changed successfully,but not verified✅",
        })
      );
    }
    if (action == "verify") {
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
          msg: "OTP sent successfully on given number to verify",
          data: {
            otpid: response.orderId,
          },
        })
      );
    }
  } catch (error) {
    console.log("error while changing Name", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error when changing phone number👨🏻‍🔧",
      })
    );
  }
};

exports.verifyChangedPhoneNumber = async (req, res, next) => {
  try {
    const { country_code, phoneno, otpid, enteredotp } = req.body;
    const userId = req.user.userId;

    const phonewithcountrycode = country_code + phoneno;

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

    let updatedFields = {};

    updatedFields["country_code"] = country_code;
    updatedFields["phoneno"] = phoneno;
    if (varificationresponse.isOTPVerified === true) {
      updatedFields["is_verify"] = 1;
      await updateUser(updatedFields, userId);
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          statusCode: 201,
          status: "success",
          msg: "Phone number updated and verified successfully✅",
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
    console.log("error while changing Name", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error when changing phone number👨🏻‍🔧",
      })
    );
  }
};

exports.userInformation = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const [userResults] = await findUser({ id: userId });
    const [referralInfo]=await findReferralInfo(userId);
    if (!userResults || userResults.length == 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: "No user found",
        })
      );
    }
    const { first_name, last_name, email, country_code, phoneno, is_verify } =
      userResults[0];
    const {code,total_amt,remaining_amt}=referralInfo[0];

    const userData = {
      email: email,
      firstName: first_name,
      lastName: last_name,
      country_code: country_code,
      phoneno: phoneno,
      referral_code:code,
      total_earned_amt:total_amt,
      remaining_amt:remaining_amt
    };

    if (phoneno) {
      (userData.is_verify = is_verify),
        (userData.phoneNumberStatus =
          is_verify === 1 ? "verified" : "unverified"),
        (userData.phoneNumberStatusMessage =
          is_verify === 1
            ? "Your phone number is verified"
            : "Unverified. Verify your number to secure your account.");
    }

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        statusCode: 200,
        status: "success",
        data: { userData },
        msg: "User data retrived successfully✅",
      })
    );
  } catch (error) {
    console.log("error while changing Name", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error when fetching user information👨🏻‍🔧",
      })
    );
  }
};
