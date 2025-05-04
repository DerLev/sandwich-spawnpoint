import {
  AppShellHeader,
  AppShellMain,
  Avatar,
  Group,
  AppShell as MAppShell,
  Menu,
  Text,
  Title,
  UnstyledButton,
  useComputedColorScheme,
  useMantineTheme,
} from "@mantine/core"
import { type PropsWithChildren } from "react"
import { Link, Navigate, useLocation } from "react-router-dom"
import useAppConfig from "../lib/useAppConfig"
import useUser, { deleteUserToken } from "../lib/useUser"
import { useMediaQuery } from "@mantine/hooks"
import {
  IconLogout,
  IconSettings,
  IconUser,
  IconUserCog,
  IconUserStar,
} from "@tabler/icons-react"

const MainRouterWrapper = ({ children }: PropsWithChildren) => {
  const location = useLocation()
  const user = useUser()

  if (location.pathname === "/login") return children

  if (!user.userExists && !user.loading) return <Navigate to="/login" replace />

  return children
}

const AppShell = ({ children }: PropsWithChildren) => {
  const appConfig = useAppConfig()

  const computedColorScheme = useComputedColorScheme()

  const location = useLocation()

  const theme = useMantineTheme()
  const mediaQuery = useMediaQuery(`(min-width: ${theme.breakpoints.sm})`)

  const user = useUser()

  return (
    <MAppShell
      padding={"md"}
      header={{ height: 60 }}
      styles={(theme) => ({
        main: {
          backgroundColor:
            computedColorScheme === "light"
              ? theme.colors.gray[0]
              : theme.colors.dark[8],
          position: "relative",
          display: "grid",
        },
        header: {
          backgroundColor:
            computedColorScheme === "light" ? theme.colors.gray[1] : undefined,
        },
      })}
      transitionDuration={0}
      disabled={
        location.pathname === "/login" ||
        (!appConfig.config.enabled && !appConfig.initialLoad)
      }
    >
      <AppShellHeader px="md">
        <Group justify="space-between" h="100%" align="center">
          <Title size="h3">Sandwich Spawnpoint</Title>
          {user.userExists ? (
            <Menu shadow="md" width={220} position="bottom-end">
              <Menu.Target>
                <UnstyledButton>
                  <Group mr={mediaQuery ? "md" : 0}>
                    <Avatar
                      color={
                        user.user?.role === "ADMIN"
                          ? "blue"
                          : user.user?.role === "VIP"
                            ? "grape"
                            : undefined
                      }
                    />
                    <Text display={{ base: "none", sm: "block" }}>
                      {user.user?.name || "User"}
                    </Text>
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  {user.user?.name || "User"}
                  {user.user?.role !== "USER" ? ` – ${user.user?.role}` : null}
                </Menu.Label>
                {user.user?.role === "USER" ? (
                  <Menu.Item
                    leftSection={<IconUserStar size={14} />}
                    component={Link}
                    to="/upgrade-vip"
                  >
                    Upgrade auf VIP
                  </Menu.Item>
                ) : null}
                {user.user?.role !== "ADMIN" ? (
                  <Menu.Item
                    leftSection={<IconUserCog size={14} />}
                    component={Link}
                    to="/upgrade-admin"
                  >
                    Upgrade auf Admin
                  </Menu.Item>
                ) : null}
                {user.user?.role === "ADMIN" ? (
                  <>
                    <Menu.Item
                      leftSection={<IconUser size={14} />}
                      component={Link}
                      to="/order"
                    >
                      User Area
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconSettings size={14} />}
                      component={Link}
                      to="/admin"
                    >
                      Admin Area
                    </Menu.Item>
                  </>
                ) : null}
                <Menu.Item
                  leftSection={<IconLogout size={14} />}
                  color="red"
                  onClick={() => deleteUserToken()}
                >
                  Session beenden
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : null}
        </Group>
      </AppShellHeader>
      <AppShellMain>
        {!appConfig.config.enabled && !appConfig.initialLoad ? (
          <Title ta="center" size="h1">
            Die App ist im Moment deaktiviert!
          </Title>
        ) : (
          <MainRouterWrapper>{children}</MainRouterWrapper>
        )}
      </AppShellMain>
    </MAppShell>
  )
}

export default AppShell
