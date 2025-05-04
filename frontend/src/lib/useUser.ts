import { createContext, useContext } from "react"

export type contextType =
  | {
      error: unknown
      loading: true
      userExists: boolean
      user:
        | {
            sub: string
            name: string
            role: "USER" | "VIP" | "ADMIN"
            iat: number
            exp: number
            createdAt: Date
            expiresAt: Date
          }
        | undefined
      jwt: string
    }
  | {
      error: unknown
      loading: false
      userExists: true
      user: {
        sub: string
        name: string
        role: "USER" | "VIP" | "ADMIN"
        iat: number
        exp: number
        createdAt: Date
        expiresAt: Date
      }
      jwt: string
    }
  | {
      error: unknown
      loading: false
      userExists: false
      user: undefined
      jwt: string
    }

export const contextDefaults = {
  error: null as unknown,
  loading: true,
  user: undefined,
  jwt: "",
  userExists: false,
} as contextType

export const UserContext = createContext(contextDefaults)

export const storageItemName = "s_token"

export const setUserToken = (jwt: string) => {
  localStorage.setItem(storageItemName, jwt)
  window.dispatchEvent(new Event("local-storage-changed"))
}

export const deleteUserToken = () => {
  localStorage.removeItem(storageItemName)
  window.dispatchEvent(new Event("local-storage-changed"))
}

export const getUserToken = () => {
  return localStorage.getItem(storageItemName) || ""
}

const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}

export default useUser
