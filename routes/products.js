const express = require("express");
const router = express.Router();
const productController=require('../controller/products');

router.get('/:productId',productController.getProductDetail);

module.exports=router;