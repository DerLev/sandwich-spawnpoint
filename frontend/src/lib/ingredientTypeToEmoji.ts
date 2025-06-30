import type { IngredientType } from "../types/ingredient"

/**
 * Convert an ingredient type to an Emoji
 * @param type Ingredient type to be converted
 * @returns String with Emoji
 */
const ingredientTypeToEmoji = (type: `${IngredientType}`) => {
  switch (type) {
    case "BREAD":
      return "🍞"
    case "CHEESE":
      return "🧀"
    case "MEAT":
      return "🥩"
    case "SALAD":
      return "🥬"
    case "TOMATO":
      return "🍅"
    case "ONION":
      return "🧅"
    case "SAUCE":
      return "🍶"
    case "SPECIAL":
      return "✨"
    default:
      return ""
  }
}

export default ingredientTypeToEmoji
