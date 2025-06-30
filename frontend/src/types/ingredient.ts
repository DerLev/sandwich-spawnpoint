export enum IngredientType {
  BREAD = "BREAD",
  CHEESE = "CHEESE",
  MEAT = "MEAT",
  SALAD = "SALAD",
  TOMATO = "TOMATO",
  ONION = "ONION",
  SAUCE = "SAUCE",
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
