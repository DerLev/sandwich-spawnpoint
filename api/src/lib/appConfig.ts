import { hash, verify } from "argon2"
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
  {
    key: "adminUpgradePassword",
    type: "PASSWORD",
    value: "ChangeMe#1",
  },
  {
    key: "vipOtps",
    type: "VIPOTPS",
    value: "",
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

  /* Delete unnecessary config rows */
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

  /* Create password hashes if applicable */
  const hashedConfigPromises = defaultConfig.map(async (row) => {
    if (row.type === "PASSWORD") {
      return {
        ...row,
        value: await hash(row.value),
      }
    } else {
      return row
    }
  })

  const hashedConfig = await Promise.all(hashedConfigPromises)

  /* create config rows their default values */
  const createActions = hashedConfig
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
  PASSWORD: string
  VIPOTPS: string[]
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
 * @param stripSensitive Whether the function should strip sensitive data like otp codes
 * @returns App config
 */
export const getConfig = async (stripSensitive = false) => {
  /* Get config from DB */
  const Config = await prisma.config.findMany()

  /* Cast config values into the right types */
  const castConfig = Config.map((row) => {
    switch (row.type) {
      case "BOOLEAN":
        if (row.value === "true" || row.value === "True") {
          return { ...row, value: true }
        } else {
          return { ...row, value: false }
        }
      case "NUMBER":
        return { ...row, value: Number(row.value) }
      case "PASSWORD":
        return
      case "VIPOTPS":
        if (stripSensitive) {
          return
        } else {
          return {
            ...row,
            value: row.value.split(",").filter((item) => item.length),
          }
        }
      default:
        return row
    }
  }).filter((item) => item !== undefined)

  /* Convert array into object */
  const resObject: { [key: string]: string | boolean | number | string[] } = {}
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
  await prisma.config
    .update({
      where: {
        key: setting,
      },

      data: {
        value: String(value),
      },
    })
    .catch((err) => {
      throw new Error("Error when updating config object. Does it exist?", {
        cause: err,
      })
    })
}

type StringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never
}[keyof T]

/**
 * Validate a password from the app config
 * @param password The config object that will be checked against
 * @param value The password to be checked
 */
export const validateConfigPassword = async <
  K extends StringKeys<ConfigObject>,
>(
  password: K,
  value: string,
) => {
  const configRow = await prisma.config.findFirst({
    where: {
      key: password,
    },
  })

  if (!configRow) {
    throw new Error("This config object does not exist")
  }

  if (configRow.type !== "PASSWORD") {
    throw new Error("This config object is not of type password")
  }

  const isPasswordValid = await verify(configRow.value, value)

  return isPasswordValid
}

const generateOtp = () =>
  Math.floor(Number(Math.random().toFixed(6)) * 1000000).toString()

/**
 * Create an OTP code for upgrading accounts to vip
 * @returns A generated otp code for vip upgrading
 */
export const createVipOtp = async () => {
  const config = await getConfig()

  /* Array of the current OTP codes */
  const currentOtps = config.vipOtps

  /* The new OTP to be added to the array */
  let newOtp = ""
  /* Generate new ones until the generated one has 6 digits */
  while (newOtp.length !== 6) {
    newOtp = generateOtp()
  }
  currentOtps.push(newOtp)

  /* Update the row in db */
  await updateConfig("vipOtps", currentOtps)

  /* Return the code */
  return newOtp
}

/**
 * Check whether an VIP OTP is valid and delete it
 * @param otp The OTP to be checked
 * @returns Whether the OTP was in the db or not
 */
export const useVipOtp = async (otp: string) => {
  const config = await getConfig()

  /* Array of the current OTP codes */
  const currentOtps = config.vipOtps

  /* Filter out the requested OTP */
  const newOtps = currentOtps.filter((item) => item !== otp)

  /* If the code is not in the array */
  if (currentOtps.length === newOtps.length) {
    return false
  } else {
    /* Update the row in db */
    await updateConfig("vipOtps", newOtps)

    /* Return the code */
    return true
  }
}
