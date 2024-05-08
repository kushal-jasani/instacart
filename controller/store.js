const { generateResponse, sendHttpResponse } = require("../helper/response");
const {
  getMainCategories,
  getAllStores,
  checkInStorePrices,
  getNextDeliveryTime,
  getStoresOpenAfterEleven,
  getPickupAvailableStores,
  getStoreByCategory,
} = require("../repository/store");

exports.categoryFilter = async (req, res, next) => {
  try {
    const [categoryList] = await getMainCategories();

    if (categoryList.length === 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 404,
          msg: "No categories found",
        })
      );
    }

    const categoryFilters = categoryList.map((category) => {
      return {
        id: category.id,
        name: category.name,
        imageUrl: category.image,
      };
    });

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 200,
        msg: "Category filters retrieved successfully",
        data: {
          categoryList: categoryFilters,
        },
      })
    );
  } catch (error) {
    console.log("error while fetching category list: ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error when fetching categorylist👨🏻‍🔧",
      })
    );
  }
};

exports.getStoresByCategory = async (req, res, next) => {
  try {
    let { main_category_id } = req.query;
    main_category_id = main_category_id > 14 ? "1" : main_category_id;
    let stores;
    if (main_category_id === "1") {
      [stores] = await getAllStores();
    } else if (main_category_id === "2") {
      [stores] = await getStoresOpenAfterEleven();
    } else if (main_category_id === "3") {
      // For main_category_id 3 (offers), we won't handle it here.
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 404,
          msg: "Functionality for offers category will be implemented later.",
        })
      );
    } else if (main_category_id === "4") {
      [stores] = await getPickupAvailableStores();
    } else {
      [stores] = await getStoreByCategory(main_category_id);
    }
    if (!stores || stores.length === 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 404,
          msg: "No stores found for the given category",
        })
      );
    }

    const singleResData = [];
    const responseData = await Promise.all(
      stores.map(async (store) => {
        const messages = [];
        // Check if in-store prices are available
        const inStorePrices = await checkInStorePrices(store.id);
        if (inStorePrices) {
          messages.push("In-store prices available");
        }

        // Check if pickup is available
        if (store.is_pickup_avail) {
          messages.push("Pickup available");
        }

        // Check for next possible delivery time
        const deliveryBy = await getNextDeliveryTime(store.id);
        if (deliveryBy) {
          messages.push(`Delivery by ${deliveryBy}`);
        }

        singleResData.push({
          store_id: store.id,
          store_name: store.name,
          image_url: store.logo,
          store_categories: store.store_categories,
          messages,
        });
      })
    );

    // const currentTime = new Date();
    // const storeData = stores.map(store => {
    //     let msg = "";
    //     if (store.is_instore === 1) {
    //         msg = "In-store prices available";
    //     } else {
    //         const nextDeliveryTime = getNextDeliveryTime(store.id, currentTime);
    //         msg = `Next delivery available at ${nextDeliveryTime}`;
    //     }
    //     return {
    //         id: store.id,
    //         name: store.name,
    //         msg: msg
    //     };
    // });

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 200,
        msg: "Stores retrieved successfully.",
        data: singleResData,
      })
    );
  } catch (error) {
    console.log("Error while fetching stores: ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error while fetching stores👨🏻‍🔧",
      })
    );
  }
};

exports.getStoreDetailsFront = async (req, res, next) => {
  try {
  } catch (error) {
    console.log("Error while fetching store front detail: ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error while fetching store front detail👨🏻‍🔧",
      })
    );
  }
};
