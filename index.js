"use strict";

var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
const bodyParser = require("body-parser");

require("dotenv").config();

var cors = require("cors");
const dns = require("dns");
const URL = require("url");

console.log("url ");

var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

/** this project needs a db !! **/
mongoose.connect(process.env.MONGO_DB_LINK);
// schema for url
const shortUrlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number,
});
// schema into model
const ShortUrl = mongoose.model("ShortUrl", shortUrlSchema);

app.use(cors());

/** this project needs to parse POST bodies **/
app.use(bodyParser.urlencoded({ extended: false }));
// you should mount the body-parser here

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

// find one by orginal url
const findOneByOrginalUrl = (url, done) => {
  console.log("check her3e the req ", url);
  ShortUrl.findOne({ original_url: url }, (err, doc) => {
    console.log("in doc bro ", doc, err);

    if (err) return done(err);
    done(null, doc);
  });
};
// find one by short url
const findOneByShortUrl = (shortUrl, done) => {
  ShortUrl.findOne({ short_url: shortUrl }, (err, doc) => {
    if (err) return done(err);
    done(null, doc);
  });
};
// create and save url
const createAndSaveUrl = (url, done) => {
  ShortUrl.count((err, docsLenght) => {
    if (err) return done(err);
    // first entity
    if (docsLenght == 0) {
      new ShortUrl({ original_url: url, short_url: 0 }).save((err, doc) => {
        if (err) return done(err);
        done(null, {
          original_url: doc.original_url,
          short_url: doc.short_url,
        });
      });
    } else {
      new ShortUrl({ original_url: url, short_url: docsLenght }).save(
        (err, doc) => {
          if (err) return done(err);
          done(null, {
            original_url: doc.original_url,
            short_url: doc.short_url,
          });
        }
      );
    }
  });
};
// test valid url
const testValidUrl = (url, done) => {
  //   if (/^https?:\/\/(w{3}.)?[\w-]+.com(\/\w+)*/.test(url)) {
  let testUrl = URL.parse(url);
  console.log("check test Url ", testUrl.hostname);
  dns.lookup(testUrl.hostname, (err, address, family) => {
    console.log("in dns lookup ", address, err);

    if (err) return done(err);
    done(null, address);
  });
  //   } else done(null, null);
};
// api new short url
app.post("/api/shorturl", (req, res) => {
  testValidUrl(req.body.url, (err, address) => {
    if (address == null) return res.json({ error: "invalid URL" });

    findOneByOrginalUrl(req.body.url, (err, data) => {
      console.log("request is coming ", data);

      if (err) return res.json(err);
      // if url exists alredy
      if (data) {
        res.json({
          original_url: data.original_url,
          short_url: data.short_url,
        });
      } else {
        createAndSaveUrl(req.body.url, (err, doc) => {
          if (err) return res.json(err);
          res.json(doc);
        });
      }
    });
  });

  // res.json({ orginal_url: req.body.url, short_url: 1 });
});
// api get short url
app.get("/api/shorturl/:shortUrl", (req, res) => {
  findOneByShortUrl(req.params.shortUrl, (err, doc) => {
    if (err) return res.json(err);
    if (doc == null) res.json({ error: "invalid short URL" });
    else res.redirect(doc.original_url);
  });
});

app.listen(port, "127.0.0.1", function () {
  console.log("Node.js listening ...", port);
});
