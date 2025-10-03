export interface AWSConfig {
  accessKey: string;
  secretKey: string;
  region: string;
}

export interface SnowflakeConfig {
  username: string;
  password: string;
  account: string;
  role: string;
  warehouse: string;
  database: string;
  schema: string;
}
