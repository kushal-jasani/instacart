const express=require('express');
const app=express();
const session=require('express-session')
const bodyparser = require("body-parser");
const passport=require('passport')
require("dotenv").config();


const authRoutes=require('./routes/auth')

app.use(bodyparser.json());
app.use(session({
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: false
  }));
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    next();
});

// app.post('/protected-route', passport.authenticate('jwt', { session: false }), (req, res) => {
//     // This route is protected by JWT authentication
//     res.json({ message: 'Protected route accessed successfully!' });
//   });
app.use(authRoutes);

app.listen(process.env.PORT);