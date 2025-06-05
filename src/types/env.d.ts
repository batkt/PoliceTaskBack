declare namespace NodeJS {
  export interface ProcessEnv {
    readonly PORT: number;
    readonly NODE_ENV: 'production' | 'development' | 'stage';
    readonly MONGO_URI: string;
    readonly ACCESS_TOKEN_SECRET: string;
    readonly FRONTEND_URL: string;
    readonly BASE_URL: string;
  }
}
