const { generateResponse, sendHttpResponse } = require("../helper/response");
const {
  insertOrder,
  insertOrderItems,
  insertPaymentDetails,
  insertAddress,
  findAddressDetails,
} = require("../repository/order");
const { getNextDeliverySlot, deliveryTimings, findStoreInsideDetails } = require("../repository/store");

exports.processOrder = async (req, res, next) => {
  try {
    const {
      store_id,
      cart_items,
      delivery_address_id,
      delivery_instructions,
      is_leave_it_door,
      delivery_type,
      delivery_day,
      delivery_slot,
      country_code,
      mobile_number,
      payment_mode,
      gift_option,
      gift_recipitent_name,
      recipitent_country_code,
      recipitent_mobile,
      gift_sender_name,
      gift_card_image_id,
      gift_message,
      actual_subtotal,
      final_subtotal,
      service_fee,
      delivery_fee,
      subtotal,
    } = req.body;

    const orderData = {
      user_id: req.user.userId,
      store_id,
      delivery_address_id,
      delivery_instructions,
      is_leave_it_door,
      actual_subtotal,
      final_subtotal,
      service_fee,
      bag_fee,
      delivery_fee,
      subtotal,
      delivery_type,
      delivery_day,
      delivery_slot,
      country_code,
      mobile_number,
      payment_mode,
      gift_recipitent_name: gift_option ? gift_recipitent_name : null,
      recipitent_country_code: gift_option ? recipitent_country_code : null,
      recipitent_mobile: gift_option ? recipitent_mobile : null,
      gift_sender_name: gift_option ? gift_sender_name : null,
      gift_card_image_id: gift_option ? gift_card_image_id : null,
      gift_message: gift_option ? gift_message : null,
    };

    const [orderResult] = await insertOrder(orderData);
    const orderId = orderResult.insertId;
    await insertOrderItems(orderId, cart_items);
    await insertPaymentDetails(orderId, payment_mode);

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 201,
        data: { orderId },
        msg: "Order successfully created",
      })
    );
  } catch (error) {
    console.log("error while creating order:", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error while creating order👨🏻‍🔧",
      })
    );
  }
};

// exports.postOrder = async (req, res, next) => {
//   try {
//     const { store_id, cart_items, gift_option } = req.body;
//     const userId = req.user.userId;
//   } catch (error) {}
// };

exports.getAddress = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const [addressDetails] = await findAddressDetails(userId);

    if (addressDetails.length == 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "success",
          statusCode: 200,
          msg: "no address has been added by you yet!!",
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
        data: { addressDetails },
        msg: "address fetched successfully🥳",
      })
    );
  } catch (error) {
    console.log("error while fetching address:", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error while fetching address👨🏻‍🔧",
      })
    );
  }
};

exports.addAddress = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    let { street, zip_code, floor, business_name, latitude, longitude } =
      req.body;
    floor = floor || null;
    business_name = business_name || null;
    latitude = latitude || null;
    longitude = longitude || null;
    const [addressResult] = await insertAddress(
      userId,
      street,
      zip_code,
      floor,
      business_name,
      latitude,
      longitude
    );
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 201,
        data: { address_id: addressResult.insertId },
        msg: "Address added successfully",
      })
    );
  } catch (error) {
    console.log("error while adding address:", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error while adding address👨🏻‍🔧",
      })
    );
  }
};

exports.getDeliverySlots = async (req, res, next) => {
  try {
    const { storeId } = req.query;

    const [queryResult] = await findStoreInsideDetails(storeId);

    var response = queryResult.map((store) => ({
      delivery_time: {
        next_delivery: getNextDeliverySlot(store.delivery_timings),
        delivery_timings: deliveryTimings(store.delivery_timings),
      },
    }));
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 200,
        data: response,
        msg: "Delivery slots fetched successfully⚡️",
      })
    );
  } catch (error) {
    console.log("error while fetching deliveryslots:", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error while fetching deliveryslots👨🏻‍🔧",
      })
    );
  }
};
