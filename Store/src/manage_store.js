const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { customAlphabet } = require("nanoid");
const alphabet = "0123456789";
const idSize = 16;
const nanoid = customAlphabet(alphabet, idSize);
const merchantUserTable = process.env.MERCHANT_USER_TABLE;
const merchantUserStoreTable = process.env.MERCHANT_USER_STORE_TABLE;

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
  console.log("Received event {}", JSON.stringify(event, 3));
  try {
    switch (event.field) {
      case "createStore":
        response = await createStore(event.body, event.identity);
        break;
      case "updateStore":
        response = await updateStore(event.body, event.identity);
        break;
      case "deleteStore":
        response = await deleteStore(event.body, event.identity);
        break;
      case "deleteStoreBulk":
        response = await deleteStoreBulk(event.body);
    }
  } catch (e) {
    console.error("Error Occured", e);
  }
  return response;
};

async function getUsersWithDelete(val) {
  // body...
  //let storeCount = 0
  var paramsMerchantUser = {
    TableName: process.env.MERCHANT_USER_TABLE,
    Key: {
      userId: val,
    },
  };
  console.log("getUsersWithDelete paramsMerchantUser :: ", paramsMerchantUser);
  const getusers = await dynamodb.get(paramsMerchantUser).promise();
  console.log("getUsersWithDelete getusers --> :: ", getusers);
  const paramsUpdateMerchantUser = {
    TableName: process.env.MERCHANT_USER_TABLE,
    Key: {
      userId: getusers.Item.userId,
    },
    UpdateExpression: "set storeCount = :storeCount",
    ExpressionAttributeValues: { ":storeCount": --getusers.Item.storeCount },
    ReturnValues: "UPDATED_NEW",
  };
  console.log(
    "getUsersWithDelete paramsUpdateMerchantUser :: -- > ",
    paramsUpdateMerchantUser
  );
  const res = await dynamodb.update(paramsUpdateMerchantUser).promise();
  console.log(res);
  if (JSON.stringify(getusers) === "{}") return false;
  else return true;
}

async function getUsersWithId(val) {
  // body...
  //let storeCount = 0
  var paramsMerchantUser = {
    TableName: process.env.MERCHANT_USER_TABLE,
    Key: {
      userId: val,
    },
  };
  console.log("paramsMerchantUser :: ", paramsMerchantUser);
  const getusers = await dynamodb.get(paramsMerchantUser).promise();
  console.log(" getUsersWithId getusers --> :: ", getusers);
  const paramsUpdateMerchantUser = {
    TableName: process.env.MERCHANT_USER_TABLE,
    Key: {
      userId: getusers.Item.userId,
    },
    UpdateExpression: "set storeCount = :storeCount",
    ExpressionAttributeValues: { ":storeCount": ++getusers.Item.storeCount },
    ReturnValues: "UPDATED_NEW",
  };
  console.log("paramsUpdateMerchantUser :: -- > ", paramsUpdateMerchantUser);
  const res = await dynamodb.update(paramsUpdateMerchantUser).promise();
  console.log(res);
  if (JSON.stringify(getusers) === "{}") return false;
  else return true;
}

/**************************************************************
 * Create Store
 **************************************************************/
createStore = async (body, identity) => {
  const id = nanoid();
  body.input["id"] = id;
  body.input["merchantAccountId"] = identity.claims["m_account"];
  body.input["createdAt"] = new Date().toISOString();
  body.input["createdBy"] = identity.username;
  body.input["isOnboarded"] = false;
  body.input["isDeliveryPaused"] = true;

  const { userIds } = body.input;

  const newBodyInput = { ...body.input };
  delete newBodyInput.userIds;
  updateGeoPoint(newBodyInput["address"]);
  const idsCreated = [];

  newBodyInput["displayName"] = body.input.storeName.toLowerCase();

  let items;
  let useridcount = [];
  if (userIds) {
    newBodyInput["userCount"] = userIds.length;
    items = userIds.map((val) => {
      const idMerchantUserStore = nanoid();
      idsCreated.push(idMerchantUserStore);

      return {
        PutRequest: {
          Item: {
            id: idMerchantUserStore,
            storeId: id,
            userId: val,
          },
        },
      };
    });
  }
  if (userIds) {
    console.log("if userIds");
    useridcount = userIds.map((val) => {
      getUsersWithId(val);
    });
  }
  const paramsMerchantUserStore = {
    RequestItems: {
      [process.env.MERCHANT_USER_STORE_TABLE]: items,
    },
  };

  const params = {
    TableName: process.env.TABLE_NAME,
    Item: newBodyInput,
  };

  // Add the merchantUser to the merchantUser table
  await dynamodb
    .put(params)
    .promise()
    .catch((err) => console.log(err));

  // Batch write to the merchantUserStore table
  if (userIds.length > 0) {
    await dynamodb
      .batchWrite(paramsMerchantUserStore)
      .promise()
      .catch((err) => console.log(err));
  }

  return {
    ...newBodyInput,
    returnedIds: idsCreated,
    message: "Item successfully Inserted",
  };
};

/**************************************************************
 * Update Store
 **************************************************************/
updateStore = async (body, identity) => {
  let userIDuserStore = [];
  let userIDFromStore = [];
  const { id } = body.input;
  const newBody = { ...body.input };
  newBody["updatedAt"] = new Date().toISOString();
  newBody["updatedBy"] = identity.username;
  delete newBody.id;
  if (newBody?.address) {
    updateGeoPoint(newBody["address"]);
  }
  const { userIds } = body.input;

  let TestUpdateExpression = "";
  let ExpressionAttributeValues = {};
  let i = 0;

  for (let item in newBody) {
    if (i === 0) {
      TestUpdateExpression += `set ${item} = :new${item}, `;
      i++;
    } else TestUpdateExpression += `${item} = :new${item}, `;

    ExpressionAttributeValues[`:new${item}`] = newBody[item];
  }

  let UpdateExpression = TestUpdateExpression.slice(0, -2);
  const ConditionExpression = "merchantAccountId = :merchantAccountId";
  ExpressionAttributeValues[":merchantAccountId"] =
    identity.claims["m_account"];
  if (userIds) {
    UpdateExpression += ", userCount = :userCount";
    ExpressionAttributeValues[":userCount"] = userIds.length;
  }
  const params = {
    TableName: process.env.TABLE_NAME,
    Key: {
      id,
    },
    UpdateExpression,
    ConditionExpression,
    ExpressionAttributeValues,
    ReturnValues: "UPDATED_NEW",
  };

  if (userIds) {
    const paramsMerchantUserStoreSearch = {
      TableName: process.env.MERCHANT_USER_STORE_TABLE,
      IndexName: "byStore",
      KeyConditionExpression: "storeId = :storeId",
      ExpressionAttributeValues: {
        ":storeId": id,
      },
    };

    const data = await dynamodb.query(paramsMerchantUserStoreSearch).promise();

    // Deleting the record (old users)

    data.Items.forEach(async (item) => {
      userIDuserStore.push(item.userId);
      console.log("userIDuserStore :: --> ", userIDuserStore);
      const paramsDelete = {
        TableName: process.env.MERCHANT_USER_STORE_TABLE,
        Key: {
          id: item.id,
        },
      };

      await dynamodb.delete(paramsDelete).promise();
    });

    const items = userIds.map((val) => {
      userIDFromStore.push(val);
      console.log("userIDFromStore :: --> ", userIDFromStore);
      const idMerchantUserStore = nanoid();
      // idsCreated.push(idMerchantUserStore);

      return {
        PutRequest: {
          Item: {
            id: idMerchantUserStore,
            storeId: id,
            userId: val,
          },
        },
      };
    });

    let diff = userIDuserStore.filter(
      (o1) => !userIDFromStore.some((o2) => o1 === o2)
    );
    console.log("diff ::: --> ", diff);
    if (diff.length > 0) {
      console.log("if storeIds");
      const deleted = diff.map((val) => {
        getUsersWithDelete(val);
      });
    }
    let addition = userIDFromStore.filter(
      (o1) => !userIDuserStore.some((o2) => o1 === o2)
    );
    console.log("addition ::: --> ", addition);
    if (addition.length > 0) {
      console.log("if addition");
      const updated = addition.map((val) => {
        getUsersWithId(val);
      });
    }

    const paramsMerchantUserStoreWrite = {
      RequestItems: {
        [process.env.MERCHANT_USER_STORE_TABLE]: items,
      },
    };

    await dynamodb
      .batchWrite(paramsMerchantUserStoreWrite)
      .promise()
      .catch((err) => console.log(err));
  }

  try {
    const res = await dynamodb.update(params).promise();
    console.log(res);
    return {
      id,
      ...res.Attributes,
    };
  } catch (err) {
    console.log("ERROR: ", err);
  }
};

/**************************************************************
 * Delete Store
 **************************************************************/
deleteStore = async (body, identity) => {
  console.log(body);
  const ConditionExpression = "merchantAccountId = :merchantAccountId";
  const ExpressionAttributeValues = {};
  ExpressionAttributeValues[":merchantAccountId"] =
    identity.claims["m_account"];

  const { id } = body.input;

  const params = {
    TableName: process.env.TABLE_NAME,
    Key: {
      id,
    },
    ConditionExpression,
    ExpressionAttributeValues,
  };

  const paramsMerchantUserStoreSearch = {
    TableName: process.env.MERCHANT_USER_STORE_TABLE,
    IndexName: "byStore",
    KeyConditionExpression: "storeId = :storeId",
    ExpressionAttributeValues: {
      ":storeId": id,
    },
  };

  try {
    const data = await dynamodb.query(paramsMerchantUserStoreSearch).promise();

    data.Items.forEach(async (item) => {
      getUsersWithDelete(item.userId);
      const paramsDelete = {
        TableName: process.env.MERCHANT_USER_STORE_TABLE,
        Key: {
          id: item.id,
        },
      };
      await dynamodb.delete(paramsDelete).promise();
    });

    await dynamodb.delete(params).promise();
    return {
      ...body.input,
      message: "Item successfully deleted",
    };
  } catch (err) {
    console.log("ERROR: ", err);
    throw err;
  }
};

/**************************************************************
 * Delete Store Bulk
 **************************************************************/
deleteStoreBulk = async (body) => {
  const { ids } = body.input;

  const storeTable = process.env.TABLE_NAME;

  console.log(ids);

  const deleteRequestArrayStore = ids.map((id) => {
    return {
      DeleteRequest: {
        Key: { id },
      },
    };
  });

  const merchantUserStoreIds = await getMerchantUserStoreIds(ids);

  let deleteRequestArrayMerchantUserStore;
  let paramsMerchantUserStoreDelete;

  if (merchantUserStoreIds.length > 0) {
    deleteRequestArrayMerchantUserStore = merchantUserStoreIds.map((id) => {
      return {
        DeleteRequest: {
          Key: { id },
        },
      };
    });

    paramsMerchantUserStoreDelete = {
      RequestItems: {
        [merchantUserStoreTable]: deleteRequestArrayMerchantUserStore,
      },
    };

    await dynamodb.batchWrite(paramsMerchantUserStoreDelete).promise();
  }

  const params = {
    RequestItems: {
      [storeTable]: deleteRequestArrayStore,
    },
  };

  await dynamodb.batchWrite(params).promise();

  console.log("Deleted stores from db");
  return {
    returnedIds: ids,
  };
};

const getMerchantUserStoreIds = async (storeIds) => {
  const merchantUserStoreIds = [];

  for (const item in storeIds) {
    const id = storeIds[item];
    const paramsMerchantUserStoreSearch = {
      TableName: process.env.MERCHANT_USER_STORE_TABLE,
      IndexName: "byStore",
      KeyConditionExpression: "storeId = :storeId",
      ExpressionAttributeValues: {
        ":storeId": id,
      },
    };

    const data = await dynamodb
      .query(paramsMerchantUserStoreSearch)
      .promise()
      .catch((err) => console.log(err));

    if (data.Items.length > 0) merchantUserStoreIds.push(data.Items[0].id);
  }

  return merchantUserStoreIds;
};
