const db = require("../util/database");

const getMainCategories = async () => {
  return await db.query("SELECT * FROM main_categories");
};

const getAllStores = async () => {
  return await db.query(`SELECT s.id, s.name, s.logo,s.is_pickup_avail,
    JSON_ARRAYAGG(sc.name) AS store_categories
FROM store s
LEFT JOIN store_category sc ON s.id = sc.store_id
GROUP BY s.id, s.name , s.logo;`);
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


const getStoreByCategory=async(main_category_id)=>{
  const query=`SELECT s.id, s.name, s.logo,s.is_pickup_avail,JSON_ARRAYAGG(sc.name) AS store_categories 
  FROM store s
  INNER JOIN store_category sc ON s.id = sc.store_id
  WHERE sc.main_category_id = ?
  GROUP BY s.id, s.name , s.logo;`

  return await db.query(query,[main_category_id])
}


module.exports = {
  getMainCategories,
  getAllStores,
  checkInStorePrices,
  getNextDeliveryTime,
  getStoresOpenAfterEleven,
  getPickupAvailableStores,
  getStoreByCategory
};
