import type { IngredientShape } from "./ingredient"

export enum OrderStatus {
  INQUEUE = "INQUEUE",
  BEINGMADE = "BEINGMADE",
  DONE = "DONE",
}

export type OrderList = {
  id: string
  userId: string
  createdAt: string
  modifiedAt: string
  status: `${OrderStatus}`
  ingredients: {
    ingredient: IngredientShape
    ingredientNumber: number
  }[]
}[]

export type OrderNew = {
  id: string
  userId: string
  createdAt: string
  modifiedAt: string
  status: `${OrderStatus}`
}

export type OrdersShape = {
  id: string
  userId: string
  createdAt: string
  modifiedAt: string
  status: `${OrderStatus}`
}
