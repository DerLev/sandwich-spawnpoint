export enum ConfigType {
  STRING = "STRING",
  NUMBER = "NUMBER",
  BOOLEAN = "BOOLEAN",
  PASSWORD = "PASSWORD",
  VIPOTPS = "VIPOTPS",
}

export type ConfigShape = {
  id: number
  key: string
  type: `${ConfigType}`
  value: string
  createdAt: string
  modeifiedAt: string
}

export type ConfigGet = {
  enabled: boolean
  allowOrders: boolean
}
