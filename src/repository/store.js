const db = require("../util/database");

const getMainCategories = async () => {
  return await db.query("SELECT * FROM main_categories");
};

const getAllStores = async () => {
  return await db.query(`SELECT s.id, s.name, s.logo,s.is_pickup_avail,
    JSON_ARRAYAGG(sc.name) AS store_categories
    FROM store s
    LEFT JOIN store_category sc ON s.id = sc.store_id
    GROUP BY s.id, s.name , s.logo ;`);
};

const checkInStorePrices = async (storeIds) => {
  return await db.query(
    `SELECT store_id
    FROM store_pricing
    WHERE store_id IN (?) AND is_instore = 1;`,
    [storeIds]
  );
};

const getNextDeliveryTime = async (storeIds) => {
  const currentDate = new Date();
  currentDate.setMinutes(currentDate.getMinutes() - 60);
  const currentDay = currentDate.getDay();
  // const currentTime =
  //   currentDate.getHours() +
  //   ":" +
  //   (currentDate.getMinutes() < 10 ? "0" : "") +
  //   currentDate.getMinutes();

  // const isPM = currentDate.getHours() >= 12;

  // if (!currentTime.includes(":")) {
  //   currentTime += isPM ? "PM" : "AM";
  // }
  const currentTime = currentDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const todayQuery = `SELECT store_id, time_slot
                      FROM timing
                      WHERE store_id IN (?) AND day = ? AND is_delivery_time = 1 AND time_slot > ?
                      ORDER BY store_id, time_slot;
                      `;

  const tomorrowQuery = `SELECT store_id, time_slot
                          FROM timing
                          WHERE store_id IN (?) AND day = ?
                          AND is_delivery_time = 1
                          ORDER BY store_id, time_slot;`;

  const [todayRows] = await db.query(todayQuery, [
    storeIds,
    currentDay,
    currentTime,
  ]);

  const nextDay = (currentDay + 1) % 7;
  const [tomorrowRows] = await db.query(tomorrowQuery, [storeIds, nextDay]);
  return { todayRows, tomorrowRows };
};

const getStoresOpenAfterEleven = async () => {
  const currentDate = new Date();
  const currentDay = currentDate.getDay();

  const query = `SELECT s.id, s.name, s.logo, s.is_pickup_avail,
  JSON_ARRAYAGG(sc.name) AS store_categories
  FROM store s
  LEFT JOIN store_category sc ON s.id = sc.store_id
  INNER JOIN (
      SELECT store_id, SUBSTRING_INDEX(time_slot, ' - ', 1) AS start_time
      FROM store_opening
      WHERE day = ? AND TIME_FORMAT(SUBSTRING_INDEX(time_slot, ' - ', 1), '%h:%i %p') > '10:59 AM'
  ) so ON s.id = so.store_id
  GROUP BY s.id, s.name, s.logo;`;
  return await db.query(query, [currentDay]);
};

const getPickupAvailableStores = async () => {
  return await db.query(`SELECT s.id, s.name, s.logo,s.is_pickup_avail,
    JSON_ARRAYAGG(sc.name) AS store_categories
    FROM store s
    LEFT JOIN store_category sc ON s.id = sc.store_id
    WHERE is_pickup_avail=1
    GROUP BY s.id, s.name , s.logo;`);
};

const getStoreByCategory = async (main_category_id) => {
  const query = `SELECT s.id, s.name, s.logo,s.is_pickup_avail,
  JSON_ARRAYAGG(sc.name) AS store_categories 
  FROM store s
  INNER JOIN store_category sc ON s.id = sc.store_id
  WHERE sc.main_category_id = ?
  GROUP BY s.id, s.name , s.logo;`;

  return await db.query(query, [main_category_id]);
};

const findStoreFrontDetails = async (store_id) => {
  const query = `SELECT 
  s.id AS store_id, 
  s.name AS store_name, 
  s.logo, 
  sp.type, 
  sp.has_service_fee, 
  sp.has_bag_fee, 
  df.min_order_value, 
  df.charge, 
(SELECT JSON_ARRAYAGG(JSON_OBJECT('category_id', spc.id, 'category_name', spc.name)) FROM store_products_categories spc WHERE spc.store_id=s.id )AS categories
FROM 
  store s
LEFT JOIN 
  store_pricing sp ON s.id = sp.store_id
LEFT JOIN 
  delivery_fee df ON s.id = df.store_id
WHERE 
  s.id = ?;
`;

  return await db.query(query, [store_id]);
};

const findStoreInsideDetails = async (store_id) => {
  const query = `SELECT 
  s.id AS store_id, 
  s.name AS store_name, 
  s.logo,
  s.is_delivery_avail,
  s.is_pickup_avail,
  s.description,
  s.return_policy_title,
  s.policy_description,
  JSON_ARRAYAGG(sc.name) AS store_categories,
  sp.type AS store_pricing_type,
  sp.description AS store_pricing_description,
  sp.has_service_fee,
  sp.has_bag_fee,
  sp.bag_fee,
  df.type AS delivery_fee_type,
  df.min_order_value,
  df.charge,
  df.lesser_value_charge,
  df.additional_charge,
  df.has_priority_avail,
  sf.max_percentage,
  sf.min_value,
  sf.per_item_charge,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('day', so.day, 'time_slot', so.time_slot))FROM store_opening so WHERE s.id = so.store_id)AS store_opening_info,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('day', to1.day, 'time_slot', to1.time_slot, 'type', 'standard', 'price', df.charge))
  FROM timing to1 LEFT JOIN delivery_fee df ON to1.store_id = df.store_id
  WHERE s.id = to1.store_id AND to1.is_delivery_time=1) AS delivery_timings,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('day', to1.day, 'time_slot', to1.time_slot, 'type', 'priority', 'price', df.charge + df.additional_charge))
  FROM timing to1 LEFT JOIN delivery_fee df ON to1.store_id = df.store_id
  WHERE s.id = to1.store_id AND to1.is_delivery_time=1 AND df.has_priority_avail = 1) AS priority_delivery_timings,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('day', to1.day, 'time_slot', to1.time_slot,'price',df.pickup_fee))FROM timing to1 WHERE s.id = to1.store_id AND to1.is_pickup_time=1)AS pickup_timings
FROM 
  store s
LEFT JOIN 
  store_category sc ON s.id = sc.store_id
LEFT JOIN 
  store_pricing sp ON s.id = sp.store_id
LEFT JOIN 
  delivery_fee df ON s.id = df.store_id
LEFT JOIN 
  service_fee sf ON s.id = sf.store_id
WHERE 
  s.id = ?
GROUP BY 
  s.id, 
  s.name, 
  s.logo,
  s.is_delivery_avail,
  s.is_pickup_avail,
  s.description,
  sp.type,
  sp.description,
  sp.has_service_fee,
  sp.has_bag_fee,
  sp.bag_fee,
  df.type,
  df.min_order_value,
  df.charge,
  df.lesser_value_charge,
  df.additional_charge,
  df.has_priority_avail,
  sf.max_percentage,
  sf.min_value,
  sf.per_item_charge,
  df.pickup_fee;
`;
  return await db.query(query, [store_id]);
};

const findSubCategoryOfStore = async (category_id) => {
  return await db.query(
    `SELECT 
    sps.id AS subcategory_id,
    sps.name AS subcategory_name,
    p.id AS product_id,
    p.title AS product_title,
    (SELECT pi.image from images pi WHERE p.id = pi.product_id LIMIT 1) AS product_image,
    pq.quantity AS quantity,
    pq.quantity_varient AS quantity_variant,
    pq.unit AS unit,
    pq.actual_price AS actual_price,
    pq.selling_price AS selling_price,
    p.discount_id,
    d.buy_quantity,
    d.get_quantity,
    d.discount_type,
    d.discount
FROM 
    store_products_subcategories sps
LEFT JOIN 
    products p ON sps.id = p.subcategory_id
LEFT JOIN 
    discounts d ON p.discount_id = d.id
LEFT JOIN 
    product_quantity pq ON p.id = pq.product_id
WHERE 
    sps.category_id = ?
GROUP BY 
    sps.id, sps.name, p.id, p.title, p.description, p.ingredients, p.directions, pq.quantity, pq.quantity_varient, pq.unit, pq.actual_price, pq.selling_price,d.buy_quantity, d.get_quantity, d.discount_type, d.discount`,
    [category_id]
  );
};

const findProductsOfSubcategory = async (subcategoryId) => {
  const query = `
  SELECT 
    sps.id AS subcategory_id,
    sps.name AS subcategory_name,
    p.id AS product_id,
    p.title AS product_title,
    (SELECT pi.image from images pi WHERE p.id = pi.product_id LIMIT 1) AS product_image,
    pq.quantity AS quantity,
    pq.quantity_varient AS quantity_variant,
    pq.unit AS unit,
    pq.actual_price AS actual_price,
    pq.selling_price AS selling_price,
    p.discount_id,
    d.buy_quantity,
    d.get_quantity,
    d.discount_type,
    d.discount
FROM 
    store_products_subcategories sps
LEFT JOIN 
    products p ON sps.id = p.subcategory_id
LEFT JOIN 
    discounts d ON p.discount_id = d.id
LEFT JOIN 
    product_quantity pq ON p.id = pq.product_id
WHERE 
    sps.id = ?
GROUP BY 
    sps.id,sps.name, p.id, p.title, p.description, p.ingredients, p.directions, pq.quantity, pq.quantity_varient, pq.unit, pq.actual_price, pq.selling_price, p.discount_id, d.buy_quantity, d.get_quantity, d.discount_type, d.discount
`;
  return await db.query(query, [subcategoryId]);
};

const findProductsByStoreId = async (storeId) => {
  const query = `
    SELECT 
      sc.id AS category_id,
      sc.name AS category_name,
      sps.id AS subcategory_id,
      sps.name AS subcategory_name,
      p.id AS product_id,
      p.title AS product_title,
      (SELECT pi.image from images pi WHERE p.id = pi.product_id LIMIT 1) AS product_image,
      pq.quantity AS quantity,
      pq.quantity_varient AS quantity_variant,
      pq.unit AS unit,
      pq.actual_price AS actual_price,
      pq.selling_price AS selling_price,
      p.discount_id,
      d.buy_quantity,
      d.get_quantity,
      d.discount_type,
      d.discount
    FROM 
      store_products_categories sc
    LEFT JOIN 
      store_products_subcategories sps ON sc.id = sps.category_id
    LEFT JOIN 
      products p ON sps.id = p.subcategory_id
    LEFT JOIN 
      discounts d ON p.discount_id = d.id
    LEFT JOIN 
      product_quantity pq ON p.id = pq.product_id
    WHERE 
      sc.store_id = ?
    GROUP BY 
      sc.id, sc.name, sps.id, sps.name, p.id, p.title, pq.quantity, pq.quantity_varient, pq.unit, pq.actual_price, pq.selling_price, p.discount_id, d.buy_quantity, d.get_quantity, d.discount_type, d.discount
  `;
  return await db.query(query, [storeId]);
};

const findStoresByName = async (searchQuery) => {
  const sql = `
  SELECT id AS store_id, name AS store_name, logo AS store_logo
  FROM store
  WHERE name LIKE ?
`;
  const [stores] = await db.query(sql, [`%${searchQuery}%`]);
  return stores;
};

const findProductsByTitle = async (searchQuery) => {
  const sql = `
    SELECT p.id, p.store_id, p.category_id, p.subcategory_id, p.discount_id, p.title ,(SELECT i.image FROM images i WHERE  p.id = i.product_id LIMIT 1)AS image
    FROM products p
    WHERE title LIKE ?
  `;
  const [products] = await db.query(sql, [`%${searchQuery}%`]);
  return products;
};

const findProductsByTitleAndStoreId = async (searchQuery, storeId) => {
  const sql = `
    SELECT p.id AS product_id, 
    p.store_id AS store_id,
    p.category_id AS category_id,
    p.subcategory_id AS subcategory_id,
    p.discount_id,
    p.title AS product_title,
    (SELECT pi.image from images pi WHERE p.id = pi.product_id LIMIT 1) AS product_image,
    pq.quantity AS quantity,
    pq.quantity_varient AS quantity_variant,
    pq.unit AS unit,
    pq.actual_price AS actual_price,
    pq.selling_price AS selling_price,
    d.buy_quantity,
    d.get_quantity,
    d.discount_type,
    d.discount
    FROM products p
    LEFT JOIN 
      discounts d ON p.discount_id = d.id
    LEFT JOIN 
      product_quantity pq ON p.id = pq.product_id
    WHERE p.title LIKE ? AND p.store_id = ?
  `;
  const [products] = await db.query(sql, [`%${searchQuery}%`, storeId]);
  return products;
};

const findStoresByIds = async (storeIds) => {
  const sql = `
  SELECT id,name,logo
  FROM store
  WHERE id IN (?);`;
  const [stores] = await db.query(sql, [storeIds]);
  return stores;
};

const formatDeliveryFee = (df) => {
  if (df.has_priority_avail) {
    var priorityFeeMsg = `Priority delivery: An additional $${df.additional_charge} will be charged.`;
  } else {
    var priorityFeeMsg = "";
  }
  return `This fee is based on the delivery option you choose.\n • ${df.delivery_fee_type} delivery: $${df.charge} on orders $${df.min_order_value}+ and $${df.lesser_value_charge} on orders less than $35.\n • ${priorityFeeMsg}`;
};

const formatServiceFee = (sf) => {
  if (sf.max_percentage) {
    var serviceFeeMsg = `The service fee helps support the Instacart platform and covers a range of operating costs. The service fee will vary up to ${sf.max_percentage}% of your order total subject to a minimum fee of $${sf.min_value} per order or $${sf.per_item_charge} per item, whichever is more.`;
  } else {
    var serviceFeeMsg = "";
  }
  return serviceFeeMsg;
};

const formatBagFee = (bf) => {
  return `The retailer may charge a fee of up to $${bf.bag_fee} per bag. This fee will be added after checkout depending on the number of bags used.`;
};

const getDayName = (day) => {
  var days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[day];
};

const convertTo24Hour = (time) => {
  var hours = parseInt(time.split(":")[0]);
  var minutes = parseInt(time.split(":")[1].split(" ")[0]);
  var period = time.split(":")[1].split(" ")[1];

  if (period === "am" && hours === 12) {
    hours = 0;
  } else if (period === "pm" && hours < 12) {
    hours += 12;
  }

  return (
    hours.toString().padStart(2, "0") +
    ":" +
    minutes.toString().padStart(2, "0")
  );
};

// const getNextDeliverySlot = (deliveryTimings, priorityTimings) => {
//   if (!deliveryTimings || deliveryTimings.length == 0) {
//     return "not available";
//   }
//   var today = new Date().getDay();
//   var currentTime = new Date();
//   var currentHours = currentTime.getHours();

//   var currentMinutes = currentTime.getMinutes();
//   var currentTimeInMinutes = currentHours * 60 + currentMinutes;

//   const findNextSlot = (timings, type) => {
//     for (let i = 0; i < timings.length; i++) {
//       const deliveryTime = timings[i];
//       const timeSlotParts = deliveryTime.time_slot.split(" - ");
//       const startTime = convertTo24Hour(timeSlotParts[0]);
//       const endTime = convertTo24Hour(timeSlotParts[1]);
//       const startTimeParts = startTime.split(":");
//       const endTimeParts = endTime.split(":");

//       const startHours = parseInt(startTimeParts[0]);
//       const startMinutes = parseInt(startTimeParts[1]);
//       const endHours = parseInt(endTimeParts[0]);
//       const endMinutes = parseInt(endTimeParts[1]);

//       const startTimeInMinutes = startHours * 60 + startMinutes;
//       const endTimeInMinutes = endHours * 60 + endMinutes;

//       if (parseInt(deliveryTime.day) === today) {
//         if (
//           currentTimeInMinutes >= startTimeInMinutes &&
//           currentTimeInMinutes < endTimeInMinutes
//         ) {
//           if (i < timings.length - 1) {
//             const nextDeliveryTime = timings[i + 1];
//             return {
//               day: "Today",
//               time_slot: nextDeliveryTime.time_slot,
//               type: nextDeliveryTime.type,
//               price: `${nextDeliveryTime.price}`,
//             };
//           } else {
//             const nextDay = today === 6 ? 0 : today + 1;
//             for (let j = 0; j < timings.length; j++) {
//               if (parseInt(timings[j].day) === nextDay) {
//                 return {
//                   day: "Tomorrow",
//                   time_slot: timings[j].time_slot,
//                   type: timings[j].type,
//                   price: `${timings[j].price}`,
//                 };
//               }
//             }
//           }
//         }
//       } else if (parseInt(deliveryTime.day) > today) {
//         return {
//           day: getDayName(parseInt(deliveryTime.day)),
//           time_slot: deliveryTime.time_slot,
//           type: deliveryTime.type,
//           price: `${deliveryTime.price}`,
//         };
//       }
//     }
//     return null;
//   };

//   let nextDefaultSlot = findNextSlot(deliveryTimings, "Standard");
//   let nextPrioritySlot = priorityTimings
//     ? findNextSlot(priorityTimings, "Priority")
//     : null;

//   if (nextPrioritySlot) {
//     return { standard: nextDefaultSlot, priority: nextPrioritySlot };
//   }
//   return nextDefaultSlot
//     ? { standard: nextDefaultSlot }
//     : { message: "not available" };
// };

const getNextDeliverySlot = (deliveryTimings, priorityTimings) => {
  if (!deliveryTimings || deliveryTimings.length === 0) {
    return "not available";
  }

  const currentDate = new Date();
  currentDate.setMinutes(currentDate.getMinutes() - 60);
  const today = currentDate.getDay();
  const currentTime = currentDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const currentHours = currentDate.getHours();
  const currentMinutes = currentDate.getMinutes();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  const findNextSlot = (timings) => {
    for (let i = 0; i < timings.length; i++) {
      const deliveryTime = timings[i];
      const timeSlotParts = deliveryTime.time_slot.split(" - ");
      const startTime = convertTo24Hour(timeSlotParts[0]);
      const endTime = convertTo24Hour(timeSlotParts[1]);
      const [startHours, startMinutes] = startTime.split(":").map(Number);
      const [endHours, endMinutes] = endTime.split(":").map(Number);

      const startTimeInMinutes = startHours * 60 + startMinutes;
      const endTimeInMinutes =  endHours * 60 + endMinutes;

      if (parseInt(deliveryTime.day) === today) {
        if (
          currentTimeInMinutes >= startTimeInMinutes &&
          currentTimeInMinutes < endTimeInMinutes
        ) {
          if (i < timings.length - 1) {
            const nextDeliveryTime = timings[i + 1];
            return {
              day: "Today",
              time_slot: nextDeliveryTime.time_slot,
              type: nextDeliveryTime.type,
              price: `${nextDeliveryTime.price}`,
            };
          } else {
            const nextDay = today === 6 ? 0 : today + 1;
            for (let j = 0; j < timings.length; j++) {
              if (parseInt(timings[j].day) === nextDay) {
                return {
                  day: "Tomorrow",
                  time_slot: timings[j].time_slot,
                  type: timings[j].type,
                  price: `${timings[j].price}`,
                };
              }
            }
          }
        }
      } else if (parseInt(deliveryTime.day) > today) {
        return {
          day: getDayName(parseInt(deliveryTime.day)),
          time_slot: deliveryTime.time_slot,
          type: deliveryTime.type,
          price: `${deliveryTime.price}`,
        };
      }
    }
    return null;
  };

  let nextDefaultSlot = findNextSlot(deliveryTimings);
  let nextPrioritySlot = priorityTimings ? findNextSlot(priorityTimings) : null;

  if (nextPrioritySlot) {
    return { standard: nextDefaultSlot, priority: nextPrioritySlot };
  }
  return nextDefaultSlot
    ? { standard: nextDefaultSlot }
    : { message: "not available" };
};

function formatHours(openingInfo) {
  if (!openingInfo || openingInfo.length == 0) {
    return "not available";
  }
  var daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  var hours = {};
  openingInfo.forEach((info) => {
    var day = daysOfWeek[parseInt(info.day)];
    var timeSlot = info.time_slot;
    hours[day] = timeSlot;
  });
  return hours;
}

const deliveryTimings = (deliveryTimings) => {
  if (!deliveryTimings || deliveryTimings.length == 0) {
    return "not available";
  }
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const today = new Date().getDay();
  const modifiedTimings = [];

  for (let i = 0; i < 7; i++) {
    const dayIndex = (today + i) % 7;
    const dayName = i === 0 ? "Today" : daysOfWeek[dayIndex];

    const daySlots = deliveryTimings.filter(
      (slot) => parseInt(slot.day) === dayIndex
    );

    const modifiedDaySlots = daySlots.map((slot) => {
      return {
        price: slot.price,
        time_slot: slot.time_slot,
      };
    });

    const formattedDayName =
      i === 0
        ? dayName
        : `${dayName}, ${new Date(
            new Date().setDate(new Date().getDate() + i)
          ).toLocaleString("en-US", { month: "short", day: "numeric" })}`;

    const modifiedDay = {
      day: formattedDayName,
      slots: modifiedDaySlots,
    };

    modifiedTimings.push(modifiedDay);
  }

  return modifiedTimings;
};

const generateDiscountLabel = (product) => {
  let discountLabel = null;
  if (product.discount === null) {
    discountLabel = `Buy ${product.buy_quantity}, get ${product.get_quantity}`;
  } else {
    if (product.discount_type === "fixed") {
      discountLabel = `Buy ${product.buy_quantity}, get $${product.discount} off`;
    } else if (product.discount_type === "rate") {
      discountLabel = `Buy ${product.buy_quantity}, get ${product.discount}% off`;
    }
  }
  return discountLabel;
};

const createList = async (
  user_id,
  store_id,
  title,
  description,
  cover_photo_id
) => {
  const sql = `INSERT INTO lists SET ?`;
  return await db.query(sql, {
    user_id,
    store_id,
    title,
    description,
    cover_photo_id,
  });
};

const updateListDetails = async (updatedFields, user_id, list_id) => {
  const sql = `UPDATE lists SET ? WHERE user_id = ? AND id = ?;`

  return db.query(sql, [updatedFields, user_id, list_id]);
};

const insertListItems = async (user_id, list_id, product_ids) => {
  if (product_ids.length == 0) return;

  const [owner] = await db.query(
    "SELECT user_id FROM lists WHERE id=? AND user_id=?;",
    [list_id, user_id]
  );
  if (owner.length == 0) {
    throw new Error("List does not belong to the user");
  }

  const placeholders = product_ids.map(() => "(?, ?)").join(", ");
  const values = product_ids.flatMap((product_id) => [list_id, product_id]);
  const sql = `INSERT INTO list_items (list_id,product_id) VALUES ${placeholders}`;

  return await db.query(sql, values);
};

const updateListItems = async (user_id, list_id, product_ids) => {
  if (product_ids.length == 0) return;

  const [owner] = await db.query(
    `SELECT user_id FROM lists WHERE id=? AND user_id=?;`,
    [list_id, user_id]
  );
  if (owner.length == 0) {
    throw new Error("List does not belong to the user");
  }

  return await db.query(
    "DELETE FROM list_items WHERE list_id = ? AND product_id IN (?)",
    [list_id, product_ids]
  );
};

const findListDetails = async (user_id, store_id) => {
  let sql = `
  SELECT
    l.id AS list_id,
    l.store_id,
    l.user_id,
    u.first_name,
    u.last_name,
    l.title,
    l.description,
    (SELECT pi.image FROM images pi WHERE pi.id=l.cover_photo_id AND is_cover=1 LIMIT 1)AS list_cover_image,
    li.product_id,
    p.id AS product_id,
    p.title AS product_title,
    (SELECT pi.image FROM images pi WHERE p.id=pi.product_id LIMIT 1)AS product_image,
    pq.quantity,
    pq.quantity_varient,
    pq.unit,
    pq.actual_price,
    pq.selling_price,
    p.discount_id,
    d.buy_quantity,
    d.get_quantity,
    d.discount_type,
    d.discount,
    s.name AS store_name,
    s.logo AS store_logo
  FROM lists l
  LEFT JOIN list_items li ON l.id=li.list_id
  LEFT JOIN products p ON p.id=li.product_id
  LEFT JOIN discounts d ON p.discount_id=d.id
  LEFT JOIN product_quantity pq ON p.id=pq.product_id
  LEFT JOIN store s ON l.store_id = s.id
  LEFT JOIN users u ON u.id=l.user_id
  WHERE l.user_id=?
  `;

  const params = [user_id];

  if (store_id) {
    sql += " AND l.store_id=?;";
    params.push(store_id);
  }

  return await db.query(sql, params);
};

const findCoverImagesOfList = async () => {
  return await db.query( `SELECT id,image FROM images WHERE is_cover=1;`);
};
module.exports = {
  getMainCategories,
  getAllStores,
  checkInStorePrices,
  getNextDeliveryTime,
  getStoresOpenAfterEleven,
  getPickupAvailableStores,
  getStoreByCategory,
  findStoreFrontDetails,
  findStoreInsideDetails,
  findStoresByIds,
  findProductsByTitleAndStoreId,
  formatDeliveryFee,
  formatServiceFee,
  formatBagFee,
  getNextDeliverySlot,
  findStoresByName,
  findProductsByTitle,
  formatHours,
  deliveryTimings,
  findSubCategoryOfStore,
  findProductsOfSubcategory,
  findProductsByStoreId,
  generateDiscountLabel,
  createList,
  updateListDetails,
  insertListItems,
  updateListItems,
  findListDetails,
  findCoverImagesOfList,
};
