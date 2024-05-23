const express=require('express');
const app=express();
const bodyparser = require("body-parser");
require("dotenv").config();

const appRoutes=require('./src/routes/index')

app.use(bodyparser.json());
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    next();
});

app.use(appRoutes);
app.listen(process.env.PORT);