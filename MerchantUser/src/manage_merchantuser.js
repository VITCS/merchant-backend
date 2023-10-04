const AWS = require("aws-sdk");
const eventbridge = new AWS.EventBridge({ apiVersion: "2015-10-07" });
var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider({
  apiVersion: "2016-04-18",
});
const awsRegion = process.env.AWS_REGION;
const cognito = new AWS.CognitoIdentityServiceProvider({
  apiVersion: "2016-04-18",
  region: awsRegion,
});
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { customAlphabet } = require("nanoid");
const alphabet = "0123456789";
const idSize = 16;
const nanoid = customAlphabet(alphabet, idSize);
const libphonenumber = require("libphonenumber-js");
const merchantUserPoolId = process.env.MERCHANT_USER_POOL_ID;
const merchantUserTable = process.env.TABLE_NAME;
const storeTable = process.env.STORE_TABLE;
const merchantUserStoreTable = process.env.MERCHANT_USER_STORE_TABLE;
const merchantClientId = process.env.CLIENT_ID;
const userPoolName = 'merchant';

var updateGeoPoint = function (address) {
  if (address["latitude"] && address["longitude"]) {
    address["geoPoint"] = {
      lon: address["longitude"],
      lat: address["latitude"],
    };
  }
};

/**************************************************************
 * Main Handler
 **************************************************************/
exports.handler = async function (event, context, callback) {
  if (!event) throw new Error("Event not found");
  let response;
  if (
    event.body.field === "updateEmailVerification" ||
    event.body.field === "updatePhoneVerification" ||
    event.body.field === "updateUserWest" ||
    event.body.field === "createUserWest" ||
    event.body.field === "updateForgetPassword" ||
    event.body.field === "confirmSignup"
  ) {
    console.log("Received event");
  } else {
    console.log("Received event {}", JSON.stringify(event, 3));
  }
  try {
    switch (event.field) {
      case "createMerchantUser":
        response = await createMerchantUser(
          event.body,
          event.identity,
          callback
        );
        break;
      case "updateMerchantUser":
        response = await updateMerchantUser(event.body);
        break;
      case "deleteMerchantUser":
        response = await deleteMerchantUser(event.body);
        break;
      case "deleteMerchantUserBulk":
        response = await deleteMerchantUserBulk(event.body);
        break;
      case "createUserWest":
        response = await createUserWest(event.body);
        break;
      case "updateEmailVerification":
        response = await updateEmailVerification(event.body);
        break;
      case "updatePhoneVerification":
        response = await updatePhoneVerification(event.body);
        break;
      case "updateUserWest":
        response = await updateUserWest(event.body);
        break;
      case "updateForgetPassword":
        response = await updateForgetPassword(event.body);
        break;
      case "confirmSignup":
        response = await confirmSignup(event.body);
        break;
    }
  } catch (e) {
    console.error("Error Occured", e);
  }
  return response;
};

async function getDynamoUser(userId) {
  // body...
  var params = {
    TableName: merchantUserTable,
    Key: {
      userId: userId,
    },
  };

  const dynamoUser = await dynamodb.get(params).promise();

  if (JSON.stringify(dynamoUser) === "{}") return false;
  else return true;
}

async function getStoreWithId(val) {
  // body...
  var paramsStore = {
    TableName: storeTable,
    Key: {
      id: val,
    },
  };
  console.log("paramsStore :: ", paramsStore);
  const getstores = await dynamodb.get(paramsStore).promise();
  //getstores.Item.userCount =+
  console.log("getstores --> :: ", getstores);
  //TestUpdateExpression += getstores.Item.userCount;
  //ExpressionAttributeValues[getstores.Item.userCount] = ++userCount;
  //const UpdateExpression = TestUpdateExpression;
  const paramsUpdateStore = {
    TableName: storeTable,
    Key: {
      id: getstores.Item.id,
    },
    UpdateExpression: "set userCount = :userCount",
    ExpressionAttributeValues: { ":userCount": ++getstores.Item.userCount },
    ReturnValues: "UPDATED_NEW",
  };
  console.log("paramsUpdateStore :: -- > ", paramsUpdateStore);
  const res = await dynamodb.update(paramsUpdateStore).promise();
  console.log(res);
  if (JSON.stringify(getstores) === "{}") return false;
  else return true;
}

async function getStoreWithDelete(val) {
  // body...
  var paramsStore = {
    TableName: storeTable,
    Key: {
      id: val,
    },
  };
  console.log(" getStoreWithDelete paramsStore :: ", paramsStore);
  const getstoresDelete = await dynamodb.get(paramsStore).promise();
  console.log("getstoresDelete --> :: ", getstoresDelete);
  const paramsUpdateStore = {
    TableName: storeTable,
    Key: {
      id: getstoresDelete.Item.id,
    },
    UpdateExpression: "set userCount = :userCount",
    ExpressionAttributeValues: {
      ":userCount": --getstoresDelete.Item.userCount,
    },
    ReturnValues: "UPDATED_NEW",
  };
  console.log(
    " getStoreWithDelete paramsUpdateStore :: -- > ",
    paramsUpdateStore
  );
  const res = await dynamodb.update(paramsUpdateStore).promise();
  console.log(res);
  if (JSON.stringify(getstoresDelete) === "{}") return false;
  else return true;
}

let response;
// const createCognitoUser = async (params) => {
//   // body...
//   try {
//     const data = await cognitoidentityserviceprovider
//       .adminCreateUser(params)
//       .promise();
//     response = { statusCode: 200, body: { message: "SUCCESS" } };
//   } catch (error) {
//     console.log("ERROR: ", params, error);
//     throw new Error(error);
//     response = { statusCode: 500, body: { message: "FAILED", error: error } };
//   }
// };

let res;
const getCognitoUser = async (userId) => {
  var params = {
    UserPoolId: merchantUserPoolId /* required */,
    Username: userId /* required */,
  };
  try {
    await cognitoidentityserviceprovider.adminGetUser(params).promise();
    res = { statusCode: 200, body: { message: "SUCCESS" } };
    return true;
  } catch (error) {
    res = { statusCode: 500, body: { message: "FAILED", error: error } };
    return false;
  }
};

const deleteCognitoUser = async (params) => {
  // body...
  try {
    const data = await cognitoidentityserviceprovider
      .adminDeleteUser(params)
      .promise();
    response = { statusCode: 200, body: { message: "SUCCESS" } };
  } catch (error) {
    console.log(error);
    throw new Error(err);
    response = { statusCode: 500, body: { message: "FAILED", error: error } };
  }
};

/**************************************************************
 * Create Merchant User
 **************************************************************/
createMerchantUser = async (body, identity, callback) => {
  const id = nanoid();
  body.input["id"] = id;
  const { phoneNumber } = body.input;
  const { password } = body.input;
  delete body.input.password;

  const sepNumber = new libphonenumber.AsYouType().input(phoneNumber);
  const newNumArr = sepNumber.split(" ");
  const countryCode = newNumArr.shift();
  const finalNumber = `${countryCode} ${newNumArr.join("")}`;
  console.log(finalNumber);

  if (!body.input.merchantAccountId)
    body.input.merchantAccountId = identity.claims.m_account;

  console.log(body.input);
  console.log(identity);

  let storeIds, storeCount;

  if (body.input.storeIds) {
    ({ storeIds } = body.input);
    storeCount = storeIds.length;
  } else {
    storeCount = 0;
  }

  const { userId } = body.input;

  const cognitoUserRes = await getCognitoUser(userId);

  // if (cognitoUserRes) throw new Error("This username is already taken");
  // if (cognitoUserRes) return callback(null, {errorMessage: "This username is already taken", errorType: "MUTATION_ERROR"})
  if (cognitoUserRes)
    return {
      error: {
        message: "This username is already taken",
        type: "MUTATION_ERROR",
      },
    };

  body.input["storeCount"] = storeCount;
  console.log("store count body :: ", body.input.storeCount);
  const newBodyInput = { ...body.input, phoneNumber: finalNumber };
  delete newBodyInput.storeIds;
  if (newBodyInput.address) {
    updateGeoPoint(newBodyInput["address"]);
  }

  const idsCreated = [];
  let storeidcount = [];
  let items = [];
  if (storeIds) {
    items = storeIds.map((val) => {
      const idMerchantUserStore = nanoid();
      idsCreated.push(idMerchantUserStore);

      return {
        PutRequest: {
          Item: {
            id: idMerchantUserStore,
            storeId: val,
            userId,
          },
        },
      };
    });
  }

  if (items.length > 0) {
    const paramsMerchantUserStore = {
      RequestItems: {
        [merchantUserStoreTable]: items,
      },
    };

    await dynamodb
      .batchWrite(paramsMerchantUserStore)
      .promise()
      .catch((err) => console.log(err));
  }

  if (storeIds) {
    console.log("if storeIds");
    storeidcount = storeIds.map((val) => {
      getStoreWithId(val);
    });
  }
  const cognitoUser = await getCognitoUser(userId);
  const merchanUser = await getDynamoUser(userId);
  const params = {
    TableName: merchantUserTable,
    Item: newBodyInput,
  };

  if (!merchanUser && !cognitoUser) {
    // var params1 = {
    //   UserPoolId: merchantUserPoolId,
    //   Username: userId,
    //   //email: body.input["email"],
    //   //TemporaryPassword: 'Password!1',
    //   DesiredDeliveryMediums: ["EMAIL"],
    //   UserAttributes: [
    //     {
    //       Name: "email",
    //       Value: body.input["email"],
    //     },
    //     {
    //       Name: "given_name",
    //       Value: body.input["firstName"],
    //     },
    //     {
    //       Name: "family_name",
    //       Value: body.input["lastName"],
    //     },
    //     {
    //       Name: "phone_number",
    //       Value: body.input["phoneNumber"],
    //     },
    //   ],
    // };
    var params1 = {
      ClientId: merchantClientId,
      Password: password,
      Username: userId,
      UserAttributes: [
        {
          Name: "email",
          Value: body.input["email"],
        },
        {
          Name: "given_name",
          Value: body.input["firstName"],
        },
        {
          Name: "family_name",
          Value: body.input["lastName"],
        },
        {
          Name: "phone_number",
          Value: body.input["phoneNumber"],
        },
        {
          Name: 'middle_name',
          Value: body.input['middleName']
        }
      ],
    };

    try {
      await cognitoidentityserviceprovider.signUp(params1).promise();
      await publishmerchantProfileEvent(
        {  input: { 
               username: userId, 
               email: body.input.email, 
               password: password,
               phone_number: body.input.phoneNumber, 
               given_name: body.input.firstName, 
               middle_name: body.input.middleName,
               family_name: body.input.lastName,
               UserPoolId: userPoolName,
               functionName: "sdk.signup"
              },
        }, 
           "Merchant AppSync invoke AddUser"
       );
      await dynamodb
        .put(params)
        .promise()
        .catch((err) => console.log(err));
      return {
        ...body.input,
        returnedIds: idsCreated,
        message: "Item successfully Inserted",
      };
    } catch (err) {
      console.log("ERR:: ", err.message);
      return { error: { message: err.message, type: "MUTATION_ERROR" } };
    }
  } else if (!merchanUser && cognitoUser) {
    const paramsMerchantUserStore = {
      RequestItems: {
        [merchantUserStoreTable]: items,
      },
    };

    try {
      await dynamodb
        .put(params)
        .promise()
        .catch((err) => console.log(err));
      await dynamodb
        .batchWrite(paramsMerchantUserStore)
        .promise()
        .catch((err) => console.log(err));
      return {
        ...body.input,
        phoneNumber: finalNumber,
        returnedIds: idsCreated,
        message: "Item successfully Inserted",
      };
    } catch (err) {
      console.log("ERR:: ", err);
      return { error: { message: err.message, type: "MUTATION_ERROR" } };
    }
  }
};

/**************************************************************
 * Update Merchant User
 **************************************************************/
updateMerchantUser = async (body) => {
  console.log(body);
  let storeIDuserStore = [];
  let storeIDFromUser = [];
  const { userId } = body.input;
  const newBody = { ...body.input };
  delete newBody.userId;
  if (newBody?.address) {
    updateGeoPoint(newBody["address"]);
  }

  const { storeIds } = body.input;

  let TestUpdateExpression = "";
  let ExpressionAttributeValues = {};
  let i = 0;

  let phoneNumber;
  if (
    body.input.phoneNumber !== null &&
    body.input.hasOwnProperty("phoneNumber")
  ) {
    phoneNumber = body.input.phoneNumber.split(" ").join("");
  }

  const email = body.input?.email;

  const objSize = Object.keys(newBody).length;

  if (objSize === 1 && newBody.hasOwnProperty("storeIds")) {
    TestUpdateExpression = "set storeCount = :storeCount";
    ExpressionAttributeValues[":storeCount"] = storeIds.length;
  } else {
    for (let item in newBody) {
      if (i === 0) {
        TestUpdateExpression += `set ${item} = :new${item}, `;
        i++;
      } else {
        if (item === "storeIds") continue;
        TestUpdateExpression += `${item} = :new${item}, `;
      }

      ExpressionAttributeValues[`:new${item}`] = newBody[item];
    }
    if (newBody.hasOwnProperty("storeIds")) {
      TestUpdateExpression += "storeCount = :storeCount";
      ExpressionAttributeValues[":storeCount"] = storeIds.length;
    } else {
      TestUpdateExpression = TestUpdateExpression.slice(0, -2);
    }
  }

  const UpdateExpression = TestUpdateExpression;

  const params = {
    TableName: merchantUserTable,
    Key: {
      userId,
    },
    UpdateExpression,
    ExpressionAttributeValues,
    ReturnValues: "UPDATED_NEW",
  };

  let returnObj = {};
  console.log(" params :: -->", params);
  if (storeIds) {
    const paramsMerchantUserStoreSearch = {
      TableName: merchantUserStoreTable,
      IndexName: "byUser",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    };
    console.log(
      " paramsMerchantUserStoreSearch :: -->",
      paramsMerchantUserStoreSearch
    );
    const data = await dynamodb.query(paramsMerchantUserStoreSearch).promise();

    // Deleting the record (old users)
    console.log(" data :: -->", data);

    data.Items.forEach(async (item) => {
      storeIDuserStore.push(item.storeId);
      console.log("storeIDuserStore :: --> ", storeIDuserStore);
      const paramsDelete = {
        TableName: merchantUserStoreTable,
        Key: {
          id: item.id,
        },
      };
      console.log(" paramsDelete :: -->", paramsDelete);
      const res = await dynamodb.delete(paramsDelete).promise();
      console.log("res :: -> ", res);
    });

    const items = storeIds.map((val) => {
      const idMerchantUserStore = nanoid();
      // idsCreated.push(idMerchantUserStore);
      storeIDFromUser.push(val);
      console.log("storeIDFromUser :: --> ", storeIDFromUser);
      return {
        PutRequest: {
          Item: {
            id: idMerchantUserStore,
            storeId: val,
            userId,
          },
        },
      };
    });
    let diff = storeIDuserStore.filter(
      (o1) => !storeIDFromUser.some((o2) => o1 === o2)
    );
    console.log("diff ::: --> ", diff);
    if (diff.length > 0) {
      console.log("if storeIds");
      const deleted = diff.map((val) => {
        getStoreWithDelete(val);
      });
    }
    let addition = storeIDFromUser.filter(
      (o1) => !storeIDuserStore.some((o2) => o1 === o2)
    );
    console.log("addition ::: --> ", addition);
    if (addition.length > 0) {
      console.log("if addition");
      const deleted = addition.map((val) => {
        getStoreWithId(val);
      });
    }
    console.log(" items :; -> ", JSON.stringify(items));
    const paramsMerchantUserStore = {
      RequestItems: {
        [merchantUserStoreTable]: items,
      },
    };
    console.log(" paramsMerchantUserStore :: -->", paramsMerchantUserStore);
    await dynamodb
      .batchWrite(paramsMerchantUserStore)
      .promise()
      .catch((err) => console.log(err));

    returnObj = {
      returnedIds: storeIds,
    };
  }

  try {
    const res = await dynamodb.update(params).promise();
    console.log(res);
    
    let drCognitoUpdateAttributes = [];
    if (phoneNumber !== null && body.input.hasOwnProperty("phoneNumber")) {    
      const paramsCognitoUpdate = {
        UserPoolId: merchantUserPoolId,
        Username: userId,
        UserAttributes: [
          {
            Name: "phone_number",
            Value: phoneNumber,
          },
        ],
      };
      console.log(" paramsCognitoUpdate : ", paramsCognitoUpdate);
      const resCognito = await cognitoidentityserviceprovider
        .adminUpdateUserAttributes(paramsCognitoUpdate)
        .promise();
      console.log(resCognito);
      drCognitoUpdatePhoneNumber = {
          Name: "phone_number",
          Value: phoneNumber     
      };  
      drCognitoUpdateAttributes.push(drCognitoUpdatePhoneNumber);
    }
    if (email !== null && body.input.hasOwnProperty("email")) {
      pushEventAttributeName = 'email';
      pushEventAttributeValue = email;
      const paramsCognitoUpdateEmail = {
        UserPoolId: merchantUserPoolId,
        Username: userId,
        UserAttributes: [
          {
            Name: "email",
            Value: email,
          },
        ],
      };
      console.log(" paramsCognitoUpdateEmail : ", paramsCognitoUpdateEmail);
      const resCognitoEmail = await cognitoidentityserviceprovider
        .adminUpdateUserAttributes(paramsCognitoUpdateEmail)
        .promise();
      console.log(resCognitoEmail);
      drCognitoUpdateEmail = {
        Name: "email",
        Value: email
      };
      drCognitoUpdateAttributes.push(drCognitoUpdateEmail);
    }


    await publishmerchantProfileEvent(
      {  input: { 
              userAttributes: drCognitoUpdateAttributes,
              UserPoolId : userPoolName,
              username : userId,
              functionName: 'adminUpdateUserAttributes'
            },
      }, 
         "Merchant AppSync invoke updateProfile"
     );
    returnObj = {
      ...returnObj,
      userId,
      ...res.Attributes,
    };

    return returnObj;
  } catch (err) {
    console.log("ERROR: ", err);
  }
};

/**************************************************************
 * Delete Merchant User
 **************************************************************/
deleteMerchantUser = async (body) => {
  console.log(body);
  let updateStoreIdCount = [];
  const { userId } = body.input;

  const params = {
    TableName: merchantUserTable, // "spirits-dev-MerchantUser"
    Key: {
      userId,
    },
  };
  const paramsCognito = {
    UserPoolId: merchantUserPoolId,
    Username: userId /* required */,
  };
  const paramsMerchantUserStoreSearch = {
    TableName: merchantUserStoreTable,
    IndexName: "byUser",
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": userId,
    },
  };

  try {
    const data = await dynamodb.query(paramsMerchantUserStoreSearch).promise();
    console.log(data);

    if (data) {
      data.Items.forEach(async (item) => {
        getStoreWithDelete(item.storeId);
        const paramsDelete = {
          TableName: merchantUserStoreTable,
          Key: {
            id: item.id,
          },
        };
        await dynamodb.delete(paramsDelete).promise();
      });
      //const updated = getStoreWithDelete()
    }
    await deleteCognitoUser(paramsCognito);
    await dynamodb.delete(params).promise();

    console.log("Item successfully deleted");

    await publishmerchantProfileEvent(
      {  input: { 
             username: userId, 
             UserPoolId: userPoolName,
             functionName: "adminDeleteUser",
            },
      }, 
         "Merchant AppSync invoke DeleteUser"
     );

    return {
      ...body.input,
      message: "Item successfully deleted",
    };
  } catch (err) {
    console.log("ERROR: ", err);
    throw err;
  }
};

/**********************
 *  Publish merchantProfile Event
 **********************/
publishmerchantProfileEvent = async (detailInput, eventType) => {
  // Publish merchantProfile Event
  const merchantUserProfileEventParams = {
    Entries: [
      {
        Detail: JSON.stringify(detailInput),
        DetailType: eventType,
        EventBusName: process.env.EVENT_BUS_NAME,
        Source: process.env.EVENT_BUS_SOURCE,
      },
    ],
  };
  const publishResult = await eventbridge.putEvents(merchantUserProfileEventParams).promise();
  console.log("Publish merchantUserProfile Result: ", publishResult);
  console.log("merchantUserProfileEvent Parameters: ", merchantUserProfileEventParams);
  // Publish Completed
};


/**************************************************************
 * Delete Merchant User Bulk
 **************************************************************/
deleteMerchantUserBulk = async (body) => {
  const { userIds } = body.input;
  const merchantUserStoreIds = [];
  const storeIds = [];

  console.log(userIds);

  const deleteRequestArray = userIds.map((userId) => {
    return {
      DeleteRequest: {
        Key: { userId },
      },
    };
  });

  const params = {
    RequestItems: {
      [merchantUserTable]: deleteRequestArray,
    },
  };

  const paramsMerchantUserStoreSearch = {
    TableName: merchantUserStoreTable,
    IndexName: "byUser",
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {},
  };

  for (const userId of userIds) {
    paramsMerchantUserStoreSearch.ExpressionAttributeValues[":userId"] = userId;
    const data = await dynamodb.query(paramsMerchantUserStoreSearch).promise();

    data.Items.forEach((item) => {
      merchantUserStoreIds.push(item.id);
      storeIds.push(item.storeId);
    });
  }

  console.log(merchantUserStoreIds);
  console.log(storeIds);

  const storeIdsSet = new Set(storeIds);

  const deleteRequestArrayMerchantUserStore = merchantUserStoreIds.map((id) => {
    return {
      DeleteRequest: {
        Key: { id },
      },
    };
  });

  const paramsMerchantUserStoreDelete = {
    RequestItems: {
      [merchantUserStoreTable]: deleteRequestArrayMerchantUserStore,
    },
  };

  for (const storeId of storeIdsSet) {
    await getStoreWithDelete(storeId);
  }

  await dynamodb.batchWrite(params).promise();
  await dynamodb.batchWrite(paramsMerchantUserStoreDelete).promise();
  console.log("Deleted users from db");
  console.log("user id's after delete " + userIds);

  await deleteUsersCognito(userIds);

  return {
    returnedIds: userIds,
  };
};

const deleteUsersCognito = async (userIds) => {
  for (const item in userIds) {
    const userId = userIds[item];

    const cognitoParams = {
      UserPoolId: merchantUserPoolId,
      Username: userId,
    };
    await cognitoidentityserviceprovider
      .adminDeleteUser(cognitoParams)
      .promise()
      .catch((err) => console.log(err));
  }
};

/**************************************************************
 * Get PDF Download
 *************************************************************/
createUserWest = async (body) => {
  try {
    // const poolId = "customerUserPoolId";

    // // const signUpData = {
    // //   // ClientId: "55l0q41s140smb5jae47kgs4o",
    // //   UserPoolId: poolId,
    // //   Username: body.username,
    // //   UserAttributes: [
    // //     {
    // //       Name: "email",
    // //       Value: body.email,
    // //     },
    // //     {
    // //       Name: "phone_number",
    // //       Value: body.phoneNumber,
    // //     },
    // //     {
    // //       Name: "given_name",
    // //       Value: body.firstName,
    // //     },
    // //     {
    // //       Name: "family_name",
    // //       Value: body.lastName,
    // //     },
    // //     {
    // //       Name: "email_verified",
    // //       Value: "true",
    // //     },
    // //     {
    // //       Name: "phone_number_verified",
    // //       Value: "true",
    // //     },
    // //   ],
    // // };
    console.log("User created successfully");
    await publishmerchantProfileEvent(
      {  input: { 
             username: body.input.username, 
             email: body.input.email, 
             password: body.input.password,
             phone_number: body.input.phoneNumber, 
             given_name: body.input.firstName, 
             middle_name: body.input.middleName,
             family_name: body.input.lastName,
             UserPoolId: userPoolName,
             functionName: "Auth.signup",
            //  email_verified, 
            //  phone_number_verified,
            },
      }, 
         "Merchant AppSync invoke createUser"
     );
     
    // console.log("User created successfully");
    return "User added successfully";
  } catch (err) {
    console.log("ERROR:: ", err);
    return err?.message ? err.message : "Unable to add contact";
  }
};
/**************************************************************
 * Get PDF Download
 *************************************************************/
updatePhoneVerification = async (body) => {
  try {
    console.log("Phone Verified successfully");

    await publishmerchantProfileEvent(
      {  input: { 
             username: body.input.username,
             type: body.input.type,
             value: body.input.value,
             UserPoolId: userPoolName,
             functionName: "Auth.verifyCurrentUserAttribute",
            },
      }, 
         "Merchant Frontend invoke PhoneVerification"
     );
    
    return "Phone Verified successfully";
  } catch (err) {
    console.log("ERROR:: ", err);
    return err?.message ? err.message : "Unable to create user";
  }
};
/**************************************************************
 * Get PDF Download
 *************************************************************/
updateEmailVerification = async (body) => {
  try {
    // const poolId = "us-west-2_V2PzIZiNp";

    // const signUpData = {
    //   // ClientId: "55l0q41s140smb5jae47kgs4o",
    //   UserPoolId: merchantUserPoolId,
    //   Username: body.input.username, /* required */
    //   UserAttributes: [
    //     {
    //       Name: "email",
    //       Value: body.input.email,
    //     },
    //     {
    //       Name: "phone_number",
    //       Value: body.input.phoneNumber,
    //     },
    //     {
    //       Name: "given_name",
    //       Value: body.input.firstName,
    //     },
    //     {
    //       Name: "family_name",
    //       Value: body.input.lastName,
    //     },
    //     // {
    //     //   Name: "email_verified",
    //     //   Value: "true",
    //     // },
    //     // {
    //     //   Name: "phone_number_verified",
    //     //   Value: "true",
    //     // },
    //   ],
    // };

    // await cognito.adminCreateUser(signUpData).promise();

    // const passwordData = {
    //   UserPoolId: merchantUserPoolId,
    //   Password: body.input.password,
    //   Username: body.input.username,
    //   Permanent: true,
    // };

    // await cognito.adminSetUserPassword(passwordData).promise();
    console.log("Email Verified successfully");

    await publishmerchantProfileEvent(
      {  input: { 
             username: body.input.username,
             type: body.input.type,
             value: body.input.value,
             UserPoolId: userPoolName,
             functionName: "Auth.verifyCurrentUserAttribute",
            },
      }, 
         "Merchant Frontend invoke EmailVerification"
     );
    // console.log("Email Verified successfully");
    return "Email Verified successfully";
  } catch (err) {
    console.log("ERROR:: ", err);
    return err?.message ? err.message : "Unable to create user";
  }
};

/**************************************************************
 * Get PDF Download
 *************************************************************/
updateUserWest = async (body) => {
  try {
    // const poolId = "us-west-2_8MIcY2Uk2";

    // if (body.type?.toLowerCase() === "password") {
    //   const passwordData = {
    //     UserPoolId: merchantUserPoolId,
    //     Username: body.input.username,
    //     Password: body.input.password,
    //     Permanent: true,
    //   };

    //   await cognito.adminSetUserPassword(passwordData).promise();

    //   return "Password updated successfully";
    // } else if (body.type?.toLowerCase() === "user") {
    //   const tempBody = JSON.parse(JSON.stringify(body));
    //   delete tempBody.type;
    //   delete tempBody.username;
    //   if (tempBody?.password) {
    //     delete tempBody.password;
    //   }

    //   const updateObjArray = [];

    //   for (const item in tempBody) {
    //     updateObjArray.push({
    //       Name: item,
    //       Value: tempBody[item],
    //     });
    //   }

    //   const updateData = {
    //     UserPoolId: merchantUserPoolId,
    //     UserAttributes: updateObjArray,
    //     Username: body.input.username,
    //   };

    //   await cognito.adminUpdateUserAttributes(updateData).promise();
    console.log("password changed successfully");

    await publishmerchantProfileEvent(
      {  input: { 
             username: body.input.username, 
            //  email: body.input.email, 
             password: body.input.password,
             type: 'password',
             UserPoolId: userPoolName,
             functionName: "Auth.changePassword",
            },
      }, 
         "Merchant Frontend invoke ChangePassword"
     );
    //  console.log("User created successfully");
      return "password changed successfully";
    // } else {
    //   return "Invalid operation";
    // }
  } catch (err) {
    console.log("ERROR:: ", err);
    return err?.message ? err.message : "Unable to perform the operation";
  }
};

/**************************************************************
 * Forget Password
 *************************************************************/
updateForgetPassword = async (body) => {
  try {
    console.log("Updated ForgetPassword successfully");
    await publishmerchantProfileEvent(
      {  input: { 
             username: body.input.username, 
            //  email: body.input.email, 
             password: body.input.password,
             type: 'password',
             UserPoolId: userPoolName,
             functionName: "Auth.ForgetPassword",
            },
      }, 
         "Merchant Frontend invoke ForgetPassword"
     );
    //  console.log("Updated ForgetPassword successfully");
      return "Updated ForgetPassword successfully";
    // } else {
    //   return "Invalid operation";
    // }
  } catch (err) {
    console.log("ERROR:: ", err);
    return err?.message ? err.message : "Unable to perform the operation";
  }
};

/**************************************************************
 * Confirm Signup
 *************************************************************/
confirmSignup = async (body) => {
  try {
    console.log("successfully verified your mobile");
    await publishmerchantProfileEvent(
      {  input: { 
             username: body.input.username,
             UserPoolId: userPoolName,
             functionName: "Auth.confirmsignup"
            //  email: body.input.email, 
            //  password: body.input.password,
            //  type: 'password',
            },
      }, 
         "Merchant Frontend Auth.confirmSignup"
     );
    //  console.log("successfully verified your mobile");
    return "successfully verified your mobile";
    // } else {
    //   return "Invalid operation";
    // }
  } catch (err) {
    console.log("ERROR:: ", err);
    return err?.message ? err.message : "Unable to perform the operation";
  }
};
