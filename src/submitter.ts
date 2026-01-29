import * as dotenv from "dotenv";
import * as fetch from "node-fetch";
import { parse } from "querystring";
dotenv.config();

const reqHeaders = {
  method: "post",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${process.env.API_TOKEN}`,
  },
};

const parseRequest = (data): object => {
  try {
    return JSON.parse(data.body);
  } catch (e) {
    console.error(`Invalid JSON - failed to parse request body ${data}`, e);
  }
};

const getFormId = (dataBody): string => {
  if (dataBody.formId) {
    console.log("Submission for form", dataBody.formId);
    return dataBody.formId;
  } else {
    console.error("Missing form id in request payload");
  }
};

const getFullUrl = (formId: string): string => {
  return `${process.env.FORMSTACK_URL}/${formId}/submission.json`;
};

// API Gateway requires all responses returned from the lambda to the invoking app to be valid JSON in this format
const formatResponse = (res): object => {
  const respObj = {
    isBase64Encoded: false,
    statusCode: res.status,
    headers: {
      "Access-Control-Allow-Origin": "*"
    },
    body: "null"
  };
  return respObj;
};

export const sendToFormstack = async (data: object) => {
  const parsedDataBody = parseRequest(data);
  const formId: string = getFormId(parsedDataBody);
  const formstackUrl: string = getFullUrl(formId);
  const request: object = {
    ...reqHeaders,
    body: JSON.stringify(parsedDataBody)
  };

  return await fetch(formstackUrl, request)
    .then(res => {
      return formatResponse(res);
    })
    .catch(err => console.error(`POST request to Formstack failed: ${err}`));
};
