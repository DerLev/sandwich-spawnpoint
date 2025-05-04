import { type PropsWithChildren, useCallback, useEffect, useState } from "react"
import {
  contextDefaults,
  contextType,
  storageItemName,
  UserContext,
} from "./useUser"
import apiBaseUrl from "../apiBaseUrl"

const UserProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState(contextDefaults.user)
  const [loading, setLoading] = useState(contextDefaults.loading)
  const [error, setError] = useState(contextDefaults.error)
  const [jwt, setJwt] = useState(contextDefaults.jwt)

  const validateToken = useCallback(async (jwt: string) => {
    setLoading(true)
    setError(null)

    try {
      if (jwt.length) {
        const res = await fetch(`${apiBaseUrl()}/user/me`, {
          method: "GET",
          headers: {
            Authorization: "Bearer " + jwt,
          },
        })

        if (res.ok) {
          const json = (await res.json()) as {
            sub: string
            name: string
            iat: number
            exp: number
            role: "USER" | "VIP" | "ADMIN"
            createdAt: string
            expiresAt: string
          }

          const newUser = {
            ...json,
            createdAt: new Date(json.createdAt),
            expiresAt: new Date(json.expiresAt),
          }

          setUser(newUser)
        } else {
          setUser(undefined)
          const error = await res.json()
          setError(error)
        }
      } else {
        setUser(undefined)
      }
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handleStorageChange = () => {
      const storageJwt = localStorage.getItem(storageItemName)
      setJwt(storageJwt ? storageJwt : "")
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("local-storage-changed", handleStorageChange)
    handleStorageChange()

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("local-storage-changed", handleStorageChange)
    }
  }, [])

  useEffect(() => {
    validateToken(jwt)
  }, [jwt, validateToken])

  const value = {
    user,
    loading,
    error,
    jwt,
    userExists: user !== undefined,
  } as contextType

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export default UserProvider
