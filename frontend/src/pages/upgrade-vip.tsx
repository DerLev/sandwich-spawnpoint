import {
  Button,
  Card,
  Container,
  Notification,
  PinInput,
  Skeleton,
  Text,
} from "@mantine/core"
import { IconArrowLeft, IconExclamationMark } from "@tabler/icons-react"
import { useCallback, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import useUser, { getUserToken, setUserToken } from "../lib/useUser"
import apiBaseUrl from "../apiBaseUrl"

const UpgradeVipPage = () => {
  const user = useUser()

  const [error, setError] = useState("")

  const upgradeToVip = useCallback(async (pin: string) => {
    const res = await fetch(`${apiBaseUrl()}/user/upgrade/vip`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getUserToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ otp: pin }),
    }).then((res) => res.json())

    if (res.token) {
      setUserToken(res.token)
    } else {
      setError(res.message)
    }
  }, [])

  if (user.user?.role !== "USER") return <Navigate to="/order" replace />

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
            ✨ Upgrade auf VIP
          </Text>
          <Text>Bitte gib einen VIP code ein</Text>
          <PinInput
            length={6}
            type="number"
            mx="auto"
            mt="lg"
            error={!!error.length}
            onComplete={upgradeToVip}
          />
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

export default UpgradeVipPage
