const express = require("express");
const router = express.Router();
const storeController=require('../controller/store');

router.get('/categorylist',storeController.categoryFilter);
router.get('/category',storeController.getStoresByCategory);

router.get('/:storeId/front',storeController.getStoreDetailsFront);
router.get('/:storeId/info',storeController.getStoreDetailsInside);
router.get('/collection/:categoryId',storeController.getStoreSubcategory);

router.get('/collection/subcategory/:subcategoryId',storeController.getProductsFromSubCategory);

router.get('/collection/store/:storeId',storeController.getProductsByStoreId);

router.get('/search',storeController.search)
router.get('/inside/search',storeController.searchInsideStore)


module.exports=router;