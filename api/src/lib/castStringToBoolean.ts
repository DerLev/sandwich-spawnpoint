/**
 * Converts a string into a boolean
 * @param input String to be converted into a boolean
 * @returns Boolean from string
 */
const castStringToBoolean = (input: string) => {
  if (input === "true" || input === "True" || input === "TRUE") {
    return true
  } else {
    return false
  }
}

export default castStringToBoolean
