const Joi = require("joi");

const addListSchema = Joi.object({
    store_id: Joi.number().integer().required(),
    title: Joi.string().min(5).required(),
    description: Joi.string().optional(),
    cover_photo_id: Joi.number().integer().optional()
  });

const addListItemsSchema = Joi.object({
    list_id: Joi.number().integer().required(),
    product_ids: Joi.array().items(Joi.number().integer().required()).required()
  });

const editListSchema = Joi.object({
    title: Joi.string().min(3).optional(),
    description: Joi.string().optional(),
    cover_photo_id: Joi.number().integer().optional(),
  });

const editListItemsSchema = Joi.object({
    list_id: Joi.number().integer().required(),
    product_ids: Joi.array().items(Joi.number().integer()).required(),
  });

module.exports={addListSchema,addListItemsSchema,editListSchema,editListItemsSchema}