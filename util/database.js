require("dotenv").config();

const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  queueLimit: 200,
  connectTimeout: 5000,
  connectionLimit: 10,
});

module.exports = pool.promise();
