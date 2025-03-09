declare namespace NodeJS {
  export interface ProcessEnv {
    NODE_ENV?: "development" | "production"
    PORT?: string
    DATABASE_URL: string
    APP_SECRET?: string
    ELECTRIC_URL?: string
  }
}
