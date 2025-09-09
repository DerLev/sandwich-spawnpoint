# sandwich-spawnpoint

[![CI/CD](https://github.com/DerLev/sandwich-spawnpoint/actions/workflows/integration-deployment.yml/badge.svg?branch=main&event=push)](https://github.com/DerLev/sandwich-spawnpoint/actions/workflows/integration-deployment.yml)

## Deployment

1. Copy the `docker-compose.yaml` and `.env.example` to your machine
2. Fill out the app secret and db password in the `docker-compose.yaml` and `.env.example`
3. Rename `.env.example` to `.env`
4. Create the directory `pgdata`
5. Run `docker compose up -d` to deploy the application
