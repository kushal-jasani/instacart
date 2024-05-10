const express = require("express");
const router = express.Router();
const storeController=require('../controller/store');

router.get('/categorylist',storeController.categoryFilter);
router.get('/category',storeController.getStoresByCategory);

router.get('/:storeId/front',storeController.getStoreDetailsFront);
router.get('/:storeId/info',storeController.getStoreDetailsInside);
router.get('/collection/:categoryId',storeController.getStoreSubcategory);


module.exports=router;