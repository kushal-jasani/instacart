require("dotenv").config();

const { generateResponse, sendHttpResponse } = require("../helper/response");
const uuid = require("uuid");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const {
  insertOrder,
  insertOrderItems,
  insertPaymentDetails,
  insertAddress,
  findAddressDetails,
  cartItemsDetailWithDiscount,
  findStorePricing,
  insertIntoDeliveryAddress,
  findAddressFromId,
  findGiftCardImages,
  getPaymentDetails,
  updateOrderStatus,
  updatePaymentDetails,
  findPickupAddressDetails,
} = require("../repository/order");
const {
  getNextDeliverySlot,
  deliveryTimings,
  findStoreInsideDetails,
} = require("../repository/store");

const {
  orderSchema,
  calculateSubTotalSchema,
  deliveryOrderSchema,
  pickupOrderSchema,
  addressSchema,
} = require("../helper/order_schema");

function generateInvoiceNumber() {
  return uuid.v4();
}

exports.processOrder = async (req, res, next) => {
  try {
    const {
      store_id,
      cart_items,
      address_id,
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
      bag_fee,
      discount_applied,
      subtotal,
      pickup_address_id,
      pickup_day,
      pickup_slot,
      pickup_fee,
    } = req.body;

    let schema;

    if (address_id) {
      schema = deliveryOrderSchema;
    } else if (pickup_address_id) {
      schema = pickupOrderSchema;
    } else {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: "Either address_id or pickup_address_id must be provided, but not both.",
        })
      );
    }

    const { error } = schema.validate(req.body);
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

    let delivery_address_id;
    if (address_id) {
      const [addressDetails] = await findAddressFromId(address_id);
      const [deliveryAddress] = await insertIntoDeliveryAddress(
        addressDetails[0]
      );
      delivery_address_id = deliveryAddress.insertId;
    }

    const orderData = {
      user_id: req.user.userId,
      store_id,
      delivery_address_id: delivery_address_id || null,
      delivery_instructions: delivery_address_id ? delivery_instructions : null,
      is_leave_it_door: delivery_address_id ? is_leave_it_door : null,
      actual_subtotal,
      final_subtotal,
      service_fee,
      bag_fee,
      delivery_fee: address_id ? delivery_fee : null,
      subtotal,
      discount_applied,
      delivery_type: address_id ? delivery_type : null,
      delivery_day: address_id ? delivery_day : null,
      delivery_slot: address_id ? delivery_slot : null,
      country_code,
      mobile_number,
      payment_mode,
      gift_recipitent_name:
        gift_option && !pickup_address_id ? gift_recipitent_name : null,
      recipitent_country_code:
        gift_option && !pickup_address_id ? recipitent_country_code : null,
      recipitent_mobile:
        gift_option && !pickup_address_id ? recipitent_mobile : null,
      gift_sender_name:
        gift_option && !pickup_address_id ? gift_sender_name : null,
      gift_card_image_id:
        gift_option && !pickup_address_id ? gift_card_image_id : null,
      gift_message: gift_option && !pickup_address_id ? gift_message : null,

      pickup_address_id: pickup_address_id || null,
      pickup_day: pickup_address_id ? pickup_day : null,
      pickup_slot: pickup_address_id ? pickup_slot : null,
      pickup_fee: pickup_address_id ? pickup_fee : null,
    };

    const [orderResult] = await insertOrder(orderData);
    const orderId = orderResult.insertId;
    await insertOrderItems(orderId, cart_items);
    await insertPaymentDetails(orderId, payment_mode);

    let paymentIntent;
    paymentIntent = await stripe.paymentIntents.create({
      amount: subtotal * 100,
      currency: "usd",
      description: "Order payment",
      payment_method_types: ["card"],
      metadata: { orderId },
    });

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 201,
        data: {
          order_id: orderId,
          paymentIntent_id: paymentIntent ? paymentIntent.id : null,
          paymentIntent_client_secret: paymentIntent
            ? paymentIntent.client_secret
            : null,
        },
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

exports.webhook = async (req, res, next) => {
  try {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event, orderId, invoiceNumber, paymentDetail;

    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);

    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntentSucceeded = event.data.object;
        orderId = paymentIntentSucceeded.metadata.orderId;

        [paymentDetail] = await getPaymentDetails(orderId);
        invoiceNumber = paymentDetail[0].invoice;
        if (paymentDetail[0].status !== paymentIntentSucceeded.status) {
          invoiceNumber = generateInvoiceNumber();
        }

        // Update order table status & the payment details table with the payment status
        await updateOrderStatus(orderId, "placed");
        await updatePaymentDetails(
          orderId,
          invoiceNumber,
          paymentIntentSucceeded.payment_method_types[0],
          paymentIntentSucceeded.status
        );
        break;

      case "payment_intent.canceled":
        const paymentIntentCanceled = event.data.object;
        // Then define and call a function to handle the event payment_intent.canceled
        break;

      case "payment_intent.created":
        const paymentIntentCreated = event.data.object;
        // Then define and call a function to handle the event payment_intent.created
        break;

      case "payment_intent.payment_failed":
        const paymentIntentPaymentFailed = event.data.object;
        orderId = paymentIntentPaymentFailed.metadata.orderId;
        [paymentDetail] = await getPaymentDetails(orderId);
        invoiceNumber = paymentDetail[0].invoice_number;
        if (paymentDetail[0].status !== paymentIntentPaymentFailed.status) {
          invoiceNumber = generateInvoiceNumber();
        }

        // Update order table status & the payment details table with the payment status
        await updateOrderStatus(orderId, "cancel");
        await updatePaymentDetails(
          orderId,
          invoiceNumber,
          paymentIntentPaymentFailed.payment_method_types[0],
          paymentIntentPaymentFailed.status
        );
        break;

      case "payment_intent.processing":
        const paymentIntentProcessing = event.data.object;
        // Then define and call a function to handle the event payment_intent.processing
        break;

      case "payment_intent.requires_action":
        const paymentIntentRequiresAction = event.data.object;
        // Then define and call a function to handle the event payment_intent.requires_action
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch {
    console.error("Error processing webhook event:", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Webhook error",
      })
    );
  }
};

exports.getStoreAddressForPickup = async (req, res, next) => {
  try {
    const { storeId } = req.query;

    const [addressDetails] = await findPickupAddressDetails(storeId);

    if (addressDetails.length == 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "success",
          statusCode: 200,
          msg: "no pickup address has found for this store!!",
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
        msg: "Store pickup address fetched successfully🥳",
      })
    );
  } catch (error) {
    console.log("error while fetching store pickup address:", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error while fetching store pickup address👨🏻‍🔧",
      })
    );
  }
};

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

    const { error } = addressSchema.validate(req.body);
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
        next_delivery: getNextDeliverySlot(
          store.delivery_timings,
          store.priority_delivery_timings
        ),
        delivery_timings: deliveryTimings(store.delivery_timings),
      },
      ...(store.is_pickup_avail === 1
        ? {
            pickup_time: {
              next_pickup: getNextDeliverySlot(store.pickup_timings),
              pickup_timings: deliveryTimings(store.pickup_timings),
            },
          }
        : {}),
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
    console.log("error while fetching delivery slots:", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error while fetching delivery slots👨🏻‍🔧",
      })
    );
  }
};

exports.calculateSubTotal = async (req, res, next) => {
  try {
    const { store_id, cart_items, delivery_fee, pickup_fee } = req.body;

    const { error } = calculateSubTotalSchema.validate(req.body);
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
    if ((delivery_fee && pickup_fee) || (!delivery_fee && !pickup_fee)) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: "Either delivery_fee or pickup_fee must be provided, but not both.",
        })
      );
    }
    const productIds = cart_items.map((p) => p.product_id);

    const [productResults] = await cartItemsDetailWithDiscount(
      productIds,
      store_id
    );

    const productDetails = productResults.reduce((acc, productResult) => {
      acc[productResult.product_id] = productResult;
      return acc;
    }, {});
    let original_item_subtotal = 0.0;
    let item_subtotal = 0.0;
    let discount_applied = 0.0;

    for (const item of cart_items) {
      const { product_id, quantity } = item;
      const product = productDetails[product_id];
      let original_final_price = product.price * quantity;

      let final_price = product.price * quantity;

      if (product.discount_id && quantity >= product.buy_quantity) {
        let discount_amount = 0.0;
        if (product.discount_type == "rate") {
          discount_amount =
            ((product.price * product.discount) / 100) *
            Math.floor(quantity / product.buy_quantity);
        } else if (product.discount_type == "fixed") {
          discount_amount =
            product.discount * Math.floor(quantity / product.buy_quantity);
        } else if (product.get_quantity) {
          const freeItems =
            Math.floor(
              quantity /
                (parseInt(product.buy_quantity) +
                  parseInt(product.get_quantity))
            ) * product.get_quantity;
          discount_amount = product.price * freeItems;
        }
        discount_applied += discount_amount;
        final_price -= discount_amount;
      }
      item_subtotal += final_price;
      original_item_subtotal += original_final_price;
    }

    const [storePricingResults] = await findStorePricing(store_id);
    const storePricing = storePricingResults[0];
    let service_fee = 0.0;
    if (storePricing.has_service_fee) {
      service_fee = Math.max(
        storePricing.per_item_charge * cart_items.length,
        storePricing.min_value
      );
      service_fee = Math.min(
        service_fee,
        (item_subtotal * storePricing.max_percentage) / 100
      );
    }
    let bag_fee = 0.0;
    if (storePricing.has_bag_fee) {
      bag_fee = Math.max(storePricing.bag_fee, 0);
    }
    const applied_fee = delivery_fee ? delivery_fee : pickup_fee;

    const subTotal = item_subtotal + applied_fee + service_fee + bag_fee;
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 201,
        data: {
          actual_item_subtotal: original_item_subtotal.toFixed(2),
          final_item_subtotal: item_subtotal.toFixed(2),
          ...(applied_fee && {
            [pickup_fee ? "pickup_fee" : "delivery_fee"]:
              applied_fee.toFixed(2),
          }),
          service_fee: service_fee.toFixed(2),
          bag_fee: bag_fee.toFixed(2),
          subtotal: subTotal.toFixed(2),
          discount_applied: discount_applied.toFixed(2),
        },
        msg: "Subtotal calculated successfully",
      })
    );
  } catch (error) {
    console.log("error while calculating subtotal:", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error while calculating subtotal👨🏻‍🔧",
      })
    );
  }
};

exports.getGiftcardImages = async (req, res, next) => {
  try {
    const [giftImages] = await findGiftCardImages();
    if (!giftImages || giftImages.length == 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "success",
          statusCode: 200,
          msg: "No Gift card images found",
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
        data: { giftCardImages: giftImages },
        msg: "Gift card images fetched successfully",
      })
    );
  } catch (error) {
    console.log("error while fetching giftcard images:", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "internal server error while fetching giftcard images👨🏻‍🔧",
      })
    );
  }
};
