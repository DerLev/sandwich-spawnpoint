export enum UserTypes {
  USER = "USER",
  VIP = "VIP",
  ADMIN = "ADMIN",
}

export type UsersShape = {
  id: string
  name: string
  role: `${UserTypes}`
  createdAt: string
}
