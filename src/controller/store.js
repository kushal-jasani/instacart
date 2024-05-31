const {
  generateResponse,
  sendHttpResponse,
} = require("../helper/response");
const {
  editListItemsSchema,
  editListSchema,
  addListItemsSchema,
  addListSchema,
} = require("../validator/store_schema");
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
  findProductsOfSubcategory,
  findProductsByStoreId,
  findStoresByName,
  findProductsByTitle,
  findStoresByIds,
  findProductsByTitleAndStoreId,
  generateDiscountLabel,
  createList,
  insertListItems,
  findListDetails,
  findCoverImagesOfList,
  updateListDetails,
  updateListItems,
  getDiscountStores,
  getCategoryNames,
  findGiftStores,
  findGiftImages,
  getGiftProducts,
  countProductsOfSubcategory,
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
    let giftStoreCount = 0;
    let giftBannerImages;

    main_category_id = main_category_id > 14 ? "1" : main_category_id;
    let stores;
    if (main_category_id === "1") {
      [stores] = await getAllStores();
    } else if (main_category_id === "2") {
      [stores] = await getStoresOpenAfterEleven();
    } else if (main_category_id === "3") {
      [stores] = await getDiscountStores();
    } else if (main_category_id === "4") {
      [stores] = await getPickupAvailableStores();
    } else if (main_category_id === "8") {
      [stores] = await findGiftStores();
      [giftBannerImages] = await findGiftImages();
      giftBannerImages = giftBannerImages[0].gift_banners;
      giftStoreCount = stores.length;
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
    const storeIds = stores.map((store) => store.id);
    const [inStorePrices] = await checkInStorePrices(storeIds);
    const { todayRows, tomorrowRows } = await getNextDeliveryTime(storeIds);

    let categoryNames = {};
    if (main_category_id == 3) {
      const categoryIds = stores
        .filter((store) => store.category_id)
        .map((store) => store.category_id);
      if (categoryIds.length > 0) {
        categoryNames = await getCategoryNames(categoryIds);
      }
    }

    const singleResData = stores.map((store) => {
      const messages = [];

      const inStorePrice = inStorePrices.find(
        (price) => price.store_id === store.id
      );
      if (inStorePrice) {
        messages.push("In-store prices available");
      }

      if (store.is_pickup_avail) {
        messages.push("Pickup available");
      }

      const todayDelivery = todayRows.find((row) => row.store_id === store.id);
      const tomorrowDelivery = tomorrowRows.find(
        (row) => row.store_id === store.id
      );

      if (todayDelivery) {
        const todayUpperSlot = todayDelivery.time_slot.split(" - ")[1];
        messages.push(`Delivery by Today, ${todayUpperSlot}`);
      } else if (tomorrowDelivery) {
        const tomorrowUpperSlot = tomorrowDelivery.time_slot.split(" - ")[1];
        messages.push(`Delivery by Tomorrow, ${tomorrowUpperSlot}`);
      }

      let discount = null;
      if (main_category_id == 3) {
        discount = {
          category_id: store.category_id,
          category_name: categoryNames[store.category_id],
          discount_type: store.discount_type,
          discount_amount: store.discount_amt,
        };
      }

      return {
        store_id: store.id,
        store_name: store.name,
        image_url: store.logo,
        store_categories: store.store_categories,
        messages,
        ...(main_category_id === "3" && { discount }),
      };
    });

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 200,
        msg: "Stores retrieved successfully.✅",
        data: {
          storeData: singleResData,
          ...(main_category_id === "8" && { giftStoreCount }),
          ...(main_category_id === "8" && { giftBannerImages }),
        },
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

exports.getProductsForGiftsStore = async (req, res, next) => {
  try {
    let { storeId } = req.query;

    if (!storeId) {
      const [giftStores] = await findGiftStores();
      if (giftStores.length === 0) {
        return sendHttpResponse(
          req,
          res,
          next,
          generateResponse({
            status: "error",
            statusCode: 404,
            msg: "No gift stores available.❌",
          })
        );
      }
      storeId = giftStores[0].id;
    }

    const [products] = await getGiftProducts(storeId);

    const productsByCategory = {
      Flowers: [],
      Wine: [],
      Chocolates: [],
      Champagne: [],
      Dessert: [],
    };

    products.forEach((product) => {
      let formattedProduct;
      if (product.product_id) {
        formattedProduct = {
          id: product.product_id,
          title: product.product_title,
          image: product.product_image,
          label:
            product.quantity === 1
              ? `${product.quantity_variant} ${product.unit}`
              : `${product.quantity} × ${product.quantity_variant} ${product.unit}`,
          actual_price: product.actual_price,
          selling_price: product.selling_price,
          ...(product.discount_id !== null && {
            discount_label: generateDiscountLabel(product),
          }),
        };

        if (
          product.category_name.includes("Flowers") ||
          product.subcategory_name.includes("Flowers")
        ) {
          productsByCategory.Flowers.push(formattedProduct);
        }
        if (
          product.category_name.includes("Wine") ||
          product.subcategory_name.includes("Wine")
        ) {
          productsByCategory.Wine.push(formattedProduct);
        }
        if (
          product.category_name.includes("Champagne") ||
          product.subcategory_name.includes("Champagne")
        ) {
          productsByCategory.Champagne.push(formattedProduct);
        } else if (
          product.category_name.includes("Chocolates") ||
          product.subcategory_name.includes("Chocolates")
        ) {
          productsByCategory.Chocolates.push(formattedProduct);
        } else if (
          product.category_name.includes("Cake") ||
          product.subcategory_name.includes("Cake")
        ) {
          productsByCategory.Dessert.push(formattedProduct);
        }
      }
    });

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 200,
        data: { store_id: storeId, productsByCategory },
        msg: "Products retrieved successfully.",
      })
    );
  } catch (error) {
    console.log("Error while fetching products for gifts stores: ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error while fetching products for gifts stores👨🏻‍🔧",
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
        msg: "Store front details fetched successfully🔥",
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

      if (curr.product_id !== null) {
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
          label:
            curr.quantity === 1
              ? `${curr.quantity_variant} ${curr.unit}`
              : `${curr.quantity} × ${curr.quantity_variant} ${curr.unit}`,
          actual_price: curr.actual_price,
          selling_price: curr.selling_price,
          ...(curr.discount_id !== null && { discount_label: discountLabel }),
        });
      }
      return acc;
    }, {});

    // const responseArray = Object.values(modifiedResponse);

    const responseArray = Object.values(modifiedResponse).map((subcategory) => {
      const { page , limit } =
        req.query[subcategory.subcategory_id] || {};

      const pageInt = parseInt(page)||1;
      const limitInt = parseInt(limit)||5;
      const offset = (pageInt - 1) * limitInt;

      const paginatedProducts = subcategory.products.slice(
        offset,
        offset + limitInt
      );
      return {
        ...subcategory,
        products: paginatedProducts,
        total_count: subcategory.products.length,
        current_page: pageInt,
        total_pages: Math.ceil(subcategory.products.length / limitInt),
      };
    });

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 200,
        data: responseArray,
        msg: "Subcategory and products details fetched successfully✅",
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
        description: store.policy_description,
      },
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
        msg: "Store-Inside details fetched successfully⚡️",
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

exports.getProductsFromSubCategory = async (req, res, next) => {
  try {
    const { subcategoryId } = req.params;
    const { page,limit } = req.query;

    const pageInt = parseInt(page, 10) || 1;
    const limitInt = parseInt(limit, 10) || 5;
    const offset = (pageInt - 1) * limitInt;

    const [subCategoryProducts] = await findProductsOfSubcategory(
      subcategoryId,
      limitInt,
      offset
    );

    const [SubcategoryProductsCountresult] = await countProductsOfSubcategory(
      subcategoryId
    );
    const totalCount = SubcategoryProductsCountresult[0].total_count;
    const totalPages = Math.ceil(totalCount / limitInt);

    const subcategoryProductsList = subCategoryProducts[0]
      ? {
          subcategory_id: subCategoryProducts[0].subcategory_id,
          subcategory_name: subCategoryProducts[0].subcategory_name,
          products: [],
        }
      : {
          subcategory_id: subcategoryId,
          subcategory_name: "Unknown",
          products: [],
        };

    if (
      subCategoryProducts.length > 0 &&
      subCategoryProducts[0].product_id !== null
    ) {
      subcategoryProductsList.products = subCategoryProducts.map((product) => {
        return {
          id: product.product_id,
          title: product.product_title,
          image: product.product_image,
          label:
            product.quantity === 1
              ? `${product.quantity_variant} ${product.unit}`
              : `${product.quantity} × ${product.quantity_variant} ${product.unit}`,
          actual_price: product.actual_price,
          selling_price: product.selling_price,
          ...(product.discount_id !== null && {
            discount_label: generateDiscountLabel(product),
          }),
        };
      });

      subcategoryProductsList.total_count = totalCount;
      subcategoryProductsList.current_page = pageInt;
      subcategoryProductsList.total_pages = totalPages;
    } else {
      subcategoryProductsList.products = ["no products found"];
    }

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 200,
        data: subcategoryProductsList,
      })
    );
  } catch (error) {
    console.log("Error while fetching products from subcategory: ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error while fetching products from subcategory👨🏻‍🔧",
      })
    );
  }
};

exports.getProductsByStoreId = async (req, res, next) => {
  try {
    const { storeId } = req.params;

    const [storeProducts] = await findProductsByStoreId(storeId);

    if (!storeProducts || storeProducts.length === 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 404,
          msg: "No products found for this store🙁",
        })
      );
    }

    const categoryMap = {};

    storeProducts.forEach((product) => {
      if (!categoryMap[product.category_id]) {
        categoryMap[product.category_id] = {
          category_id: product.category_id,
          category_name: product.category_name,
          subcategories: {},
        };
      }

      if (
        !categoryMap[product.category_id].subcategories[product.subcategory_id]
      ) {
        categoryMap[product.category_id].subcategories[product.subcategory_id] =
          {
            subcategory_id: product.subcategory_id,
            subcategory_name: product.subcategory_name,
            products: [],
          };
      }

      if (product.product_id !== null) {
        categoryMap[product.category_id].subcategories[
          product.subcategory_id
        ].products.push({
          id: product.product_id,
          title: product.product_title,
          image: product.product_image,
          label:
            product.quantity === 1
              ? `${product.quantity_variant} ${product.unit}`
              : `${product.quantity} × ${product.quantity_variant} ${product.unit}`,
          actual_price: product.actual_price,
          selling_price: product.selling_price,
          ...(product.discount_id !== null && {
            discount_label: generateDiscountLabel(product),
          }),
        });
      }
    });

    const categoryList = Object.values(categoryMap).map((category) => ({
      category_id: category.category_id,
      category_name: category.category_name,
      subcategories: Object.values(category.subcategories),
    }));

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 200,
        data: categoryList,
        msg: "Products fetched successfully🚀",
      })
    );
  } catch (error) {
    console.log("Error while fetching products by store: ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error while fetching products by store👨🏻‍🔧",
      })
    );
  }
};

exports.search = async (req, res, next) => {
  try {
    const {
      query,
      storePage,
      storeLimit,
      productsStorePage,
      productsStoreLimit,
    } = req.query;

    const storePageInt = parseInt(storePage, 10) || 1;
    const storeLimitInt = parseInt(storeLimit, 10) || 5;
    const productsStorePageInt = parseInt(productsStorePage, 10)||1;
    const productsStoreLimitInt = parseInt(productsStoreLimit, 10)||2;

    const stores = await findStoresByName(query);
    const products = await findProductsByTitle(query);

    if (
      (!stores || stores.length == 0) &&
      (!products || products.length == 0)
    ) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 404,
          msg: `No results for '${query}' 🙁`,
        })
      );
    }

    const storeIdsWithMatchingProducts = products.map(
      (product) => product.store_id
    );
    const storesWithMatchingProducts = await findStoresByIds(
      storeIdsWithMatchingProducts
    );

    const totalMatchingStores = stores.length;
    const storeOffset = (storePageInt - 1) * storeLimitInt;
    const paginatedMatchingStores = stores.slice(storeOffset, storeOffset + storeLimitInt);


    const totalStoresWithMatchingProducts = storesWithMatchingProducts.length;
    const productsStoreOffset = (productsStorePageInt - 1) * productsStoreLimitInt;
    const paginatedStoresWithMatchingProducts = storesWithMatchingProducts.slice(productsStoreOffset, productsStoreOffset + productsStoreLimitInt);

    const matchingProducts = paginatedStoresWithMatchingProducts.map((store) => {
      const storeProducts = products.filter(
        (product) => product.store_id === store.id
      );
      const totalProducts = storeProducts.length;
    
      return {
        store_id: store.id,
        store_name: store.name,
        store_logo: store.logo,
        products: storeProducts
          .filter((product) => product.store_id === store.id)
          .map((product) => ({
            id: product.id,
            title: product.title,
            image: product.image,
          })),
        total_products: totalProducts,
      };
    });

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 200,
        data: {
          matchingStores: paginatedMatchingStores,
          total_matching_stores: totalMatchingStores,
          current_matching_store_page: storePageInt,
          total_matching_store_pages: Math.ceil(totalMatchingStores / storeLimitInt),
          matchingProducts,
          total_stores_with_matching_products: totalStoresWithMatchingProducts,
          current_store_page: productsStorePageInt,
          total_store_pages: Math.ceil(totalStoresWithMatchingProducts / productsStoreLimitInt),
        },
        msg: "Products and Store Data fetched for given search✅",
      })
    );
  } catch (error) {
    console.log("Error while searching : ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error while searching👨🏻‍🔧",
      })
    );
  }
};

exports.searchInsideStore = async (req, res, next) => {
  try {
    const { storeId, query,page,limit } = req.query;
    const products = await findProductsByTitleAndStoreId(query, storeId);

    const pageInt=parseInt(page,10)||1;
    const limitInt=parseInt(limit,10)||8;

    if (!products || products.length == 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 404,
          msg: `No results for '${query}' 🙁`,
        })
      );
    }

    const totalProducts=products.length;
    const offset=(pageInt-1)*limitInt;

    const paginatedProducts=products.slice(offset,offset+limitInt);

    const response = paginatedProducts.map((product) => ({
      id: product.product_id,
      title: product.product_title,
      image: product.product_image,
      label:
        product.quantity === 1
          ? `${product.quantity_variant} ${product.unit}`
          : `${product.quantity} × ${product.quantity_variant} ${product.unit}`,
      actual_price: product.actual_price,
      selling_price: product.selling_price,
      ...(product.discount_id !== null && {
        discount_label: generateDiscountLabel(product),
      }),
    }));

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 200,
        data: {
          products:response,
          total_products:totalProducts,
          current_page:pageInt,
          total_pages:Math.ceil(totalProducts/limitInt)
        },
        msg: "Products Data fetched for given search✅",
      })
    );
  } catch (error) {
    console.log("Error while searching inside store : ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error while searching inside store👨🏻‍🔧",
      })
    );
  }
};

exports.getListCoverImages = async (req, res, next) => {
  try {
    const [coverImages] = await findCoverImagesOfList();

    if (!coverImages || coverImages.length == 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: "No cover image found",
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
        data: { coverImages },
        msg: "Cover images fetched successfully",
      })
    );
  } catch (error) {
    console.log("Error while fetching cover images of list : ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error while fetching cover images of list👨🏻‍🔧",
      })
    );
  }
};

exports.addList = async (req, res, next) => {
  try {
    const user_id = req.user.userId;
    const { store_id, title, description, cover_photo_id } = req.body;

    const { error } = addListSchema.validate(req.body);
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

    const [listResult] = await createList(
      user_id,
      store_id,
      title,
      description,
      cover_photo_id
    );

    if (!listResult || listResult.length == 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: "Failed to create list🚨",
        })
      );
    }

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 201,
        data: { list_id: listResult.insertId },
        msg: "List created successfully🚀",
      })
    );
  } catch (error) {
    console.log("Error while creating list: ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error while creating list👨🏻‍🔧",
      })
    );
  }
};

exports.editList = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { listId } = req.params;
    const { title, description, cover_photo_id } = req.body;

    const { error } = editListSchema.validate(req.body);
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

    const updatedFields = {};

    if (title) {
      updatedFields.title = title;
    }

    if (description) {
      updatedFields.description = description;
    }

    if (cover_photo_id) {
      updatedFields.cover_photo_id = cover_photo_id;
    }

    console.log(updatedFields);
    if (Object.keys(updatedFields).length == 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 400,
          msg: "No fields to update",
        })
      );
    }

    const [updatedList] = await updateListDetails(
      updatedFields,
      userId,
      listId
    );

    if (updatedList.affectedRows === 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 404,
          msg: "List not found or user not authorized☹️",
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
        msg: "List updated successfully✅",
      })
    );
  } catch (error) {
    console.log("Error while editing list: ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error while editing list👨🏻‍🔧",
      })
    );
  }
};
exports.addListItems = async (req, res, next) => {
  try {
    const user_id = req.user.userId;
    const { list_id, product_ids } = req.body;

    const { error } = addListItemsSchema.validate(req.body);
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

    try {
      const [listResults] = await insertListItems(
        user_id,
        list_id,
        product_ids
      );

      if (!listResults || listResults.length == 0) {
        return sendHttpResponse(
          req,
          res,
          next,
          generateResponse({
            status: "error",
            statusCode: 400,
            msg: "Failed to add items to list❌",
          })
        );
      }
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "success",
          statusCode: 201,
          msg: "Items added to your list successfully🔥",
        })
      );
    } catch (error) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 403,
          msg: error.message,
        })
      );
    }
  } catch (error) {
    console.log("Error while adding listitems: ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error while adding listitems👨🏻‍🔧",
      })
    );
  }
};

exports.editListItems = async (req, res, next) => {
  try {
    const user_id = req.user.userId;
    const { list_id, product_ids } = req.body;

    const { error } = editListItemsSchema.validate(req.body);
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

    try {
      const [updatedlistResults] = await updateListItems(
        user_id,
        list_id,
        product_ids
      );

      if (!updatedlistResults || updatedlistResults.length == 0) {
        return sendHttpResponse(
          req,
          res,
          next,
          generateResponse({
            status: "error",
            statusCode: 400,
            msg: "No products were removed",
          })
        );
      }
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "success",
          statusCode: 201,
          msg: "Products removed successfully from list🔥",
        })
      );
    } catch (error) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 403,
          msg: error.message,
        })
      );
    }
  } catch (error) {
    console.log("Error while removeing listitems: ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error while removing listitems👨🏻‍🔧",
      })
    );
  }
};

exports.getList = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { storeId ,page,limit} = req.query;

    const pageInt = parseInt(page, 10) || 1;
    const limitInt = parseInt(limit, 10) || 4;
    const offset = (pageInt - 1) * limitInt;

    const [listDetails,totalListCount] = await findListDetails(userId, storeId,limitInt,offset);

    if (!listDetails || listDetails.length == 0) {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          status: "error",
          statusCode: 404,
          msg: "No lists found",
        })
      );
    }

    const storeIds = [...new Set(listDetails.map((item) => item.store_id))];
    const { todayRows, tomorrowRows } = await getNextDeliveryTime(storeIds);
    const deliveryTimes = {};

    todayRows.forEach((row) => {
      if (!deliveryTimes[row.store_id]) {
        deliveryTimes[row.store_id] = row.time_slot;
      }
    });

    tomorrowRows.forEach((row) => {
      if (!deliveryTimes[row.store_id]) {
        deliveryTimes[row.store_id] = row.time_slot;
      }
    });

    // const result = listDetails.reduce((acc, item) => {
    //   const listIndex = acc.findIndex((list) => list.list_id === item.list_id);
    //   if (listIndex === -1) {
    //     acc.push({
    //       list_id: item.list_id,
    //       store_id: item.store_id,
    //       store_name: item.store_name,
    //       store_logo: item.store_logo,
    //       next_delivery_time: deliveryTimes[item.store_id] || null,
    //       user_id: item.user_id,
    //       user_name: item.last_name
    //         ? `${item.first_name} ${item.last_name}`
    //         : item.first_name,
    //       title: item.title,
    //       description: item.description,
    //       cover_image_url: item.list_cover_image,
    //       products: [],
    //     });
    //   }
    //   console.log(item)

    //   if (item.product_id) {
    //     console.log("eee",item)
    //     const product = {
    //       id: item.product_id,
    //       title: item.product_title,
    //       image: item.product_image,
    //       label:
    //         item.quantity === 1
    //           ? `${item.quantity_varient} ${item.unit}`
    //           : `${item.quantity} × ${item.quantity_varient} ${item.unit}`,
    //       actual_price: item.actual_price,
    //       selling_price: item.selling_price,
    //       ...(item.discount_id !== null && {
    //         discount_label: generateDiscountLabel(item),
    //       }),
    //     };

    //     acc[
    //       acc.findIndex((list) => list.list_id === item.list_id)
    //     ].products.push(product);
    //   }
    //   return acc;
    // }, []);

  
    const result = listDetails.map((list) => {
      return {
        list_id: list.list_id,
        store_id: list.store_id,
        store_name: list.store_name,
        store_logo: list.store_logo,
        next_delivery_time: deliveryTimes[list.store_id] || null,
        user_id: list.user_id,
        user_name: list.last_name ? `${list.first_name} ${list.last_name}` : list.first_name,
        title: list.title,
        description: list.description,
        cover_image_url: list.list_cover_image,
        products: list.products.map(product => ({
          id: product.product_id,
          title: product.product_title,
          image: product.product_image,
          label: product.quantity === 1 ? `${product.quantity_varient} ${product.unit}` : `${product.quantity} × ${product.quantity_varient} ${product.unit}`,
          actual_price: product.actual_price,
          selling_price: product.selling_price,
          ...(product.discount_id !== null && {
            discount_label: generateDiscountLabel(product),
          }),
        })),
      };
    });

    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "success",
        statusCode: 200,
        data: {
          lists:result,
          total_lists:totalListCount,
          current_page:pageInt,
          total_pages:Math.ceil(totalListCount/limitInt)
        },
        msg: "List details fetched successfully",
      })
    );
  } catch (error) {
    console.log("Error while fetching lists: ", error);
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 500,
        msg: "Internal server error while fetching lists👨🏻‍🔧",
      })
    );
  }
};
