const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");
const path = require("path");

ffmpeg.setFfmpegPath(ffmpegPath);

let watermark = "public/watermark.png";

const watermarkVideo = async (inputVideoPath, outputVideoPath) => {
  const duration = await getInputVideoLength(inputVideoPath);
  const tempOutputVideoPath = "temp_output.mp4";
  let link;
  return new Promise((resolve, reject) => {
    ffmpeg(inputVideoPath)
      .input(watermark)
      .screenshots({
        timestamps: [0],
        filename: path.basename("public/avatar.png"),
        folder: path.dirname("public/avatar.png"),
      })
      // .complexFilter([
      //   {
      //     filter: "scale",
      //     options: {
      //       w: "150",
      //       h: "75",
      //     },
      //     inputs: "1:v",
      //     outputs: "v1"
      //   },
      //   {
      //     filter: "overlay",
      //     options: {
      //       x: "main_w-overlay_w-40",
      //       y: "main_h-overlay_h-30",
      //       enable: `between(t,0,${duration * 0.1})`,
      //     },
      //     inputs: ["0:v", "v1"]
      //   }
      // ])
      .output(tempOutputVideoPath)
      .on("end", async () => {
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
            w: "iw/5",
            h: "ih/5",
          },
          inputs: "1:v",
          outputs: "v1",
        },
        {
          filter: "overlay",
          options: {
            x: "main_w-overlay_w-40",
            y: "main_h-overlay_h-30",
            enable: `between(t,0,${duration * 0.05})`,
          },
          inputs: ["0:v", "v1"],
          outputs: "v2",
        },
        {
          filter: "scale",
          options: {
            w: "iw/5",
            h: "ih/5",
          },
          inputs: "1:v",
          outputs: "v3",
        },
        {
          filter: "overlay",
          options: {
            x: "20",
            y: "main_w-overlay_w/2",
            enable: `between(t,${duration * 0.48},${duration * 0.52})`,
          },
          inputs: ["v2", "v3"],
          outputs: "v4",
        },
        {
          filter: "scale",
          options: {
            w: "iw/5",
            h: "ih/5",
          },
          inputs: "1:v",
          outputs: "v5",
        },
        {
          filter: "overlay",
          options: {
            x: "main_w-overlay_w-40",
            y: "main_h-overlay_h-30",
            enable: `between(t,${duration * 0.95},${duration})`,
          },
          inputs: ["v4", "v5"],
        }
      ])
      .output(outputVideoPath)
      .on("end", async () => {
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
