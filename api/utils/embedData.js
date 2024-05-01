const fs = require("fs");
const axios = require("axios");

// Function to encode data into video frames using LSB (Least Significant Bit) technique

async function encodeLSB(videoInputPath, videoOutputPath, data) {
  try {
    const videoBuffer = fs.readFileSync(videoInputPath);
    const videoData = new Uint8Array(videoBuffer);

    data = "\t" + data + "\n"; // Add delimiters to identify the data

    const binaryData = [...data]
      .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
      .join("");

    let dataIndex = 0;

    // Iterate over the video data and modify LSBs
    for (let i = 128; i < videoData.length; i++) {
      const modifiedByte =
        (videoData[i] & 0xfe) | parseInt(binaryData[dataIndex], 2);
      videoData[i] = modifiedByte;

      dataIndex++;
      if (dataIndex >= binaryData.length) {
        break;
      }
    }

    fs.writeFileSync(videoOutputPath, videoData);
    console.log("Data embedded successfully.");
  } catch (error) {
    console.error("Error during data embedding:", error.message);
  }
}

async function decodeLSB(videoPath, outputPath) {
  try {
    // const videoUrl = videoPath;
    // const response = await axios.get(videoUrl, { responseType: "arraybuffer" });

    const video = fs.readFileSync(videoPath);
    const videoData = new Uint8Array(video);

    let binaryData = "";

    for (let i = 0; i < videoData.length; i++) {
      binaryData += (videoData[i] & 1).toString();
    }

    // Convert binary data back to characters
    let extractedData = "";
    for (let i = 0; i < binaryData.length; i += 8) {
      const charByte = binaryData.slice(i, i + 8);
      extractedData += String.fromCharCode(parseInt(charByte, 2));

      if (extractedData.endsWith("\n")) {
        break;
      }
    }

    // Extract the data between the delimiters
    const startIndex = extractedData.indexOf("\t") + 1;
    const endIndex = extractedData.indexOf("\n", startIndex);
    const embeddedData = extractedData.slice(startIndex, endIndex);

    fs.writeFileSync(outputPath, Buffer.from(embeddedData));
    console.log(`Extracted data saved to ${outputPath}`);
    return embeddedData;
  } catch (error) {
    console.error("Error during data extraction:", error.message);
  }
}

module.exports = {
  encodeLSB,
  decodeLSB,
};
