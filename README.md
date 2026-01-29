# Formstack Submitter

This lambda receives HTTP POST requests from Frontend and MAPI and sends them on to the Formstack database.

The data comes from reader callout forms submitted on the user interface.

## To test locally

Run the local file: `npm run runlocal`
Ensure to put environment variables `FORMSTACK_URL` and `API_TOKEN` on terminal before running above command.
Please refer stage CODE in content-api stack.

## Formstack integration issues

If the integration with Formstack is broken, it’s likely due to an expired or deactivated access token. Access tokens are linked to users and can be deactivated when users lose access to their accounts.

To resolve this, contact Central Production for Admin access to the Formstack account. The simplest solution is to generate a new access token by creating a new API Application.

Then, update the Cloudformation stack entry.

This repo uses the same credentials that https://github.com/guardian/targeting uses for authenticating with Formstack.
