# AGENTS.md - Formstack Submitter TypeScript

## Project Overview

This is an AWS Lambda function that receives HTTP POST requests from The Guardian's Frontend and MAPI (Mobile API) services and forwards them to the Formstack database. The data originates from reader callout forms submitted on the user interface.

**Team Ownership:** Content Platforms (`@guardian/content-platforms`) and Digital CMS (`@guardian/digital-cms`)

## Architecture

```
Frontend/MAPI -> API Gateway -> Lambda -> Formstack API
```

### Key Components

| File                  | Purpose                                                 |
| --------------------- | ------------------------------------------------------- |
| `src/lambda.ts`       | Lambda handler entry point - exports `handler` function |
| `src/submitter.ts`    | Core logic - parses requests and sends to Formstack API |
| `src/local.ts`        | Local development runner with mock event data           |
| `cloudformation.yaml` | AWS SAM template defining Lambda infrastructure         |
| `riff-raff.yaml`      | Guardian's Riff-Raff deployment configuration           |

## Technology Stack

- **Runtime:** Node.js 20.x (see `.nvmrc`)
- **Language:** TypeScript 4.x
- **Build Output:** ES6 CommonJS modules
- **Package Manager:** Yarn
- **Linting:** TSLint with Prettier integration
- **Deployment:** AWS Lambda via Riff-Raff (Guardian internal)
- **Region:** `eu-west-1`

## Development Setup

### Prerequisites

1. Node.js v20.9.0+ (use `nvm use` to switch)
2. Yarn package manager
3. AWS credentials configured (profile: `frontend`)

### Installation

```bash
nvm use
yarn install
```

### Environment Variables

Required environment variables (set in terminal or `.env` file):

| Variable        | Description                | Source                                      |
| --------------- | -------------------------- | ------------------------------------------- |
| `FORMSTACK_URL` | Formstack API base URL     | Default: `https://www.formstack.com/api/v2` |
| `API_TOKEN`     | Formstack API Bearer token | CloudFormation parameter / AWS Secrets      |

For local development, reference the CODE stage in the content-api stack for values.

## Common Commands

| Command         | Description                                      |
| --------------- | ------------------------------------------------ |
| `yarn build`    | Compile TypeScript to `target/` directory        |
| `yarn lint`     | Run TSLint checks                                |
| `yarn fix`      | Auto-fix linting issues                          |
| `yarn runlocal` | Build and run locally with mock data             |
| `yarn local`    | Run pre-built local.js with AWS frontend profile |
| `yarn clean`    | Remove `target/` directory                       |
| `yarn package`  | Create Riff-Raff deployment artifact             |

## Code Conventions

### TypeScript

- Target: ES6
- Module system: CommonJS
- Source maps enabled
- Strict TSLint rules with Prettier formatting
- Console logging is permitted (`no-console: false`)

### Request/Response Format

**Input:** Lambda receives events with JSON body containing:

```typescript
{
  formId: string; // Required - Formstack form identifier
  field_XXXXXXXX: string; // Form field values (field IDs from Formstack)
}
```

**Output:** API Gateway compatible response:

```typescript
{
  isBase64Encoded: false;
  statusCode: number;
  headers: { "Access-Control-Allow-Origin": "*" };
  body: string;
}
```

### Error Handling

- Invalid JSON parsing logs error and returns undefined
- Missing `formId` logs error
- Formstack API failures are caught and logged

## Testing

### Local Testing

```bash
# Set environment variables first
export FORMSTACK_URL="https://www.formstack.com/api/v2"
export API_TOKEN="your-token-here"

# Run with mock event
yarn runlocal
```

The `src/local.ts` file contains a mock event with sample form data that can be modified for testing different scenarios.

### No Automated Tests

This project currently has no unit or integration tests. When adding tests, consider:

- Mocking `node-fetch` for Formstack API calls
- Testing `parseRequest`, `getFormId`, and `formatResponse` functions
- Validating error handling paths

## Deployment

### CI/CD Pipeline

1. **TeamCity** runs `teamcity.sh` which:
   - Sets up Node via nvm
   - Installs dependencies
   - Compiles TypeScript
   - Packages artifact for Riff-Raff

2. **Riff-Raff** deploys to AWS:
   - Stack: `content-api`
   - Stages: `CODE`, `PROD`
   - CloudFormation stack: `formstack-submitter-ts`

### Manual Deployment Steps

```bash
# Full build and package
./teamcity.sh
```

### Lambda Configuration

- Memory: 128 MB
- Timeout: 300 seconds (5 minutes)
- Reserved Concurrency: 20
- Handler: `lambda.handler`

## Troubleshooting

### Formstack Integration Failures

If integration breaks, it's usually due to an expired/deactivated access token (tokens are user-linked).

**Resolution:**

1. Contact Central Production for Admin access to Formstack
2. Generate new access token by creating a new API Application
3. Update the CloudFormation stack `ApiToken` parameter

**Note:** This repo shares Formstack credentials with [guardian/targeting](https://github.com/guardian/targeting).

### Common Issues

| Issue                  | Likely Cause              | Solution                            |
| ---------------------- | ------------------------- | ----------------------------------- |
| 401/403 from Formstack | Expired API token         | Regenerate token (see above)        |
| Missing formId error   | Malformed request payload | Check upstream service sending data |
| Lambda timeout         | Formstack API slow/down   | Check Formstack status              |

## Project Structure

```
.
├── src/
│   ├── lambda.ts          # Lambda handler entry point
│   ├── submitter.ts       # Core submission logic
│   └── local.ts           # Local development runner
├── target/                # Build output (gitignored)
├── cloudformation.yaml    # AWS SAM infrastructure
├── riff-raff.yaml         # Deployment configuration
├── teamcity.sh            # CI build script
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── tslint.json            # Linting rules
├── .nvmrc                 # Node version (20.9.0)
├── .gitignore
├── CODEOWNERS
└── README.md
```

## Dependencies

### Runtime

- `aws-sdk` - AWS service interactions
- `dotenv` - Environment variable loading
- `node-fetch` - HTTP client for Formstack API

### Development

- `typescript` - TypeScript compiler
- `tslint` - Linter
- `prettier` - Code formatter
- `@types/node` - Node.js type definitions
- `node-riffraff-artefact` - Riff-Raff packaging tool

## Security Notes

- Never commit `.env` files or API tokens
- The `API_TOKEN` is passed via CloudFormation parameters
- CORS is configured to allow all origins (`*`)
- Credentials are shared with the targeting repository

## Related Repositories

- [guardian/targeting](https://github.com/guardian/targeting) - Shares Formstack credentials
- Guardian Frontend - Sends form submissions to this Lambda
- MAPI (Mobile API) - Sends form submissions to this Lambda
