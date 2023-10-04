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
    let storeId ;
    let merchantAccountId;
    
    if ( objectKey.length > 1){
      merchantAccountId =  objectKey[0];
      storeId =objectKey[1];
    }
    
    let response;
    if( eventName.startsWith('ObjectCreated' )){
       response = await updateStore(merchantAccountId, storeId , key);
    }else{
       response = await deletePhoto(merchantAccountId, storeId , key);
    }
  
  //Get store by store id, update the storePhotos attribute
  } catch (e) {
    console.error("Error Occured", e);
  }
  return response;
};



updateStore = async (merchantAccountId, storeId, key) => {

 try {
     const getParams = {
        TableName: process.env.TABLE_NAME,
        Key: {
          "id": storeId
        }
    };
    const res = await dynamodb.get(getParams).promise();
    
    let storePhotos;
    if (res.Item.storePhotos == undefined || res.Item.storePhotos == '' ){
       storePhotos = key;
    }else {
      storePhotos =  res.Item.storePhotos + ','+ key;
    }
   
    const updateParams = {
          TableName: process.env.TABLE_NAME,
          Key: {
            "id": storeId
          },
          UpdateExpression: "set storePhotos = :storePhotos",
          ExpressionAttributeValues:{
              ":storePhotos":storePhotos
          },
          ReturnValues:"UPDATED_NEW"
        };

        let response = await dynamodb.update(updateParams).promise();
         console.log( response);
  } catch (err) {
    console.log("ERROR: ", err);
  }
  
};

deletePhoto = async (merchantAccountId, storeId, key) => {

 try {
     const getParams = {
        TableName: process.env.TABLE_NAME,
        Key: {
          "id": storeId
        }
    };
    const res = await dynamodb.get(getParams).promise();
    
    let photoKey= key + ',';
    let photoKey1= ',' +  key ;
    let storePhotos;

    if( res.Item.storePhotos.indexOf( photoKey) >= 0 ){
      storePhotos =  res.Item.storePhotos.replace(photoKey, '');
    }else if( res.Item.storePhotos.indexOf( photoKey1) >= 0 ){
      storePhotos =  res.Item.storePhotos.replace( photoKey1, '');
    }else if( res.Item.storePhotos.indexOf( key) >= 0 ){
      storePhotos =  res.Item.storePhotos.replace( key, '');
    }

    if( storePhotos != undefined) {
     
      const updateParams = {
          TableName: process.env.TABLE_NAME,
          Key: {
            "id": storeId
          },
          UpdateExpression: "set storePhotos = :storePhotos",
          ExpressionAttributeValues:{
              ":storePhotos":storePhotos
          },
          ReturnValues:"UPDATED_NEW"
        };
        console.log('updateParams',updateParams );
        let response = await dynamodb.update(updateParams).promise();
        console.log( response);
    }
   
  } catch (err) {
    console.log("ERROR: ", err);
  }
  
};