import {
  ActionIcon,
  Badge,
  Box,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core"
import { IconArrowLeft, IconArrowRight, IconTrash } from "@tabler/icons-react"
import ingredientTypeToEmoji from "../../lib/ingredientTypeToEmoji"
import type {
  IngredientOnOrderShape,
  IngredientShape,
  IngredientType,
} from "../../types/ingredient"
import { useShape } from "@electric-sql/react"
import apiBaseUrl from "../../apiBaseUrl"
import { getUserToken } from "../../lib/useUser"
import type { UsersShape } from "../../types/user"
import type { OrdersShape } from "../../types/order"
import { useCallback } from "react"

const OrderItem = ({
  username,
  ingredients,
  timestamp,
  column,
  moveLeft,
  moveRight,
  deleteItem,
}: {
  username: string
  ingredients: { amount: number; name: string; type: `${IngredientType}` }[]
  timestamp: string
  column: "queue" | "cooking" | "done"
  moveLeft: () => void
  moveRight: () => void
  deleteItem: () => void
}) => (
  <Paper py="xs" px="md">
    <Group justify="space-between" align="flex-start">
      <Box>
        <Text size="lg" fw={800}>
          {username}
        </Text>
        <Box mt={6}>
          <Text size="sm" fw="bold">
            Zutaten
          </Text>
          <Box ml="xs">
            {ingredients.map((item, index) => (
              <Text key={index}>
                {item.amount}&times; {ingredientTypeToEmoji(item.type)}{" "}
                {item.name}
              </Text>
            ))}
          </Box>
        </Box>
        <Text size="xs" fs="italic" mt={4}>
          {timestamp}
        </Text>
      </Box>
      <Stack gap="xs">
        <ActionIcon disabled={column === "queue"} onClick={() => moveLeft()}>
          <IconArrowLeft size={14} />
        </ActionIcon>
        <ActionIcon disabled={column === "done"} onClick={() => moveRight()}>
          <IconArrowRight size={14} />
        </ActionIcon>
        <ActionIcon color="red" onClick={() => deleteItem()}>
          <IconTrash size={14} />
        </ActionIcon>
      </Stack>
    </Group>
  </Paper>
)

const OrdersTab = () => {
  const { data: ingredients } = useShape<IngredientShape>({
    url: `${apiBaseUrl()}/sync`,
    params: {
      table: '"Ingredient"',
    },
    headers: {
      Authorization: `Bearer ${getUserToken()}`,
    },
  })

  const { data: ingredientsOnOrders } = useShape<IngredientOnOrderShape>({
    url: `${apiBaseUrl()}/sync`,
    params: {
      table: '"IngredientOnOrder"',
    },
    headers: {
      Authorization: `Bearer ${getUserToken()}`,
    },
  })

  const { data: orders } = useShape<OrdersShape>({
    url: `${apiBaseUrl()}/sync`,
    params: {
      table: '"Order"',
    },
    headers: {
      Authorization: `Bearer ${getUserToken()}`,
    },
  })

  const { data: users } = useShape<UsersShape>({
    url: `${apiBaseUrl()}/sync`,
    params: {
      table: '"User"',
    },
    headers: {
      Authorization: `Bearer ${getUserToken()}`,
    },
  })

  const moveToQueue = useCallback(
    async (id: string) => {
      if (orders.findIndex((item) => item.id === id) === -1) return
      await fetch(`${apiBaseUrl()}/order/modify/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getUserToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "INQUEUE" }),
      })
    },
    [orders],
  )

  const moveToCooking = useCallback(
    async (id: string) => {
      if (orders.findIndex((item) => item.id === id) === -1) return
      await fetch(`${apiBaseUrl()}/order/modify/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getUserToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "BEINGMADE" }),
      })
    },
    [orders],
  )

  const moveToDone = useCallback(
    async (id: string) => {
      if (orders.findIndex((item) => item.id === id) === -1) return
      await fetch(`${apiBaseUrl()}/order/modify/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getUserToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "DONE" }),
      })
    },
    [orders],
  )

  const deleteOrder = useCallback(
    async (id: string) => {
      if (orders.findIndex((item) => item.id === id) === -1) return
      await fetch(`${apiBaseUrl()}/order/delete/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getUserToken()}`,
        },
      })
    },
    [orders],
  )

  const mergedData = orders.map((order) => {
    const orderIngredients = ingredientsOnOrders
      .map((item) => {
        if (item.orderId !== order.id) return
        const ingredient = ingredients.find(
          (element) => element.id === item.ingredientId,
        )
        if (!ingredient) return
        return {
          amount: item.ingredientNumber,
          name: ingredient.name,
          type: ingredient.type,
        }
      })
      .filter((item) => item !== undefined)

    const user = users.find((item) => item.id === order.userId)

    return {
      id: order.id,
      username: user?.name || order.userId,
      timestamp: order.createdAt,
      ingredients: orderIngredients,
      status: order.status,
    }
  })

  return (
    <Grid>
      <Grid.Col span={4}>
        <Badge color="blue">Warteschlange</Badge>
        <Stack mt="lg">
          {mergedData
            .filter((item) => item.status === "INQUEUE")
            .sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime(),
            )
            .map((order) => (
              <OrderItem
                key={order.id}
                {...order}
                column="queue"
                moveLeft={() => moveToDone(order.id)}
                moveRight={() => moveToCooking(order.id)}
                deleteItem={() => deleteOrder(order.id)}
              />
            ))}
          {!mergedData.filter((item) => item.status === "INQUEUE").length ? (
            <Text size="sm" fs="italic" ta="center">
              Keine Bestellungen in dieser Spalte
            </Text>
          ) : null}
        </Stack>
      </Grid.Col>
      <Grid.Col span={4}>
        <Badge color="teal">In Bearbeitung</Badge>
        <Stack mt="lg">
          {mergedData
            .filter((item) => item.status === "BEINGMADE")
            .map((order) => (
              <OrderItem
                key={order.id}
                {...order}
                column="cooking"
                moveLeft={() => moveToQueue(order.id)}
                moveRight={() => moveToDone(order.id)}
                deleteItem={() => deleteOrder(order.id)}
              />
            ))}
          {!mergedData.filter((item) => item.status === "BEINGMADE").length ? (
            <Text size="sm" fs="italic" ta="center">
              Keine Bestellungen in dieser Spalte
            </Text>
          ) : null}
        </Stack>
      </Grid.Col>
      <Grid.Col span={4}>
        <Badge color="green">Fertig</Badge>
        <Stack mt="lg">
          {mergedData
            .filter((item) => item.status === "DONE")
            .sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
            )
            .map((order) => (
              <OrderItem
                key={order.id}
                {...order}
                column="done"
                moveLeft={() => moveToCooking(order.id)}
                moveRight={() => moveToQueue(order.id)}
                deleteItem={() => deleteOrder(order.id)}
              />
            ))}
          {!mergedData.filter((item) => item.status === "DONE").length ? (
            <Text size="sm" fs="italic" ta="center">
              Keine Bestellungen in dieser Spalte
            </Text>
          ) : null}
        </Stack>
      </Grid.Col>
    </Grid>
  )
}

export default OrdersTab
