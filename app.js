require("dotenv").config();
const express = require("express");
const _ = require("lodash");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());
mongoose.set("strictQuery", false);

// mongoose.connect(`mongodb+srv://admin:${process.env.PASS}@cluster0.jdo20sp.mongodb.net/blog-db-001`)
// mongoose.connect(`mongodb+srv://admin:${process.env.PASS}@cluster0.jdo20sp.mongodb.net/personalBlogDB`)
mongoose.connect(
  `mongodb+srv://sid:${process.env.PASS}@cluster0.jdo20sp.mongodb.net/personalBlogDB?retryWrites=true&w=majority`
);

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  phone: Number,
  password: String,
});

userSchema.plugin(passportLocalMongoose, {
  usernameField: "username",
});

const User = new mongoose.model("User", userSchema);

const blogSchema = new mongoose.Schema({
  title: String,
  content: String,
});

// [{username:"xyz",blogs:[{title:"abc",content:"content"}]}]

const Blog = new mongoose.model("Blog", blogSchema);

const defaultBlog = new Blog({
  title: "Welcome to personal blogs ",
  content: "here you can write your personal blogs",
});
// defaultBlog.save()

const appDataSchema = new mongoose.Schema({
  username: String,
  blogs: [blogSchema],
});
const AppData = new mongoose.model("AppData", appDataSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function (req, res) {
  if (req.isAuthenticated()) {
    res.redirect("/home");
  } else res.redirect("/login");
});

app
  .route("/login")
  .get(function (req, res) {
    if (req.isAuthenticated()) {
      console.log("logged in tha");
      res.redirect("/home");
    } else {
      res.render("login");
    }
  })
  .post(function (req, res) {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });
    console.log("user", user);
    req.login(user, function (err) {
      if (err) {
        console.log("this is err");
        console.log(err);
      } else {
        console.log("inside else");
        passport.authenticate("local")(req, res, function () {
          console.log("req inside auth", req.body);
          res.redirect("/home");
        });
      }
    });
  });

app.get("/home", function (req, res) {
  if (req.isAuthenticated()) {
    AppData.findOne({ username: req.user.username }, (err, result) => {
      if (err) {
        console.log(err);
      } else {
        const { username, blogs } = result;
        res.render("home", { blogs: blogs });
      }
    });
  } else {
    console.log("is not authenticated");
    res.redirect("/login");
  }
});

app.get("/logout", function (req, res) {
  console.log("you are logged oyut");
  req.logOut(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
});

app
  .route("/register")
  .get(function (req, res) {
    res.render("register");
  })
  .post(function (req, res) {
    console.log(req.body);
    User.register(
      { username: req.body.username },
      req.body.password,
      function (err, user) {
        if (err) {
          console.log(err);
          res.redirect("/");
        } else {
          passport.authenticate("local")(req, res, function () {
            const userData = new AppData({
              username: req.user.username,
              blogs: [defaultBlog],
            });

            userData.save();
            res.redirect("/home");
          });
        }
      }
    );
  });

app
  .route("/compose")
  .get(function (req, res) {
    if (req.isAuthenticated()) {
      res.render("compose");
    } else res.redirect("/login");
  })
  .post(function (req, res) {
    if (req.isAuthenticated()) {
      // console.log(req.body);
      let post = new Blog({
        title: req.body.title,
        content: req.body.content,
      });

      console.log(post);

      AppData.findOneAndUpdate(
        { username: req.user.username },
        {
          $push: { blogs: post },
        },
        (err) => {
          if (!err) {
            res.redirect("/home");
          } else console.log(err);
        }
      );
    } else res.redirect("/login");
  });

app.route("/about").get(function (req, res) {
  res.render("about");
});

// app.route('/contact')
//     .get(function (req, res) {
//         res.render('contact')
//     });

app.get("/post/:postTitle", function (req, res) {
  let postTitle = _.lowerCase(req.params.postTitle);

  AppData.findOne({ username: req.user.username }, (err, result) => {
    if (!err) {
      const { blogs } = result;
      const post = blogs.filter((x) => _.lowerCase(x.title) == postTitle)[0];
      // console.log(post);
      res.render("post", { post: post });
    } else console.log(err);
  });
});

app.get("/delete/:objectID", (req, res) => {
  let postId = req.params.objectID;

  AppData.findOneAndUpdate(
    { username: req.user.username },
    { $pull: { blogs: { _id: postId } } },
    (err) => {
      if (!err) res.redirect("/home");
    }
  );
});

app.listen(process.env.PORT, function () {
  console.log("http://localhost:" + process.env.PORT);
});
