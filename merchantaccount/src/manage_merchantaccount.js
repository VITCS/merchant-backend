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
      case "createMerchantAccount":
        response = await createMerchantAccount(event.body, event.identity);
        break;
      case "updateMerchantAccount":
        response = await updateMerchantAccount(event.body);
        break;
      case "deleteMerchantAccount":
        response = await deleteMerchantAccount(event.body);
        break;
    }
  } catch (e) {
    console.error("Error Occured", e);
  }
  return response;
};
/**************************************************************
 * Create MerchantAccount
 **************************************************************/
createMerchantAccount = async (body, identity) => {
  const id = nanoid();
  const userName = identity;
  body.input["id"] = id;
  body.input["ownerId"] = userName;
  let group, groupParams;

  if (body.input["groupName"]) {
    group = body.input["groupName"];
    delete body.input["groupName"];

    groupParams = {
      TableName: process.env.GROUP_TABLE_NAME,
      Item: {
        id: nanoid(),
        group,
        merchantAccountId: id,
      },
    };
  }
 
  
  const params = {
    TableName: process.env.TABLE_NAME,
    Item: modifyGeogrpahyGroupBrand(body.input),
  };

  try {
    if (groupParams) {
      await dynamodb.put(groupParams).promise();
    }

    // Create the merchantAccount
    await dynamodb.put(params).promise();

    // Find & Update the merchantUser with the merchantAccountId just created
    const paramsMerchantUserUpdate = {
      TableName: process.env.MERCHANT_USER_TABLE,
      Key: {
        userId: userName,
      },
      UpdateExpression: "set merchantAccountId = :id, userRole = :group",
      ExpressionAttributeValues: {
        ":id": id,
        ":group": "Merchant_Super_user",
      },
    };

    if (body.input && body.input.group) {
      const groupParams = {
        TableName: process.env.GROUP_TABLE_NAME,
        Item: {
          id: nanoid(),
          group: body.input.group,
          merchantAccountId: id,
        },
      };

      await dynamodb.put(groupParams).promise();
    }

    await dynamodb.update(paramsMerchantUserUpdate).promise();

    return {
      ...body.input,
      message: "Item successfully Inserted",
    };
  } catch (err) {
    console.log("Error: ", err);
  }
};

/**************************************************************
 * Update MerchantAccount
 **************************************************************/
updateMerchantAccount = async (body) => {
  console.log(body);

  const { id } = body.input;
  if(body.input.brandNameModified) {
    let brandExists =  await getBrandGroup(body.input.brand_groupName,body.input.brand_groupGeography);
    if(brandExists) {
      return { error: { message: "Brand/Group with this name already exists", type: "Brand/Group Validation Error" } };   
    }
  }
  const newBody = modifyGeogrpahyGroupBrand(body.input);
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

  const params = {
    TableName: process.env.TABLE_NAME,
    Key: {
      id,
    },
    UpdateExpression,
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
 * Delete MerchantAccount
 **************************************************************/
deleteMerchantAccount = async (body) => {
  console.log(body);

  const params = {
    TableName: process.env.TABLE_NAME,
    Key: {
      id: body.input.id,
    },
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

function modifyGeogrpahyGroupBrand(bodyInput) {
  const geographyInput = bodyInput.brand_groupGeography;
  const group_brand_Input = bodyInput.brand_groupName;
  return { 
    ...bodyInput,
    brand_groupGeography: geographyInput ? geographyInput : 'None',
    brand_groupName: group_brand_Input ? group_brand_Input.toUpperCase() : 'None'
  };
}

async function getBrandGroup(brandGroupName,brandGroupGeography) {
  brandGroupName = brandGroupName ? brandGroupName.toUpperCase() : 'Empty_Null';
  brandGroupGeography = brandGroupGeography ? brandGroupGeography : 'Empty_Null';
  var getBrandParams = {
    TableName: process.env.TABLE_NAME,
    IndexName: 'by_brand_groupGeography',
    KeyConditionExpression: 'brand_groupGeography = :brandGroupGeography and brand_groupName = :brandGroupName',
    ExpressionAttributeValues: {
      ':brandGroupGeography': brandGroupGeography,
      ':brandGroupName': brandGroupName
    }
  };
  
  const brandName = await dynamodb.query(getBrandParams).promise();

  if(brandName && brandName.Count == 0) return false;
  else return true;
}
