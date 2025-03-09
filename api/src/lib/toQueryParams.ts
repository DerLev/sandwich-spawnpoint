/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Convert an object to a url encoded string
 * @param input Object to be converted to url query
 * @returns Url encoded string of input object
 */
const toQueryParams = (input: { [key: string]: any }) => {
  /* Convert arrays to strings */
  for (const key in input) {
    if (Array.isArray(input[key])) {
      input[key] = input[key].toString()
    }
  }

  /* Convert into url search params */
  const resArr: string[] = []
  for (const key in input) {
    resArr.push(encodeURIComponent(key) + "=" + encodeURIComponent(input[key]))
  }

  return resArr.join("&")
}

export default toQueryParams
