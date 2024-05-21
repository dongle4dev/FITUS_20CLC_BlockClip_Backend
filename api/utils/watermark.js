const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

let watermark = "public/watermark.png";

const watermarkVideo = async (inputVideoPath, outputVideoPath) => {
  const duration = await getInputVideoLength(inputVideoPath);
  const tempOutputVideoPath = "temp_output.mp4";
  const halfDuration = duration / 2;
  let link;
  return new Promise((resolve, reject) => {
    ffmpeg(inputVideoPath)
      .input(watermark)
      .complexFilter([
        {
          filter: "scale",
          options: {
            w: "150",
            h: "75",
          },
          inputs: "1:v",
          outputs: "v1"
        },
        {
          filter: "overlay",
          options: {
            x: "main_w-overlay_w-40",
            y: "main_h-overlay_h-30",
            enable: `between(t,0,${halfDuration})`,
          },
          inputs: ["0:v", "v1"]
        }
      ])
      .output(tempOutputVideoPath)
      .on("end", async () => {
        console.log("Watermarking completed for position 1");
        link = await watermarkPosition2(
          outputVideoPath,
          tempOutputVideoPath,
          duration
        );
        resolve(link);
      })
      .on("error", (err) => {
        console.error("Error watermarking position 2:", err);
        reject(err);
      })
      .run();
  });
};

const watermarkPosition2 = async (
  outputVideoPath,
  tempOutputVideoPath,
  duration
) => {
  let link;
  return new Promise(async (resolve, reject) => {
    ffmpeg(tempOutputVideoPath)
      .input(watermark)
      .complexFilter([
        {
          filter: "scale",
          options: {
            w: "150",
            h: "75",
          },
          inputs: "1:v",
          outputs: "v1"
        },
        {
          filter: "overlay",
          options: {
            x: "20",
            y: "40",
            enable: `between(t,${duration / 2},${duration})`,
          },
          inputs: ["0:v", "v1"]  
        },
      ])
      .output(outputVideoPath)
      .on("end", async () => {
        console.log("Watermarking completed for position 2");
        deleteTempVideo(tempOutputVideoPath);
        resolve(outputVideoPath);
      })
      .screenshots({
        timestamps: [0], 
        filename: path.basename('public/avatar.png'),
        folder: path.dirname('public/avatar.png'),
      })
      .on("error", (err) => {
        console.error("Error watermarking position 2:", err);
        reject(err);
      })
      .run();
  });
};
const deleteTempVideo = (videoPath) => {
  fs.unlink(videoPath, (err) => {
    if (err) {
      console.error("Error deleting temporary video:", err);
    } else {
      console.log("Temporary video deleted");
    }
  });
};

const getInputVideoLength = (inputVideoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(
      inputVideoPath,
      ["-show_entries", "format=duration"],
      (err, metadata) => {
        if (err) {
          console.error("Error getting video length:", err);
          reject(err);
        } else {
          const duration = parseFloat(metadata.format.duration);
          resolve(duration);
        }
      }
    );
  });
};

module.exports = {
  watermarkVideo,
  deleteTempVideo,
};
