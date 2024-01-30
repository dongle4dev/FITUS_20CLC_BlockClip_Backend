const multer = require("multer");
const uuid = require('uuid');


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/");
  },
  filename: function (req, file, cb) {
    // cb(null, file.fieldname +
    //         "-" +
    //         Date.now() +
    //         "." +
            // file.originalname.split(".")[1]);
    cb(null, file.fieldname + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
});

module.exports = upload;
