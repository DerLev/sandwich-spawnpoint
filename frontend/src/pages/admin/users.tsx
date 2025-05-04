import { useShape } from "@electric-sql/react"
import type { UsersShape } from "../../types/user"
import apiBaseUrl from "../../apiBaseUrl"
import { getUserToken } from "../../lib/useUser"
import { Box, Group, Paper, Stack, Text } from "@mantine/core"

const UsersTab = () => {
  const { data: users } = useShape<UsersShape>({
    url: `${apiBaseUrl()}/sync`,
    params: {
      table: '"User"',
    },
    headers: {
      Authorization: `Bearer ${getUserToken()}`,
    },
  })

  return (
    <Stack>
      {users.map((user) => (
        <Paper py="xs" px="md" key={user.id}>
          <Group justify="space-between">
            <Box>
              <Text fw="bold">{user.name}</Text>
              <Text>{user.role}</Text>
            </Box>
            <Box>
              <Text>{user.createdAt}</Text>
            </Box>
          </Group>
        </Paper>
      ))}
    </Stack>
  )
}

export default UsersTab
