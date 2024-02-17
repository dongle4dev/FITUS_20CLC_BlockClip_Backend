const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");
const config = require("./config/config");
const routeV1 = require("./api/v1/");
const { app, io } = require("./socket/socket.js");


/**
 * Root route, middlewares
 */

// let app = express();

app.use(express.static(__dirname));
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());
app.use("/public", express.static("public"));
io.listen(5000);

if (config.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.use(cors());

app.use("/api/v1", routeV1);

app.use((req, res, next) => {
  const error = new Error("Not found");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message,
    },
  });
});

module.exports = app;
