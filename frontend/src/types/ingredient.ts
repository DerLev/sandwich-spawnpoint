export enum IngredientType {
  BREAD = "BREAD",
  CHEESE = "CHEESE",
  MEAT = "MEAT",
  SPECIAL = "SPECIAL",
}

export type IngredientShape = {
  id: string
  createdAt: string
  modifiedAt: string
  name: string
  type: `${IngredientType}`
  enabled: boolean
}

export type IngredientOnOrderShape = {
  ingredientId: string
  orderId: string
  ingredientNumber: number
}
