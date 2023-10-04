const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

  const s3 = new AWS.S3({
    signatureVersion: 'v4'
  });
  
/**************************************************************
 * Main Handler
 **************************************************************/
exports.handler = async function (event, context, callback) {
  if (!event) throw new Error("Event not found");
  let response;
  console.log("Received event {}", JSON.stringify(event, 3));
  
  // Get the object from the event and show its content type
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    
    const eventName = event.Records[0].eventName;
     
    if( bucket != process.env.BUCKET_NAME){
      console.error( 'Wrong bucket', bucket);
      return;
    }
    
  try {
    //Write to dynamodb
  
    //Split key to get store id
    let objectKey = key.split("\/");
    let userName ;
    let merchantAccountId;
    
    if ( objectKey.length > 2 ){
      merchantAccountId =  objectKey[0];
      userName =objectKey[1];
    }
    
    let response;
    if( eventName.startsWith('ObjectCreated' )){
       response = await updateUserPhoto(merchantAccountId, userName , key);
    }else{
       response = await deletePhoto(merchantAccountId, userName , key);
    }
  
  //Get store by store id, update the storePhotos attribute
  } catch (e) {
    console.error("Error Occured", e);
  }
  return response;
};



updateUserPhoto = async (merchantAccountId, userName, key) => {

 try {
     const getParams = {
        TableName: process.env.TABLE_NAME,
        Key: {
          "userId": userName
        }
    };
    const res = await dynamodb.get(getParams).promise();

    let profileImage = key;

   
    const updateParams = {
          TableName: process.env.TABLE_NAME,
          Key: {
            "userId": userName
          },
          UpdateExpression: "set profileImage = :profileImage",
          ExpressionAttributeValues:{
              ":profileImage":profileImage
          },
          ReturnValues:"UPDATED_NEW"
        };

        let response = await dynamodb.update(updateParams).promise();
        console.log( 'user updated',  response);
  } catch (err) {
    console.log("ERROR: ", err);
  }
  
};

deletePhoto = async (merchantAccountId, userName, key) => {

 try {
     const getParams = {
        TableName: process.env.TABLE_NAME,
        Key: {
          "userId": userName
        }
    };
    const res = await dynamodb.get(getParams).promise();
    
    if( res) {
     profileImage = "";
      const updateParams = {
          TableName: process.env.TABLE_NAME,
          Key: {
            "userId": userName
          },
          UpdateExpression: "set profileImage = :profileImage",
          ExpressionAttributeValues:{
              ":profileImage":profileImage
          },
          ReturnValues:"UPDATED_NEW"
        };
        let response = await dynamodb.update(updateParams).promise();
        console.log( response);
    }
   
  } catch (err) {
    console.log("ERROR: ", err);
  }
  
};