import { createContext, useContext } from "react"

export interface AppConfig {
  enabled: boolean
  allowOrders: boolean
}

export const contextDefaults = {
  config: {
    allowOrders: false,
    enabled: false,
  } as AppConfig,
  loading: true,
  error: null as unknown,
  initialLoad: true,
}

export const ConfigContext = createContext(contextDefaults)

const useAppConfig = () => {
  const context = useContext(ConfigContext)
  if (!context) {
    throw new Error("useAppConfig must be used within the ConfigProvider")
  }
  return context
}

export default useAppConfig
