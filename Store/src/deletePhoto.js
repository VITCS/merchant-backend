const AWS = require("aws-sdk");

/**************************************************************
 * Main Handler
 **************************************************************/
exports.handler = async function (event, context, callback) {
  if (!event) throw new Error("Event not found");
  let response;
  console.log("Received event {}", JSON.stringify(event, 3));
  try {
    return await deletePhoto(event);
  } catch (e) {
    console.error("Error Occured", e);
  }
  return response;
};

/**************************************************************
 * S3 Signed URL
 **************************************************************/
const deletePhoto = async function (event) {
  let args = event.body.input;

  const s3 = new AWS.S3({
    signatureVersion: "v4",
  });

  let Key;
  let bucketName;
  let s3Params;

  if (args.table.toLowerCase() == "store") {
    Key = `${args.fileName}`;
    bucketName = process.env.STORE_BUCKET_NAME;
  } else if (args.table.toLowerCase() == "merchantuser") {
    Key = `${args.fileName}`;
    bucketName = process.env.USER_BUCKET_NAME;
  }

  s3Params = {
    Bucket: bucketName,
    Key,
  };

  let response = await s3.deleteObject(s3Params).promise();

  return (response = {
    status: 200,
    fileName: args.fileName,
  });
};
