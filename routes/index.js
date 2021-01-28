var express = require('express');
var router = express.Router();
// const app = require('express')()

// uses passport and authentification
var passport = require('passport');
const {ensureAuthenticated} = require('../authent.js');

// uses encryption
const bcrypt = require('bcryptjs')

// uses Guest and Order models
const Guest  = require("../models/guest");
const Order = require("../models/order");

// uses json parser
const { json } = require("body-parser");

//uses mongoose to connect to DB
var mongoose = require('mongoose');

function getGuest(req) {
  if (req.user) {
    return {
      _id:req.user._id,
      username:req.user.username,
      email:req.user.email,
      phone:req.user.phone
    };
  }
  else return undefined;
}

router.get("/", function (req, res, next) {
  res.render("home", {user: getGuest(req)});
});

router.get("/login", function (req, res, next) {
  let error_full_msg = req.flash('error_full_msg');
  if(error_full_msg.length === 0) { error_full_msg = res.locals.error }
  res.render("login", {user: getGuest(req), error_msg: error_full_msg});
});

router.get("/register", function (req, res, next) {
  res.render("register", {user: getGuest(req), error_msg: req.flash('error_full_msg')});
});

router.get("/reserve_table", ensureAuthenticated, function (req, res, next) {
  res.render("reserve_table", {user: getGuest(req)});
});

router.get("/dashboard", ensureAuthenticated, function (req, res, next) {
  const curGuest = getGuest(req)
  Guest.findOne({username:curGuest.username, email:curGuest.email}).then(obj=>{
    Order.find({user:obj._id}).then(reservations=>{
      res.render('dashboard', {user: getGuest(req), reservations: reservations})
    })
  })
});

router.post("/delete_table", ensureAuthenticated, function(req, res, next){
  const tableId = req.body.tableId
  const curGuest = getGuest(req)
  Order.deleteOne({_id:tableId, user:curGuest._id})
  .then(x=>{ res.json({successMessage:"deleted"})})
  .catch(err=>res.json({errorMessage: err}));
});

function checkDateTime(date, time) {
  let tokensDate = date.split("-");
  let tokensTime = time.split(":");
  let otherDate = new Date(tokensDate[0], tokensDate[1], tokensDate[2], tokensTime[0], tokensTime[1]);
  let nowDate = new Date();
  delta = nowDate.getTime() - otherDate.getTime();
  if (Math.floor(delta/1000/60/60/24) > 0) {
    return false;
  }
  return true;
}

// to reserve a table
router.post("/reserve_table", ensureAuthenticated, function(req, res, next){
  const space = req.body.space_type
  const date = req.body.date
  const time = req.body.time
  const persons = req.body.persons
  const table = req.body.table_radio
  const info = req.body.info
  console.log(space, date, time, persons, table, info)
  
  if (!req.body.space_type || !req.body.date || !req.body.time || !req.body.persons || !req.body.table_radio) {
    res.render('error',{message:"Please, complete the form to continue!", error:{status:0, stack:''}});
  }
  else if (!(["Sherlock Holmes","Dr. Watson"].includes(space))) {
    res.render('error',{message:"Sorry, this space doesn't exist!", error:{status:1, stack:space}});
  }
  else if (!checkDateTime(date, time)) {
    res.render('error', {message:"Pick a different date/time", error:{status:1, stack:space}});
  }
  else {
    Order.findOne({space:space, table:table, date:date, time:time}).select("_id").lean().then(result=> {
      if (result) {
        res.render('error',{message:"No vacant seats at this time", error:{status:1, stack:space}})
      }
      else {
        const curGuest = getGuest(req)
        let orderId = undefined;
        try {
          let order = new Order({space:space, date:date, time:time, info:info, user: curGuest._id, persons:persons, table:table})
          orderId = order._id
          order.save()
          // curGuest.reservations += order
        }
        catch(e) {
          console.log(e);
        }
        res.render('success_reserved_table', {user:curGuest, 
          tableInfo:{_id:orderId, space:space, date:date, time:time, info:info, persons:persons, table:table}
        })
      }
    })
  }
});

// login form
router.post("/login", (req, res, next) => {
  if(!req.body.email || !req.body.user_password) {
    req.flash("error_full_msg", "Please, fill all the fields in")
    res.redirect("/login")
    next();
    return;
  }
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
    failureFlash: true,
  })(req, res, next);
});

// register form
router.post("/register", function (req, res, next) {
  if(!req.body.agree_rules){
    req.flash("error_full_msg", "Agree with personal data usage rules");
    res.redirect("/register")
    next();
    return;
  }
  if(!req.body.username || !req.body.email || !req.body.user_password || !req.body.phone_number){
    req.flash("error_full_msg", "Please, fill all the fields in");
    res.redirect("/register")
    next();
    return;
  }

  let newGuest = undefined;
  try {
    newGuest = new Guest({
      _id: mongoose.Types.ObjectId(),
      username: req.body.username,
      email: req.body.email,
      phone: req.body.phone_number,
      password: req.body.user_password,
    });
  } catch (e) {
    console.log(e);
  }

  Guest.findOne({ email: req.body.email }).then((user) => {
    if (user) {
      req.flash("error_full_msg", "This email is already registered");
      res.redirect("/register");
    } else {
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newGuest.password, salt, (err, hash) => {
          if (err) throw err;
          newGuest.password = hash;
          newGuest
            .save()
            .then((user) => {
              req.flash("success_msg", "Registration was completed successfully, please log in");
              res.redirect("/login");
            })
            .catch((err) => console.log(err));
        });
      });

      res.status(200, "OK");
    }
  });
});

// password restore form
router.get("/restore_password", (req, res, next) => {
  res.render("restore_password", {user: getGuest(req)});
});

// generate QRCode
const QRCode = require('qrcode');
const { PassThrough } = require('stream');

router.get('/qr/:content', async (req, res, next) => {
    try {
        const content = req.params.content;
        if(content.length > 48){
          console.error("500");
        }
        else {
          const qrStream = new PassThrough();
          const result = await QRCode.toFileStream(qrStream, content,
                      {
                          type: 'png',
                          width: 600,
                          errorCorrectionLevel: 'H'
                      }
                  );
          qrStream.pipe(res);
        }
    } catch(err) {
        console.error('Failed to return content', err);
    }
});

// logout
router.get("/logout", (req, res) => {
  req.logout();
  req.flash("success_msg", "You have logged out");
  res.redirect("/login");
});

module.exports = router;
