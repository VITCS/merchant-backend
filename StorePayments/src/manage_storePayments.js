const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { customAlphabet } = require("nanoid");
const alphabet = "0123456789";
const idSize = 16;
const nanoid = customAlphabet(alphabet, idSize);
/**************************************************************
 * Main Handler
 **************************************************************/
exports.handler = async function (event, context, callback) {
  if (!event) throw new Error("Event not found");
  let response;
  console.log("Received event {}", JSON.stringify(event, 3));
  try {
    switch (event.field) {
      case "createStorePayments":
        response = await createStorePayments(event.body, event.identity);
        break;
      case "updateStorePayments":
        response = await updateStorePayments(event.body, event.identity);
        break;
      case "deleteStorePayments":
        response = await deleteStorePayments(event.body, event.identity);
        break;
    }
  } catch (e) {
    console.error("Error Occured", e);
  }
  return response;
};
/**************************************************************
 * Create Store Payments
 **************************************************************/
createStorePayments = async (body, identity) => {
  const id = nanoid();
  body.input["id"] = id;
  body.input["merchantAccountId"] = identity.claims["m_account"];
  body.input["createdAt"] = new Date().toISOString();
  body.input["createdBy"] = identity.username;

  const params = {
    TableName: process.env.TABLE_NAME,
    Item: body.input,
  };
  await dynamodb.put(params).promise();
  return {
    ...body.input,
    message: "Item successfully Inserted",
  };
};

/**************************************************************
 * Update Store Payments
 **************************************************************/
updateStorePayments = async (body, identity) => {
  const { id } = body.input;
  const newBody = { ...body.input };
  newBody["updatedAt"] = new Date().toISOString();
  newBody["updatedBy"] = identity.username;
  delete newBody.id;

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

  const UpdateExpression = TestUpdateExpression.slice(0, -2);
  const ConditionExpression = "merchantAccountId = :merchantAccountId";
  ExpressionAttributeValues[":merchantAccountId"] =
    identity.claims["m_account"];
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
 * Delete Store Payments
 **************************************************************/
deleteStorePayments = async (body, identity) => {
  console.log(body);
  const ConditionExpression = "merchantAccountId = :merchantAccountId";
  const ExpressionAttributeValues = {};
  ExpressionAttributeValues[":merchantAccountId"] =
    identity.claims["m_account"];

  const params = {
    TableName: process.env.TABLE_NAME,
    Key: {
      id: body.input.id,
    },
    ConditionExpression,
    ExpressionAttributeValues,
  };

  try {
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
