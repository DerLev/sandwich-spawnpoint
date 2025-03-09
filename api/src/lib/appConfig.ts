import prisma from "./prismaInstance.js"

/**
 * @description The default app config
 */
const defaultConfig = [
  {
    key: "enabled",
    type: "BOOLEAN",
    value: "true",
  },
  {
    key: "allowOrders",
    type: "BOOLEAN",
    value: "false",
  },
] as const

/**
 * Check whether all config objects are present in the db
 * @description Creates missing objects and deletes ones that are not defined
 */
export const checkAppConfig = async () => {
  /* Get current config from DB */
  const configInDb = await prisma.config.findMany().catch((err) => {
    throw err
  })

  /* Delete unnecessarry config rows */
  const deleteActions = configInDb
    .map((row) => {
      if (
        defaultConfig.findIndex(
          (configObject) => configObject.key === row.key,
        ) < 0
      ) {
        return prisma.config.delete({ where: { id: row.id } })
      }
    })
    .filter((item) => item !== undefined)

  await Promise.all(deleteActions).catch((err) => {
    throw err
  })

  /* create config rows their default values */
  const createActions = defaultConfig
    .map((configObject) => {
      if (configInDb.findIndex((row) => row.key === configObject.key) < 0) {
        return prisma.config.create({
          data: {
            key: configObject.key,
            type: configObject.type,
            value: configObject.value,
          },
        })
      }
    })
    .filter((item) => item !== undefined)

  await Promise.all(createActions)
}

type ConfigTypeMap = {
  STRING: string
  NUMBER: number
  BOOLEAN: boolean
}

/* Some TS magic made by claude.ai */
type ConfigObject = {
  [K in (typeof defaultConfig)[number]["key"]]: Extract<
    (typeof defaultConfig)[number],
    { key: K }
  >["type"] extends keyof ConfigTypeMap
    ? ConfigTypeMap[Extract<(typeof defaultConfig)[number], { key: K }>["type"]]
    : never
}

/**
 * Get the app config from the DB
 * @description NOTE: This fetches from the DB every time. This will need to be cached if app grows
 * @returns App config
 */
export const getConfig = async () => {
  /* Get config from DB */
  const Config = await prisma.config.findMany()

  /* Cast config values into the right types */
  const castConfig = Config.map((row) => {
    if (row.type === "BOOLEAN") {
      if (row.value === "true" || row.value === "True") {
        return { ...row, value: true }
      } else {
        return { ...row, value: false }
      }
    } else if (row.type === "NUMBER") {
      return { ...row, value: Number(row.value) }
    } else {
      return row
    }
  })

  /* Convert array into object */
  const resObject: { [key: string]: string | boolean | number } = {}
  castConfig.forEach((row) => {
    resObject[row.key] = row.value
  })

  return resObject as ConfigObject
}

/**
 * Update a config entry
 * @param setting The setting to edit
 * @param value The new value of the setting
 */
export const updateConfig = async <K extends keyof ConfigObject>(
  setting: K,
  value: ConfigObject[K],
) => {
  await prisma.config.update({
    where: {
      key: setting,
    },

    data: {
      value: String(value),
    },
  })
}
