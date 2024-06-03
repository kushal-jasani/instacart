const express = require("express");
const router = express.Router();
const storeController = require("../controller/store");
const { isAuth } = require("../middleware/is_auth");

router.get("/categorylist", storeController.categoryFilter);
router.get("/category", storeController.getStoresByCategory);
router.get(
  "/category/populargifts",
  storeController.getProductsForGiftsStore
);

router.get("/:storeId/front", storeController.getStoreDetailsFront);
router.get("/:storeId/info", storeController.getStoreDetailsInside);
router.get("/collection/:categoryId", storeController.getStoreSubcategory);

router.get(
  "/collection/subcategory/:subcategoryId",
  storeController.getProductsFromSubCategory
);

router.get("/collection/store/:storeId", storeController.getProductsByStoreId);

router.get("/search", storeController.search);
router.get("/inside/search", storeController.searchInsideStore);

router.post("/lists/createlist", isAuth, storeController.addList);
router.post("/lists/add-list-items", isAuth, storeController.addListItems);
router.delete("/lists/edit-list-items", isAuth, storeController.editListItems);

router.get("/lists/cover-images", storeController.getListCoverImages);
router.get("/lists/list-details", isAuth, storeController.getList);

router.post("/lists/:listId/edit", isAuth, storeController.editList);
router.delete("/lists/:listId/delete", isAuth, storeController.deleteList);


module.exports = router;
