import { Box, Container, Tabs } from "@mantine/core"
import {
  IconLayoutKanban,
  IconList,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"
import IngredientsTab from "./admin/ingredients"
import OrdersTab from "./admin/orders"
import UsersTab from "./admin/users"
import SettingsTab from "./admin/settings"
import useUser from "../lib/useUser"

const AdminPage = () => {
  const user = useUser()

  if (user.user?.role !== "ADMIN" || user.loading) return <></>

  return (
    <Tabs defaultValue="orders" keepMounted={false}>
      <Tabs.List>
        <Tabs.Tab value="orders" leftSection={<IconLayoutKanban size={14} />}>
          Bestellungen
        </Tabs.Tab>
        <Tabs.Tab value="ingredients" leftSection={<IconList size={14} />}>
          Zutaten
        </Tabs.Tab>
        <Tabs.Tab value="users" leftSection={<IconUsers size={14} />}>
          User
        </Tabs.Tab>
        <Tabs.Tab
          value="settings"
          ml="auto"
          leftSection={<IconSettings size={14} />}
        >
          Einstellungen
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="orders">
        <Box px="md" py="xs">
          <OrdersTab />
        </Box>
      </Tabs.Panel>
      <Tabs.Panel value="ingredients">
        <Container py="xs">
          <IngredientsTab />
        </Container>
      </Tabs.Panel>
      <Tabs.Panel value="users">
        <Container py="xs">
          <UsersTab />
        </Container>
      </Tabs.Panel>
      <Tabs.Panel value="settings">
        <Container py="xs">
          <SettingsTab />
        </Container>
      </Tabs.Panel>
    </Tabs>
  )
}

export default AdminPage
