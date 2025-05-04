import { createTheme, MantineProvider } from "@mantine/core"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createHashRouter, Navigate, RouterProvider } from "react-router-dom"
import "@mantine/core/styles.css"
import LoginPage from "./pages/login"
import AppShell from "./components/AppShell"
import ConfigProvider from "./lib/ConfigProvider"
import UserProvider from "./lib/UserProvider"
import OrderPage from "./pages/order"
import UpgradeVipPage from "./pages/upgrade-vip"
import UpgradeAdminPage from "./pages/upgrade-admin"
import AdminPage from "./pages/admin"

const pages = [
  { path: "/login", jsx: <LoginPage /> },
  { path: "/order", jsx: <OrderPage /> },
  { path: "/upgrade-vip", jsx: <UpgradeVipPage /> },
  { path: "/upgrade-admin", jsx: <UpgradeAdminPage /> },
  { path: "/admin", jsx: <AdminPage /> },
]

const routes = pages.map((page) => ({
  path: page.path,
  element: <AppShell>{page.jsx}</AppShell>,
}))

const router = createHashRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  ...routes,
])

const theme = createTheme({
  defaultRadius: "md",
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="auto" theme={theme}>
      <ConfigProvider>
        <UserProvider>
          <RouterProvider router={router} />
        </UserProvider>
      </ConfigProvider>
    </MantineProvider>
  </StrictMode>,
)
