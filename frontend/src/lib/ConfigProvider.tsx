import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react"
import { AppConfig, ConfigContext, contextDefaults } from "./useAppConfig"
import apiBaseUrl from "../apiBaseUrl"

const ConfigProvider = ({ children }: PropsWithChildren) => {
  const [config, setConfig] = useState<AppConfig>(contextDefaults.config)
  const [loading, setLoading] = useState(contextDefaults.loading)
  const [error, setError] = useState<unknown>(contextDefaults.error)
  const [initialLoad, setInitialLoad] = useState(contextDefaults.initialLoad)

  const timerId = useRef<number>(undefined)

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBaseUrl()}/config/get`)
      const json = await res.json()
      setConfig(json)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()

    timerId.current = setInterval(fetchConfig, 60 * 1000)

    return () => clearInterval(timerId.current)
  }, [fetchConfig])

  const value = { config, loading, error, initialLoad }

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  )
}

export default ConfigProvider
