var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
var logger = require('morgan');
var flash = require('connect-flash');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

var indexRouter = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// mongoDB
var MONGODB_STRING = 'mongodb+srv://administration:ExpectumKedavra!@local-restaurant.agsju.mongodb.net';
mongoose.connect(MONGODB_STRING, {useNewUrlParser: true, useUnifiedTopology:true, dbName:"testDB"}, function(err) {
  if (err) {return console.log(err);}
});

//passport.js
var passport = require('passport');
var expressSession = require('express-session');
app.use(expressSession({secret: 'randomSecretKey'}));
app.use(passport.initialize());
app.use(passport.session());

const LocalStrategy = require('passport-local').Strategy

const Guest = require("./models/guest");

passport.use(
new LocalStrategy({ usernameField: 'email', passwordField: 'user_password'}, (email, password, done) => {
  // Ensure guest is found
  Guest.findOne({
    email: email
  }).then(guest => {
    if (!guest) {
      return done(null, false, { message: 'Wrong email: no such user identified' });
    }
    // Check if password is correct
    bcrypt.compare(password, guest.password, (err, isMatch) => {
      if (err) throw err;
      if (isMatch) {
        return done(null, guest);
      } else {
        return done(null, false, { message: 'Wrong password, please try again' });
      }
    });
  });
})
)

passport.serializeUser(function(guest, done) {
  done(null, guest._id);
});

passport.deserializeUser(function(id, done) {
  Guest.findById(id, function(err, guest) {
    done(err, guest);
  });
});

app.use(flash())
app.use((req,res,next)=> {
  res.locals.sucess_msg = req.flash('sucess_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next()
});


app.use('/', indexRouter);
// app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
