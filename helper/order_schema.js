const Joi = require("joi");

const deliveryOrderSchema = Joi.object({
  store_id: Joi.number().integer().required(),
  cart_items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().integer().required(),
        quantity: Joi.number().integer().required(),
      })
    )
    .required(),
  address_id: Joi.number().integer().required(),
  delivery_instructions: Joi.string().allow(null, ""),
  is_leave_it_door: Joi.boolean().allow(null),
  delivery_type: Joi.string().required(),
  delivery_day: Joi.string().required(),
  delivery_slot: Joi.string().required(),
  country_code: Joi.string().required(),
  mobile_number: Joi.string().required(),
  payment_mode: Joi.string().required(),
  gift_option: Joi.boolean().optional(),
  gift_recipitent_name: Joi.when("gift_option", {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  recipitent_country_code: Joi.when("gift_option", {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  recipitent_mobile: Joi.when("gift_option", {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  gift_sender_name: Joi.when("gift_option", {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  gift_card_image_id: Joi.when("gift_option", {
    is: true,
    then: Joi.number().integer().required(),
    otherwise: Joi.number().integer().optional(),
  }),
  gift_message: Joi.when("gift_option", {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  actual_subtotal: Joi.number().required(),
  final_subtotal: Joi.number().required(),
  service_fee: Joi.number().required(),
  delivery_fee: Joi.number().required(),
  bag_fee: Joi.number().required(),
  discount_applied: Joi.number().required(),
  subtotal: Joi.number().required(),
  pickup_address_id: Joi.forbidden(),
  pickup_day: Joi.forbidden(),
  pickup_slot: Joi.forbidden(),
  pickup_fee: Joi.forbidden(),
});

const pickupOrderSchema = Joi.object({
  store_id: Joi.number().integer().required(),
  cart_items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().integer().required(),
        quantity: Joi.number().integer().required(),
      })
    )
    .required(),
  address_id: Joi.forbidden(),
  delivery_instructions: Joi.forbidden(),
  is_leave_it_door: Joi.forbidden(),
  delivery_type: Joi.forbidden(),
  delivery_day: Joi.forbidden(),
  delivery_slot: Joi.forbidden(),
  country_code: Joi.string().required(),
  mobile_number: Joi.string().required(),
  payment_mode: Joi.string().required(),
  gift_option: Joi.boolean().forbidden(),
  gift_recipitent_name: Joi.forbidden(),
  recipitent_country_code: Joi.forbidden(),
  recipitent_mobile: Joi.forbidden(),
  gift_sender_name: Joi.forbidden(),
  gift_card_image_id: Joi.forbidden(),
  gift_message: Joi.forbidden(),
  actual_subtotal: Joi.number().required(),
  final_subtotal: Joi.number().required(),
  service_fee: Joi.number().required(),
  delivery_fee: Joi.forbidden(),
  bag_fee: Joi.number().required(),
  discount_applied: Joi.number().required(),
  subtotal: Joi.number().required(),
  pickup_address_id: Joi.number().integer().required(),
  pickup_day: Joi.string().required(),
  pickup_slot: Joi.string().required(),
  pickup_fee: Joi.number().required(),
});

const calculateSubTotalSchema = Joi.object({
  store_id: Joi.number().integer().required(),
  cart_items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().integer().required(),
        quantity: Joi.number().integer().required(),
      })
    )
    .required(),
  delivery_fee: Joi.number().optional(),
  pickup_fee: Joi.number().optional(),
});

const addressSchema = Joi.object({
  street: Joi.string().required(),
  zip_code: Joi.string().required(),
  floor: Joi.string().allow(null, ""),
  business_name: Joi.string().allow(null, ""),
  latitude: Joi.number().precision(8).optional(),
  longitude: Joi.number().precision(8).optional(),
});

const editAddressSchema = Joi.object({
  street: Joi.string().min(5).optional(),
  zip_code: Joi.string().min(5).optional(),
  floor: Joi.string().optional(),
  business_name: Joi.string().optional(),
  latitude: Joi.string().optional(),
  longitude: Joi.string().optional(),
});
module.exports = {
  deliveryOrderSchema,
  pickupOrderSchema,
  calculateSubTotalSchema,
  addressSchema,
  editAddressSchema
};
