const express = require("express");
const app = express();
const bodyparser = require("body-parser");
const passport = require("passport");
require("dotenv").config();
const { useGoogleStrategy } = require('./src/util/passport');
const session = require("express-session");

useGoogleStrategy();
const appRoutes=require('./src/routes/index')

app.use(
  bodyparser.json({
    verify: function (req, res, buf) {
      var url = req.originalUrl;
      if (url.startsWith("/orders/stripe/webhook")) {
        req.rawBody = buf.toString();
      }
    },
  })
);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  next();
});

app.use(appRoutes);
app.use(appRoutes);
app.listen(process.env.PORT);
