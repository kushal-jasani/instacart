const { sendHttpResponse, generateResponse } = require("../helper/response");

exports.checkLoggedIn = async (req, res, next) => {
  if (!req.headers["authorization"]) {
    return sendHttpResponse(
      req,
      res,
      next,
      generateResponse({
        status: "error",
        statusCode: 401,
        msg: "User is not loggedin,please login first",
      })
    );
  }
  next();
};
