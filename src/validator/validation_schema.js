
const Joi = require("joi");

const sendOtpRegisterSchema = Joi.object({
    email: Joi.string().email(),
    phoneno: Joi.string().pattern(/^\d{10}$/),
    country_code: Joi.string().pattern(/^\+?\d{1,3}$/).when('phoneno', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }).xor('email', 'phoneno');

  const verifyOtpRegisterSchema = Joi.object({
    email: Joi.string().email(),
    phoneno: Joi.string().pattern(/^\d{10}$/),
    country_code: Joi.when('phoneno', {
      is: Joi.exist(),
      then: Joi.string().pattern(/^\+?\d{1,3}$/).required(),
      otherwise: Joi.optional()
    }),
    password: Joi.string().min(8).required(),
    otpid: Joi.string().required(),
    enteredotp: Joi.string().pattern(/^\d{6}$/).required(),
    referral_code: Joi.string().optional(),
  }).xor('email', 'phoneno');

  const loginSchema = Joi.object({
    email: Joi.string().email(),
    password: Joi.string().min(8).when('email', { is: Joi.exist(), then: Joi.required() }),
    phoneno: Joi.string().pattern(/^\d{10}$/),
    country_code: Joi.string().pattern(/^\+?\d{1,3}$/).when('phoneno', { is: Joi.exist(), then: Joi.required() })
  }).xor('email', 'phoneno').xor('password', 'country_code');

const verifyLoginSchema= Joi.object({
    phoneno: Joi.string().pattern(/^\d{10}$/).required(),
    country_code: Joi.string().pattern(/^\+?\d{1,3}$/).required(),
    otpid: Joi.string().required(),
    enteredotp: Joi.string().pattern(/^\d{6}$/).required()
  });

  const refreshAccessTokenSchema = Joi.object({
    refreshToken: Joi.string().required()
  });

const resetPasswordSchema = Joi.object({
    email: Joi.string().email().lowercase().required(),
  });

  const postResetPasswordSchema = Joi.object({
    newPassword: Joi.string().min(8).required()
  });

module.exports={
    sendOtpRegisterSchema,
    resetPasswordSchema,
    verifyOtpRegisterSchema,
    loginSchema,
    verifyLoginSchema,
    refreshAccessTokenSchema,
    postResetPasswordSchema
}