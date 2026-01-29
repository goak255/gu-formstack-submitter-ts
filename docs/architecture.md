# Architecture Diagrams

This document contains Mermaid diagrams illustrating the Formstack Submitter architecture.

## Table of Contents

1. [High-Level System Architecture](#high-level-system-architecture)
2. [Request Processing Flow](#request-processing-flow)
3. [Lambda Function Internal Structure](#lambda-function-internal-structure)
4. [AWS Infrastructure](#aws-infrastructure)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Error Handling Flow](#error-handling-flow)

---

## High-Level System Architecture

This diagram shows how the Formstack Submitter fits into The Guardian's ecosystem.

```mermaid
flowchart TB
    subgraph "User Interface"
        UI[Reader Callout Forms]
    end

    subgraph "Guardian Services"
        FE[Frontend Service]
        MAPI[Mobile API - MAPI]
    end

    subgraph "AWS eu-west-1"
        APIGW[API Gateway]
        Lambda[Formstack Submitter Lambda]
    end

    subgraph "External Services"
        FS[(Formstack Database)]
    end

    UI -->|Form Submission| FE
    UI -->|Form Submission| MAPI
    FE -->|HTTP POST| APIGW
    MAPI -->|HTTP POST| APIGW
    APIGW -->|Invoke| Lambda
    Lambda -->|POST /api/v2/form_id/submission.json| FS

    style Lambda fill:#ff9900,stroke:#232f3e,color:#000
    style FS fill:#4a90d9,stroke:#333,color:#fff
    style APIGW fill:#a166ff,stroke:#232f3e,color:#fff
```

---

## Request Processing Flow

This sequence diagram shows the complete flow of a form submission request.

```mermaid
sequenceDiagram
    autonumber
    participant User as Reader
    participant FE as Frontend/MAPI
    participant APIGW as API Gateway
    participant Lambda as Lambda Handler
    participant Sub as Submitter Module
    participant FS as Formstack API

    User->>FE: Submit callout form
    FE->>APIGW: HTTP POST (JSON body)
    APIGW->>Lambda: Invoke handler(event)

    Lambda->>Sub: sendToFormstack(event)

    Sub->>Sub: parseRequest(data)
    Note over Sub: JSON.parse(data.body)

    Sub->>Sub: getFormId(parsedBody)
    Note over Sub: Extract formId field

    Sub->>Sub: getFullUrl(formId)
    Note over Sub: Build Formstack URL

    Sub->>FS: POST /api/v2/{formId}/submission.json
    Note over Sub,FS: Bearer token authentication

    FS-->>Sub: HTTP Response (status)

    Sub->>Sub: formatResponse(res)
    Note over Sub: Format for API Gateway

    Sub-->>Lambda: Response object
    Lambda-->>APIGW: callback(null, result)
    APIGW-->>FE: HTTP Response
    FE-->>User: Confirmation
```

---

## Lambda Function Internal Structure

This diagram shows the module structure and function relationships.

```mermaid
flowchart TB
    subgraph "lambda.ts"
        handler["handler(event, context, callback)"]
    end

    subgraph "submitter.ts"
        sendToFormstack["sendToFormstack(data)"]
        parseRequest["parseRequest(data)"]
        getFormId["getFormId(dataBody)"]
        getFullUrl["getFullUrl(formId)"]
        formatResponse["formatResponse(res)"]
        reqHeaders["reqHeaders (const)"]
    end

    subgraph "External"
        fetch["node-fetch"]
        dotenv["dotenv"]
    end

    subgraph "Environment"
        API_TOKEN["API_TOKEN"]
        FORMSTACK_URL["FORMSTACK_URL"]
    end

    handler -->|imports| sendToFormstack
    sendToFormstack --> parseRequest
    sendToFormstack --> getFormId
    sendToFormstack --> getFullUrl
    sendToFormstack --> formatResponse
    sendToFormstack --> reqHeaders
    sendToFormstack -->|HTTP POST| fetch

    reqHeaders -.->|uses| API_TOKEN
    getFullUrl -.->|uses| FORMSTACK_URL
    dotenv -.->|loads| API_TOKEN
    dotenv -.->|loads| FORMSTACK_URL

    style handler fill:#ff9900,stroke:#333
    style sendToFormstack fill:#4a90d9,stroke:#333,color:#fff
```

---

## AWS Infrastructure

This diagram shows the AWS resources defined in CloudFormation.

```mermaid
flowchart TB
    subgraph "CloudFormation Stack: formstack-submitter-ts"
        subgraph "Parameters"
            Stack["Stack: content-api"]
            App["App: formstack-submitter-ts"]
            Stage["Stage: CODE | PROD"]
            DeployBucket["DeployBucket: content-api-dist"]
            ApiToken["ApiToken: (secret)"]
            FormStackUrl["FormStackUrl: formstack.com/api/v2"]
        end

        subgraph "Resources"
            Lambda["AWS::Serverless::Function"]
        end

        subgraph "Lambda Configuration"
            Runtime["Runtime: nodejs20.x"]
            Handler["Handler: lambda.handler"]
            Memory["Memory: 128 MB"]
            Timeout["Timeout: 300s"]
            Concurrency["Reserved Concurrency: 20"]
        end

        subgraph "Environment Variables"
            EnvStage["Stage"]
            EnvToken["API_TOKEN"]
            EnvUrl["FORMSTACK_URL"]
        end

        subgraph "IAM"
            Role["AWSLambdaBasicExecutionRole"]
        end
    end

    subgraph "S3"
        Artifact["s3://content-api-dist/{Stack}/{Stage}/{App}/{App}.zip"]
    end

    Stage --> Lambda
    ApiToken --> EnvToken
    FormStackUrl --> EnvUrl
    Lambda --> Runtime
    Lambda --> Handler
    Lambda --> Memory
    Lambda --> Timeout
    Lambda --> Concurrency
    Lambda --> Role
    Artifact -->|CodeUri| Lambda

    style Lambda fill:#ff9900,stroke:#232f3e,color:#000
    style Artifact fill:#3f8624,stroke:#333,color:#fff
```

---

## CI/CD Pipeline

This diagram shows the build and deployment process.

```mermaid
flowchart LR
    subgraph "Development"
        Code[Source Code]
        Git[Git Repository]
    end

    subgraph "TeamCity CI"
        subgraph "teamcity.sh"
            NVM[Setup NVM]
            Yarn[Install Yarn]
            Deps[Install Dependencies]
            Build[TypeScript Compile]
            Prepare[Prepare Target]
            Package[Create Artifact]
        end
    end

    subgraph "Riff-Raff"
        Upload[Upload to S3]
        CFDeploy[CloudFormation Deploy]
        LambdaDeploy[Lambda Deploy]
    end

    subgraph "AWS eu-west-1"
        S3[(S3 Bucket)]
        CF[CloudFormation]
        LambdaFn[Lambda Function]
    end

    Code -->|commit| Git
    Git -->|trigger| NVM
    NVM --> Yarn
    Yarn --> Deps
    Deps --> Build
    Build --> Prepare
    Prepare --> Package

    Package -->|artifact| Upload
    Upload --> S3
    S3 --> CFDeploy
    CFDeploy --> CF
    CF --> LambdaDeploy
    LambdaDeploy --> LambdaFn

    style Build fill:#3178c6,stroke:#333,color:#fff
    style LambdaFn fill:#ff9900,stroke:#232f3e,color:#000
    style S3 fill:#3f8624,stroke:#333,color:#fff
```

---

## Error Handling Flow

This diagram shows how errors are handled throughout the system.

```mermaid
flowchart TB
    subgraph "Input Processing"
        Event[Lambda Event]
        Parse{Parse JSON}
        ValidJSON[Valid JSON]
        InvalidJSON[Invalid JSON]
    end

    subgraph "Validation"
        CheckFormId{Has formId?}
        HasFormId[Form ID Found]
        NoFormId[Missing formId]
    end

    subgraph "API Call"
        BuildURL[Build Formstack URL]
        Fetch{Fetch to Formstack}
        Success[Success Response]
        FetchError[Fetch Error]
    end

    subgraph "Response Handling"
        Format[Format Response]
        Callback[Return via Callback]
    end

    subgraph "Error Logging"
        LogParseError["console.error: Invalid JSON"]
        LogFormIdError["console.error: Missing form id"]
        LogFetchError["console.error: POST request failed"]
    end

    Event --> Parse
    Parse -->|success| ValidJSON
    Parse -->|error| InvalidJSON

    InvalidJSON --> LogParseError
    LogParseError -->|returns undefined| Callback

    ValidJSON --> CheckFormId
    CheckFormId -->|yes| HasFormId
    CheckFormId -->|no| NoFormId

    NoFormId --> LogFormIdError

    HasFormId --> BuildURL
    BuildURL --> Fetch

    Fetch -->|success| Success
    Fetch -->|error| FetchError

    FetchError --> LogFetchError

    Success --> Format
    Format --> Callback

    style InvalidJSON fill:#dc3545,stroke:#333,color:#fff
    style NoFormId fill:#dc3545,stroke:#333,color:#fff
    style FetchError fill:#dc3545,stroke:#333,color:#fff
    style Success fill:#28a745,stroke:#333,color:#fff
```

---

## Data Flow Diagram

This diagram shows the data transformations at each step.

```mermaid
flowchart LR
    subgraph "Input"
        Raw["Event Object
        {
          headers: {...},
          body: '{JSON string}'
        }"]
    end

    subgraph "parseRequest()"
        Parsed["Parsed Body
        {
          formId: '2994970',
          field_XXX: 'value',
          ...
        }"]
    end

    subgraph "getFormId()"
        FormId["formId: '2994970'"]
    end

    subgraph "getFullUrl()"
        URL["https://formstack.com
        /api/v2/2994970
        /submission.json"]
    end

    subgraph "fetch()"
        Request["POST Request
        {
          method: 'post',
          headers: {
            Authorization: Bearer,
            Content-Type: JSON
          },
          body: JSON.stringify()
        }"]
    end

    subgraph "formatResponse()"
        Response["API Gateway Response
        {
          isBase64Encoded: false,
          statusCode: 200,
          headers: {CORS},
          body: 'null'
        }"]
    end

    Raw -->|JSON.parse| Parsed
    Parsed -->|extract| FormId
    FormId -->|template| URL
    Parsed -->|stringify| Request
    URL --> Request
    Request -->|HTTP POST| Response

    style Raw fill:#e9ecef,stroke:#333
    style Response fill:#28a745,stroke:#333,color:#fff
```

---

## Deployment Stages

```mermaid
flowchart TB
    subgraph "Riff-Raff Deployment"
        direction TB

        subgraph "Stack: content-api"
            subgraph "CODE Stage"
                CodeCF[CloudFormation Stack]
                CodeLambda[formstack-submitter-ts-CODE]
            end

            subgraph "PROD Stage"
                ProdCF[CloudFormation Stack]
                ProdLambda[formstack-submitter-ts-PROD]
            end
        end
    end

    subgraph "Region: eu-west-1"
        S3["S3: content-api-dist"]
    end

    S3 -->|deploy| CodeCF
    CodeCF -->|create/update| CodeLambda

    S3 -->|deploy| ProdCF
    ProdCF -->|create/update| ProdLambda

    CodeLambda -.->|promote| ProdLambda

    style CodeLambda fill:#ffc107,stroke:#333,color:#000
    style ProdLambda fill:#28a745,stroke:#333,color:#fff
```
