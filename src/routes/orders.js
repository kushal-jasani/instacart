const express = require("express");
const router = express.Router();
const ordersController = require("../controller/orders");
const { isAuth } = require("../middleware/is_auth");

router.post("/orders/checkout", isAuth, ordersController.processOrder);
router.get('/orders/my-orders',isAuth,ordersController.getOrders);
router.get('/orders/my-orders/orderdetail',isAuth,ordersController.getOrderDetails);


router.post("/add-address", isAuth, ordersController.addAddress);
router.post(
  "/addresses/:addressId/edit-address",
  isAuth,
  ordersController.editAddress
);
router.delete(
  "/addresses/:addressId/delete-address",
  isAuth,
  ordersController.deleteAddress
);
router.get("/addresses", isAuth, ordersController.getAddress);
router.get(
  "/addresses/pickup-address",
  isAuth,
  ordersController.getStoreAddressForPickup
);
router.get(
  "/orders/delivery-timing",
  isAuth,
  ordersController.getDeliverySlots
);
router.post(
  "/orders/calculate-subtotal",
  isAuth,
  ordersController.calculateSubTotal
);
router.get(
  "/orders/giftcard/images",
  isAuth,
  ordersController.getGiftcardImages
);
router.post("/orders/stripe/webhook", ordersController.webhook);

module.exports = router;
