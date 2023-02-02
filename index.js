"use strict";

var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var dns = require("dns");
require("dotenv").config();

var cors = require("cors");

var app = express();

// Basic Configuration
var port = process.env.PORT || 5000;

mongoose.connect(process.env.MONGOLAB_URI);

var urlMappingSchema = new mongoose.Schema({
  original_url: String,
  short_url: String,
});

var UrlMapping = mongoose.model("UrlMapping", urlMappingSchema);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/shorturl", async (req, res) => {
  try {
    let url = req.body.original_url;
    // verify the url
    await dnsLookup(url);

    let doc = new UrlMapping({
      original_url: req.body.original_url,
      short_url: req.body.short_url,
    });
    let result = await UrlMapping.create(doc);
    res.json({
      original_url: result.original_url,
      short_url: result.short_url,
    });
  } catch (e) {
    res.json({ error: "invalid URL" });
  }
});

app.get("/api/shorturl/:shortUrl", function (req, res) {
  var redirectPromise = redirectToOriginalUrl(req.params.shortUrl);
  redirectPromise.then(function (original_url) {
    return res.redirect(original_url);
  });
  redirectPromise.catch(function (reason) {
    return res.json({ error: "invalid URL" });
  });
});

function dnsLookup(url) {
  return new Promise((resolve, reject) => {
    var result = url.replace(/(^\w+:|^)\/\//, "");
    dns.lookup(result, function (err, addresses, family) {
      if (err) reject(err);
      resolve(addresses);
    });
  });
}

function redirectToOriginalUrl(short_url) {
  return new Promise(function (resolve, reject) {
    UrlMapping.findOne({ short_url: short_url }, function (err, doc) {
      if (err || doc === null) return reject(err);
      else return resolve(doc.original_url);
    });
  });
}

app.listen(port, function () {
  console.log("Node.js listening ... ", port);
});
