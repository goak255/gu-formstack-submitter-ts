import { sendToFormstack } from "./submitter";

export const handler = async (event, context, callback): Promise<void> => {
  console.log("Formstack Submitter ran");

  try {
    const result = await sendToFormstack(event);
    console.log("Response from Formstack:", result);
    callback(null, result);
  } catch (err) {
    console.error(err);
    callback(err);
  }
};
