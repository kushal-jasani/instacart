const Joi = require("joi");

const changeEmailSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
});

const changePasswordSchema = Joi.object({
  newPassword: Joi.string().min(8).required(),
  confirmNewPassword: Joi.string().min(8).required(),
});

const changeNameSchema = Joi.object({
  firstName: Joi.string().min(1).required(),
  lastName: Joi.string().min(1).required(),
}).or("firstName", "lastName");

const changePhoneNumberSchema = Joi.object({
    phoneno: Joi.string().pattern(/^\d{10}$/).required(),
    country_code: Joi.string().pattern(/^\+?\d{1,3}$/).required(),
    action: Joi.string().valid('change', 'verify').required()
  });

module.exports = { changeEmailSchema, changePasswordSchema, changeNameSchema,changePhoneNumberSchema};
