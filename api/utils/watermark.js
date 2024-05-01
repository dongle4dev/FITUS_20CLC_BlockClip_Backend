const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");

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
          filter: "overlay",
          options: {
            x: "main_w-overlay_w-10",
            y: "main_h-overlay_h-10",
            enable: `between(t,0,${halfDuration})`,
          },
        },
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
          filter: "overlay",
          options: {
            x: "10",
            y: "10",
            enable: `between(t,${duration / 2},${duration})`,
          },
        },
      ])
      .output(outputVideoPath)
      .on("end", async () => {
        console.log("Watermarking completed for position 2");
        deleteTempVideo(tempOutputVideoPath);
        resolve(outputVideoPath);
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
