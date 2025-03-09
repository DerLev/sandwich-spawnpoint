# API

The API is written in TypeScript and uses Hono as the HTTP framework

API is used to serve the frontend, proxy ElectricSQL, and for RESTful endpoints.

## Development

To install all modules and run the API:

```
yarn
yarn prisma generate
yarn dev
```

For type checking and linting:

```
yarn lint
yarn tsc --noEmit
```
