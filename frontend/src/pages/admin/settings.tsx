import { useCallback, useEffect, useState } from "react"
import apiBaseUrl from "../../apiBaseUrl"
import type { ConfigGet, ConfigShape } from "../../types/config"
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  Paper,
  PasswordInput,
  Stack,
  Switch,
  Table,
  Text,
} from "@mantine/core"
import {
  IconArrowRight,
  IconPassword,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"
import { useShape } from "@electric-sql/react"
import { getUserToken } from "../../lib/useUser"
import { useForm } from "@mantine/form"

const SettingsTab = () => {
  const [appEnabled, setAppEnabled] = useState(false)
  const [allowOrders, setAllowOrders] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordFormLoading, setPasswordFormLoading] = useState(false)

  const form = useForm({
    initialValues: {
      password: "",
      passwordRepeat: "",
    },
    validate: {
      password: (value) =>
        value.length >= 8
          ? null
          : "Das Passwort muss mindestens 8 Zeichen lang sein",
      passwordRepeat: (value, values) =>
        value === values.password ? null : "Muss identisch sein",
    },
  })

  const openClosePasswordModal = (open: boolean) => {
    form.reset()
    setPasswordModalOpen(open)
  }

  const fetchSettings = useCallback(async () => {
    const res: ConfigGet = await fetch(`${apiBaseUrl()}/config/get`, {}).then(
      (res) => res.json(),
    )

    if (typeof res.enabled === "boolean") {
      setAppEnabled(res.enabled)
      setAllowOrders(res.allowOrders)
    }
  }, [])

  const { data: vipCodes } = useShape<ConfigShape>({
    url: `${apiBaseUrl()}/sync`,
    params: {
      table: '"Config"',
      where: `key='vipOtps'`,
    },
    headers: {
      Authorization: `Bearer ${getUserToken()}`,
    },
  })

  const vipOtpCodes =
    vipCodes[0]?.value.split(",").filter((item) => item.length) || []

  const deleteVipOtpCode = useCallback(async (code: string) => {
    await fetch(`${apiBaseUrl()}/user/vip/delete`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getUserToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ otp: code }),
    })
  }, [])

  const createVipOtpCode = useCallback(async () => {
    await fetch(`${apiBaseUrl()}/user/vip/new`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getUserToken()}`,
      },
    })
  }, [])

  const toggleAllowOrders = useCallback(async () => {
    const res = await fetch(`${apiBaseUrl()}/config/modify`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${getUserToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ object: "allowOrders", value: !allowOrders }),
    })

    if (res.ok) {
      setAllowOrders((prev) => !prev)
    }
  }, [allowOrders])

  const updateAdminPassword = useCallback(
    async (password: string) => {
      setPasswordFormLoading(true)

      const res = await fetch(`${apiBaseUrl()}/config/modify`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getUserToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          object: "adminUpgradePassword",
          value: password,
        }),
      })

      if (res.ok) {
        openClosePasswordModal(false)
      }

      setPasswordFormLoading(false)
    },
    [allowOrders, openClosePasswordModal],
  )

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return (
    <>
      <Stack gap="lg">
        <Group justify="space-between">
          <Text>App aktiviert</Text>
          <Switch checked={appEnabled} disabled />
        </Group>
        <Group justify="space-between">
          <Box>
            <Text>Bestellungen erlauben</Text>
            <Text size="xs" fs="italic">
              Nutzern erlauben Bestellungen aufzugeben
            </Text>
          </Box>
          <Switch checked={allowOrders} onChange={() => toggleAllowOrders()} />
        </Group>
        <Group justify="space-between">
          <Text>Admin-Password ändern</Text>
          <Button
            rightSection={<IconArrowRight size={14} />}
            size="xs"
            onClick={() => openClosePasswordModal(true)}
          >
            Passwort ändern
          </Button>
        </Group>
        <Paper py="xs" px="md">
          <Text>VIP codes</Text>
          <Table mt="sm" tabularNums>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>OTP code</Table.Th>
                <Table.Th>Aktionen</Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {vipOtpCodes.map((item, index) => (
                <Table.Tr key={index}>
                  <Table.Td>{item}</Table.Td>
                  <Table.Td>
                    <ActionIcon
                      color="red"
                      onClick={() => deleteVipOtpCode(item)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Button
            leftSection={<IconPlus size={14} />}
            size="xs"
            variant="default"
            mt="xs"
            onClick={() => createVipOtpCode()}
          >
            Erstellen
          </Button>
        </Paper>
      </Stack>
      <Modal
        opened={passwordModalOpen}
        onClose={() => openClosePasswordModal(false)}
        title="Admin-Password ändern"
      >
        <form
          onSubmit={form.onSubmit((values) =>
            updateAdminPassword(values.password),
          )}
        >
          <Stack>
            <PasswordInput
              label="Neues Passwort"
              placeholder="Passwort"
              disabled={passwordFormLoading}
              {...form.getInputProps("password")}
            />
            <PasswordInput
              label="Neues Passwort wiederholen"
              placeholder="Passwort"
              disabled={passwordFormLoading}
              {...form.getInputProps("passwordRepeat")}
            />
            <Button
              type="submit"
              leftSection={<IconPassword size={14} />}
              loading={passwordFormLoading}
            >
              Passwort ändern
            </Button>
          </Stack>
        </form>
      </Modal>
    </>
  )
}

export default SettingsTab
