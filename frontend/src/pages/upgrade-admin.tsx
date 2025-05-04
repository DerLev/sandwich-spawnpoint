import {
  Button,
  Card,
  Container,
  Notification,
  PasswordInput,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core"
import {
  IconArrowLeft,
  IconArrowRight,
  IconExclamationMark,
} from "@tabler/icons-react"
import { useCallback, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import useUser, { getUserToken, setUserToken } from "../lib/useUser"
import apiBaseUrl from "../apiBaseUrl"
import { useForm } from "@mantine/form"

const UpgradeAdminPage = () => {
  const user = useUser()

  const [error, setError] = useState("")
  const [formLoading, setFormLoading] = useState(false)

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      password: "",
    },
  })

  const upgradeToAdmin = useCallback(async (password: string) => {
    setFormLoading(true)

    const res = await fetch(`${apiBaseUrl()}/user/upgrade/admin`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getUserToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    }).then((res) => res.json())

    if (res.token) {
      setUserToken(res.token)
    } else {
      setError(res.message)
    }

    setFormLoading(false)
  }, [])

  if (user.user?.role === "ADMIN") return <Navigate to="/order" replace />

  return (
    <Container maw={420} w={"100%"}>
      <Skeleton visible={user.loading}>
        <Button
          leftSection={<IconArrowLeft size={14} />}
          mb="xs"
          variant="transparent"
          component={Link}
          to="/order"
        >
          Zurück
        </Button>
        <Card radius="md" padding="lg" shadow="sm">
          <Text size="lg" fw={600} mb={2}>
            ⚙️ Upgrade auf Admin
          </Text>
          <Text>Bitte gib das Admin-Passwort ein</Text>
          <form
            onSubmit={form.onSubmit((values) =>
              upgradeToAdmin(values.password),
            )}
          >
            <Stack mt="lg">
              <PasswordInput
                placeholder="Passwort"
                disabled={formLoading}
                {...form.getInputProps("password")}
              />
              <Button
                type="submit"
                rightSection={<IconArrowRight size={14} />}
                loading={formLoading}
              >
                Als Admin einloggen
              </Button>
            </Stack>
          </form>
          {error.length ? (
            <Notification
              withBorder
              withCloseButton={false}
              color="red"
              mt="md"
              title="Es ist ein Fehler aufgetreten"
              icon={<IconExclamationMark size={20} />}
            >
              {error}
            </Notification>
          ) : null}
        </Card>
      </Skeleton>
    </Container>
  )
}

export default UpgradeAdminPage
