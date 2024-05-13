const { generateResponse, sendHttpResponse } = require("../helper/response");
const {
  getMainCategories,
  getAllStores,
  checkInStorePrices,
  getNextDeliveryTime,
  getStoresOpenAfterEleven,
  getPickupAvailableStores,
  getStoreByCategory,
  findStoreFrontDetails,
  findStoreInsideDetails,
  formatBagFee,
  formatServiceFee,
  formatDeliveryFee,
  getNextDeliverySlot,
  formatHours,
  deliveryTimings,
  findSubCategoryOfStore,
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
    const { storeId } = req.params;

    const [results] = await findStoreFrontDetails(storeId);

    if (!results || results.length == 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 404,
          msg: "Store not found!!",
        })
      );
    }

    const response = results.map((store) => {
      const messages = [];
      messages.push(store.type);
      if (store.has_service_fee === 1 && store.has_bag_fee === 1) {
        messages.push("Bag and services fees apply");
      }
      messages.push(
        `$${store.charge} delivery fee on $${store.min_order_value}+`
      );

      return {
        store_id: store.store_id,
        store_name: store.store_name,
        logo: store.logo,
        categories: store.categories,
        messages: messages,
      };
    });

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 200,
        data: response,
        msg: "Store front details fetched successfully",
      })
    );
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

exports.getStoreSubcategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    const [subCategoryResults] = await findSubCategoryOfStore(categoryId);

    if (!subCategoryResults || subCategoryResults.length == 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 404,
          msg: "No Subcategory for this Category found!!",
        })
      );
    }


    const modifiedResponse = subCategoryResults.reduce((acc, curr) => {
      const subcategoryId = curr.subcategory_id;
      const subcategoryName = curr.subcategory_name;
      if (!acc[subcategoryId]) {
        acc[subcategoryId] = {
          subcategory_id: subcategoryId,
          subcategory_name: subcategoryName,
          products: [],
        };
      }

      let discountLabel = null;
    if (curr.discount_id !== null) {
      if (curr.discount === null) {
        discountLabel = `Buy ${curr.buy_quantity}, get ${curr.get_quantity}`;
      } else {
        if (curr.discount_type === "fixed") {
          discountLabel = `Buy ${curr.buy_quantity}, get $${curr.discount} off`;
        } else if (curr.discount_type === "rate") {
          discountLabel = `Buy ${curr.buy_quantity}, get ${curr.discount}% off`;
        }
      }
    }

      acc[subcategoryId].products.push({
        id: curr.product_id,
        title: curr.product_title,
        image: curr.product_image,
        label:curr.quantity === 1 ? `${curr.quantity_variant} ${curr.unit}`
              : `${curr.quantity} × ${curr.quantity_variant} ${curr.unit}`,
        actual_price: curr.actual_price,
        selling_price: curr.selling_price,
        ...(curr.discount_id !== null && { discount_label: discountLabel })
      });
      return acc;
    }, {});

    const responseArray = Object.values(modifiedResponse);

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 200,
        data: responseArray,
        msg: "Subcategory and products details fetched successfully",
      })
    );
  } catch (error) {
    console.log("Error while fetching subcategories: ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error while fetching subcategories👨🏻‍🔧",
      })
    );
  }
};

exports.getStoreDetailsInside = async (req, res, next) => {
  try {
    const { storeId } = req.params;

    const [queryResult] = await findStoreInsideDetails(storeId);

    if (!queryResult || queryResult.length == 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 404,
          msg: "Store Detail not found!!",
        })
      );
    }

    var response = queryResult.map((store) => ({
      store_id: store.store_id,
      store_name: store.store_name,
      logo: store.logo,
      store_categories: store.store_categories,
      pricing: {
        store_pricing_type: store.store_pricing_type,
        store_pricing_description: store.store_pricing_description,
        delivery_fee: store.is_delivery_avail ? formatDeliveryFee(store) : null,
        service_fee: store.has_service_fee ? formatServiceFee(store) : null,
        bag_fee: store.has_bag_fee ? formatBagFee(store) : null,
      },
      return_policy: {
        return_policy_title: store.return_policy_title,
        decrtiption: store.policy_description,
      },
      delivery_time: {
        next_delivery: getNextDeliverySlot(store.delivery_timings),
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
      about: {
        description: store.description,
        is_delivery_avail: store.is_delivery_avail,
        is_pickup_avail: store.is_pickup_avail,
      },
      hours: formatHours(store.store_opening_info),
    }));

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 200,
        data: response,
        msg: "Store-Inside details fetched successfully",
      })
    );
  } catch (error) {
    console.log("Error while fetching store inside detail: ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error while fetching store inside detail👨🏻‍🔧",
      })
    );
  }
};
