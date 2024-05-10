const db = require("../util/database");

const getMainCategories = async () => {
  return await db.query("SELECT * FROM main_categories");
};

const getAllStores = async () => {
  return await db.query(`SELECT s.id, s.name, s.logo,s.is_pickup_avail,
    JSON_ARRAYAGG(sc.name) AS store_categories
FROM store s
LEFT JOIN store_category sc ON s.id = sc.store_id
GROUP BY s.id, s.name , s.logo LIMIT 5;`);
};

const checkInStorePrices = async (store_id) => {
  return await db.query(
    `SELECT * FROM store_pricing
  WHERE store_id = ? AND is_instore = 1;`,
    [store_id]
  );
};

const getNextDeliveryTime = async (store_id) => {
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
  const todayQuery = `SELECT time_slot
                      FROM timing
                      WHERE store_id = ? AND day = ? AND is_delivery_time = 1 AND time_slot > ?
                      ORDER BY time_slot
                      LIMIT 1`;

  const tomorrowQuery = `SELECT time_slot
                           FROM timing
                           WHERE store_id = ? AND day = ? AND is_delivery_time = 1
                           ORDER BY time_slot
                           LIMIT 1`;

  let [todayRows] = await db.query(todayQuery, [
    store_id,
    currentDay,
    currentTime,
  ]);

  if (todayRows.length > 0) {
    const todayUpperSlot = todayRows[0].time_slot.split(" - ")[1];
    return `Today, ${todayUpperSlot}`;
  }

  const nextDay = (currentDay + 1) % 7;
  let [tomorrowRows] = await db.query(tomorrowQuery, [store_id, nextDay]);
  if (tomorrowRows.length > 0) {
    const tomorrowUpperSlot = tomorrowRows[0].time_slot.split(" - ")[1];
    return `Tomorrow, ${tomorrowUpperSlot}`;
  }
  return null;
};

const getStoresOpenAfterEleven = async () => {
  const currentDate = new Date();
  const currentDay = currentDate.getDay();

  const query = `SELECT s.id, s.name, s.logo, s.is_pickup_avail, JSON_ARRAYAGG(sc.name) AS store_categories
 FROM store s
 LEFT JOIN store_category sc ON s.id = sc.store_id
 INNER JOIN (
     SELECT store_id, 
            SUBSTRING_INDEX(time_slot, ' - ', 1) AS start_time
     FROM store_opening
     WHERE day = ? 
 ) so ON s.id = so.store_id
 WHERE TIME_FORMAT(start_time, '%l:%i %p') <= '11:00 AM'
 GROUP BY s.id, s.name , s.logo;`;
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
  const query = `SELECT s.id, s.name, s.logo,s.is_pickup_avail,JSON_ARRAYAGG(sc.name) AS store_categories 
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

const findStoreInsideDetails=async(store_id)=>{
  const query=`SELECT 
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
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('day', to1.day, 'time_slot', to1.time_slot,'price',df.charge))FROM timing to1 WHERE s.id = to1.store_id AND to1.is_delivery_time=1)AS delivery_timings,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('day', to1.day, 'time_slot', to1.time_slot,'price',df.charge))FROM timing to1 WHERE s.id = to1.store_id AND to1.is_pickup_time=1)AS pickup_timings
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
  sf.per_item_charge;
`
  return await db.query(query, [store_id]);
}

const findSubCategoryOfStore=async(category_id)=>{
  return await db.query(`SELECT id,name FROM store_products_subcategories sps WHERE category_id=?`,[category_id])
}


const formatDeliveryFee=(df)=> {
  if (df.has_priority_avail) {
      var priorityFeeMsg = `Priority delivery: An additional $${df.additional_charge} will be charged.`;
  } else {
      var priorityFeeMsg = "";
  }
  return `This fee is based on the delivery option you choose.\n • ${df.delivery_fee_type} delivery: $${df.charge} on orders $${df.min_order_value}+ and $${df.lesser_value_charge} on orders less than $35.\n • ${priorityFeeMsg}`;
}

const formatServiceFee=(sf)=> {
  if (sf.max_percentage) {
      var serviceFeeMsg = `The service fee helps support the Instacart platform and covers a range of operating costs. The service fee will vary up to ${sf.max_percentage}% of your order total subject to a minimum fee of $${sf.min_value} per order or $${sf.per_item_charge} per item, whichever is more.`;
  } else {
      var serviceFeeMsg = "";
  }
  return serviceFeeMsg;
}

const formatBagFee=(bf)=> {
  return `The retailer may charge a fee of up to $${bf.bag_fee} per bag. This fee will be added after checkout depending on the number of bags used.`;
}

const getDayName=(day)=>{
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day];
}

const convertTo24Hour=(time)=> {
  var hours = parseInt(time.split(':')[0]);
  var minutes = parseInt(time.split(':')[1].split(' ')[0]);
  var period = time.split(':')[1].split(' ')[1];

  if (period === 'am' && hours === 12) {
      hours = 0;
  } else if (period === 'pm' && hours < 12) {
      hours += 12;
  }

  return hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0');
}

const getNextDeliverySlot=(deliveryTimings) =>{
  if(!deliveryTimings || deliveryTimings.length==0){
    return 'not available'
  }
  var today = new Date().getDay();
  var currentTime = new Date();
  var currentHours = currentTime.getHours();

  var currentMinutes = currentTime.getMinutes();
  var currentTimeInMinutes = currentHours * 60 + currentMinutes;

  for (var i = 0; i < deliveryTimings.length; i++) {
      var deliveryTime = deliveryTimings[i];
      var timeSlotParts = deliveryTime.time_slot.split(' - ');
      var startTime = convertTo24Hour(timeSlotParts[0]);
      var endTime = convertTo24Hour(timeSlotParts[1]);
      var startTimeParts = startTime.split(':');
      var endTimeParts = endTime.split(':');
        
    
      var startHours = parseInt(startTimeParts[0]);
      var startMinutes = parseInt(startTimeParts[1]);
      var endHours = parseInt(endTimeParts[0]);
      var endMinutes = parseInt(endTimeParts[1]);

      var startTimeInMinutes = startHours * 60 + startMinutes;
      var endTimeInMinutes = endHours * 60 + endMinutes;
      if (parseInt(deliveryTime.day) === today) {
        // Check if the current time falls within this time slot
        if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes) {
            // Find the next time slot after the current time
            if (i < deliveryTimings.length - 1) {
                var nextDeliveryTime = deliveryTimings[i + 1];
                return { day: "Today", timeSlot: nextDeliveryTime.time_slot };
            } else {
                // If there are no more time slots for today, return the first time slot of tomorrow
                var nextDay = today === 6 ? 0 : today + 1;
                for (var j = 0; j < deliveryTimings.length; j++) {
                    if (parseInt(deliveryTimings[j].day) === nextDay) {
                        return { day: "Tomorrow", timeSlot: deliveryTimings[j].time_slot };
                    }
                }
            }
        }
    } else if (parseInt(deliveryTime.day) > today) {
        return { day: getDayName(parseInt(deliveryTime.day)), timeSlot: deliveryTime.time_slot };
    }
  }
  return null;
}

function formatHours(openingInfo) {
  if(!openingInfo || openingInfo.length==0){
    return 'not available'
  }
  var daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var hours = {};
  openingInfo.forEach(info => {
      var day = daysOfWeek[parseInt(info.day)];
      var timeSlot = info.time_slot;
      hours[day] = timeSlot;
  });
  return hours;
}

const deliveryTimings=(deliveryTimings)=>{
  if(!deliveryTimings || deliveryTimings.length==0){
    return 'not available'
  }
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date().getDay();
  const modifiedTimings = [];

 
  for (let i = 0; i < 7; i++) {
      const dayIndex = (today + i) % 7; 
      const dayName = (i === 0) ? 'Today' : daysOfWeek[dayIndex]; 

      const daySlots = deliveryTimings.filter(slot => parseInt(slot.day) === dayIndex);

      const modifiedDaySlots = daySlots.map(slot => {
          return {
              price: slot.price,
              time_slot: slot.time_slot
          };
      });

      const formattedDayName = (i === 0) ? dayName : `${dayName}, ${new Date(new Date().setDate(new Date().getDate() + i)).toLocaleString('en-US', { month: 'short', day: 'numeric' })}`;

      const modifiedDay = {
          day: formattedDayName,
          slots: modifiedDaySlots
      };

      modifiedTimings.push(modifiedDay);
  }

  return modifiedTimings;

}

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
  formatDeliveryFee,
  formatServiceFee,
  formatBagFee,
  getNextDeliverySlot,
  formatHours,
  deliveryTimings,
  findSubCategoryOfStore
};
