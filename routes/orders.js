const express=require('express');
const router=express.Router();
const ordersController=require('../controller/orders');
const {isAuth}=require('../middleware/is-auth');

router.post('/orders/checkout',isAuth,ordersController.processOrder);

router.post('/add-address',isAuth,ordersController.addAddress);
router.get('/addresses',isAuth,ordersController.getAddress);
router.get('/orders/delivery-timing',isAuth,ordersController.getDeliverySlots);
router.post('/orders/calculate-subtotal',isAuth,ordersController.calculateSubTotal);
router.get('/orders/giftcard/images',isAuth,ordersController.getGiftcardImages);

module.exports=router;