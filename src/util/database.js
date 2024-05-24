require("dotenv").config();

const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database:process.env.DB_NAME,
password:process.env.DB_PASSWORD});

// pool.on('error', (err) => {
//   console.error('MySQL Pool Error:', err);
// });

// pool.on('release', (connection) => {
//   console.log('Connection %d released', connection.threadId);
// });

module.exports = pool.promise();
