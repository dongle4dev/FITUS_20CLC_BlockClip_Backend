require("dotenv").config(); // Load environment variables from .env file
let constants = require("../../config/constants");

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand, 
  DeleteObjectCommand
} = require("@aws-sdk/client-s3");

const {
  KMSClient,
  CreateKeyCommand,
  DescribeKeyCommand,
  CreateAliasCommand,
  UpdateAliasCommand,
  DeleteAliasCommand,
} = require("@aws-sdk/client-kms");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const fs = require("fs");

// Set your AWS credentials (make sure to configure your AWS CLI or use environment variables)
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID; // User access key
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY; // User secret access key
const bucketName = process.env.AWS_BUCKET_NAME; // Name of the S3 bucket
const region = process.env.AWS_REGION; // Region of the S3 bucket

// Initialize S3 client
const s3 = new S3Client({
  region: region,
  credentials: {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  },
});

// Initialize KMS client
const kmsClient = new KMSClient({
  region: "ap-southeast-1",
  credentials: {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  },
});

async function createSymmetricKey(aliasName) {
  try {
    // Send a request to create a symmetric KMS key
    let keyId = await getKeyKMS(aliasName);

    if (keyId) {
      return keyId;
    }

    const { KeyMetadata } = await kmsClient.send(
      new CreateKeyCommand({
        KeyUsage: "ENCRYPT_DECRYPT", // Specify key usage as 'ENCRYPT_DECRYPT' for symmetric key
        CustomerMasterKeySpec: "SYMMETRIC_DEFAULT", // Specify the key spec as 'SYMMETRIC_DEFAULT' for symmetric key
      })
    );

    // Retrieve the key ID
    keyId = KeyMetadata.KeyId;

    // Update the alias to point to the newly created key
    await kmsClient.send(
      new CreateAliasCommand({
        AliasName: `alias/${aliasName}`, // The alias name, prefixed with 'alias/'
        TargetKeyId: keyId, // The ID of the newly created key
      })
    );

    return keyId;
  } catch (error) {
    throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  }
}

// Upload the video file to S3
const uploadVideo = async (videoFilePath, aliasName) => {
  // Read the video file
  const videoFile = fs.readFileSync(videoFilePath);

  // Set the parameters for the S3 upload
  const params = {
    Bucket: bucketName,
    Key: aliasName,
    Body: videoFile,
    ContentType: "video/mp4",
  };

  try {
    const command = new PutObjectCommand(params);
    await s3.send(command);
  } catch (err) {
    throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  }
};

const uploadAvatar = async (avatarFilePath, aliasName) => {
  // Read the avatar file
  const avatarFile = fs.readFileSync(avatarFilePath);

  // Set the parameters for the S3 upload
  const params = {
    Bucket: bucketName,
    Key: aliasName,
    Body: avatarFile,
    ContentType: "image/png",
  };

  try {
    const command = new PutObjectCommand(params);
    await s3.send(command);
  }
  catch (err) {
    throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  }
};

const uploadVideoWithSSE = async (videoFilePath, aliasName, kmsKeyId) => {
  // Read the video file
  const videoFile = fs.readFileSync(videoFilePath);

  // Set the parameters for the S3 upload
  const params = {
    Bucket: bucketName,
    Key: aliasName,
    Body: videoFile,
    ContentType: "video/mp4",
    ServerSideEncryption: "aws:kms", // Specify SSE-KMS for server-side encryption
    SSEKMSKeyId: kmsKeyId, // Specify the ARN of the AWS KMS key used for encryption
  };

  try {
    const command = new PutObjectCommand(params);
    await s3.send(command);
  } catch (err) {
    throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  }
};

// Generate a pre-signed URL for the uploaded video
const generatePresignedUrl = async (aliasName) => {
  // Set the parameters for the S3 getObject command
  const params = {
    Bucket: bucketName,
    Key: aliasName,
  };

  try {
    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3, command, { expiresIn: 600 });
    return url;     
  } catch (err) {
    console.error("Error generating pre-signed URL:", err);
  }
};

// a function to check if the file is exist
const isFileExist = async (keyName) => {
  try {
    // Create a HeadObjectCommand to check if the object exists
    const command = new HeadObjectCommand({ Bucket: bucketName, Key: keyName });
    await s3.send(command);
    return true; // Key exists
  } catch (error) {
    return false; // Key does not exist
  }
};

async function downloadEncryptedFileFromS3(aliasName, filename) {
  try {
    // Get the encrypted object from S3
    const { Body } = await s3.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: aliasName,
      })
    );

    // Create a writable stream and pipe the encrypted content to it
    const writableStream = fs.createWriteStream(filename);
    Body.pipe(writableStream);

    await new Promise((resolve, reject) => {
      writableStream.on("finish", resolve);
      writableStream.on("error", reject);
    });
  } catch (error) {
    throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  }
}

async function getKeyKMS(keyAlias) {
  try {
    // Define parameters for the DescribeKey command
    const describeKeyParams = {
      KeyId: `alias/${keyAlias}`, // The alias of the key whose key ID you want to retrieve
    };

    // Call the DescribeKey command to retrieve information about the key
    const describeKeyCommand = new DescribeKeyCommand(describeKeyParams);
    const data = await kmsClient.send(describeKeyCommand);
    // Retrieve the key ID from the response
    const keyId = data.KeyMetadata.KeyId;
    if (keyId) {
      return keyId;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

async function updateKeyName(currentKeyAlias, newKeyAlias, keyID) {
  try {
    // Define parameters for the UpdateAlias command
    const updateAliasParams = {
      AliasName: `alias/${newKeyAlias}`, // The alias name to update
      TargetKeyId: keyID,
    };

    deleteKeyAlias(currentKeyAlias)

    console.log("updateAliasParams", updateAliasParams);

    await kmsClient.send(new CreateAliasCommand(updateAliasParams));
  } catch (error) {
    throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  }
}

async function updateFileAlias(currentFileAlias, newFileAlias) {
  try {

    
    // Define parameters for the CopyObject command
    const copyObjectParams = {
      Bucket: bucketName,
      CopySource: `${bucketName}/${currentFileAlias}`, // The source file to copy
      Key: newFileAlias, // The new file alias
    };

    // Copy the object with the new alias
    await s3.send(new CopyObjectCommand(copyObjectParams));

    // Delete the object with the old alias
    const deleteObjectParams = {
      Bucket: bucketName,
      Key: currentFileAlias,
    };
    await s3.send(new DeleteObjectCommand(deleteObjectParams));

    console.log("File alias updated successfully");
  } catch (error) {
    console.log("Error updating file alias:", error);
    throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  }
}

async function deleteKeyAlias(aliasName) {
  try {
    const params = {
      AliasName: `alias/${aliasName}`, // The alias name to delete
    };

    await kmsClient.send(new DeleteAliasCommand(params));
  } catch (error) {
    throw new Error(constants.MESSAGES.INTERNAL_SERVER_ERROR);
  }
}

module.exports = {
  uploadVideo,
  uploadVideoWithSSE,
  uploadAvatar,
  generatePresignedUrl,
  isFileExist,
  downloadEncryptedFileFromS3,
  createSymmetricKey,
  getKeyKMS,
  updateKeyName,
  deleteKeyAlias,
  updateFileAlias,
};
