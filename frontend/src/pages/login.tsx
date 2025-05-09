import {
  Button,
  Card,
  Container,
  Notification,
  Skeleton,
  Stack,
  Text,
  TextInput,
} from "@mantine/core"
import { useForm } from "@mantine/form"
import { IconArrowRight, IconExclamationMark } from "@tabler/icons-react"
import useAppConfig from "../lib/useAppConfig"
import useRandomName from "../lib/useRandomName"
import useUser, { setUserToken } from "../lib/useUser"
import { Navigate } from "react-router-dom"
import { useCallback, useState } from "react"
import apiBaseUrl from "../apiBaseUrl"

const LoginPage = () => {
  const appConfig = useAppConfig()

  const { loading, userExists } = useUser()

  const randomExampleName = useRandomName()

  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<undefined | string>(undefined)

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      name: "",
    },
    validate: {
      name: (value) =>
        value.length
          ? value.length <= 48
            ? null
            : "Darf nicht länger als 48 Zeichen sein"
          : "Darf nicht leer sein",
    },
  })

  const createUser = useCallback(async (values: { name: string }) => {
    setFormLoading(true)
    setFormError(undefined)

    try {
      const res = await fetch(`${apiBaseUrl()}/user/new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: values.name }),
      })

      if (res.ok) {
        const json = (await res.json()) as {
          name: string
          id: string
          role: "USER" | "VIP" | "ADMIN"
          createdAt: string
          token: string
          expiresIn: number
        }
        setUserToken(json.token)
        /* Rest is done in useUser and UserProvider */
      } else {
        const json = (await res.json()) as { code: number; message: string }
        setFormError(json.message)
        setFormLoading(false)
      }
    } catch (error) {
      setFormError(JSON.stringify(error))
      setFormLoading(false)
    }
  }, [])

  if (userExists) return <Navigate to="/order" replace />

  return (
    <Container maw={420} w={"100%"}>
      <Skeleton visible={appConfig.initialLoad || loading}>
        <Card radius="md" padding="lg" shadow="sm">
          <Text size="lg" fw={600} mb={2}>
            Hallo 👋
          </Text>
          <Text>Wie heißt du denn?</Text>
          <form onSubmit={form.onSubmit((values) => createUser(values))}>
            <Stack mt="md">
              <TextInput
                placeholder={randomExampleName}
                disabled={formLoading}
                {...form.getInputProps("name")}
              />
              <Button
                fullWidth
                type="submit"
                rightSection={<IconArrowRight size={14} />}
                loading={formLoading}
              >
                Los geht's
              </Button>
            </Stack>
          </form>
          {formError ? (
            <Notification
              withBorder
              withCloseButton={false}
              color="red"
              mt="md"
              title="Es ist ein Fehler aufgetreten"
              icon={<IconExclamationMark size={20} />}
            >
              {formError}
            </Notification>
          ) : null}
        </Card>
      </Skeleton>
    </Container>
  )
}

export default LoginPage
