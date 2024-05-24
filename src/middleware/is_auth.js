require("dotenv").config();

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const { sendHttpResponse, generateResponse } = require("../helper/response");

exports.isAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        statusCode: 401,
        status: "error",
        msg: "Invalid access token🚨",
      })
    );
  }

  let user;
  try {
    user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          statusCode: 403,
          status: "error",
          msg: "Access token has expired⏳",
        })
      );
    } else {
      return sendHttpResponse(
        req,
        res,
        next,
        generateResponse({
          statusCode: 401,
          status: "error",
          msg: "Invalid access token🚨",
        })
      );
    }
  }
};
