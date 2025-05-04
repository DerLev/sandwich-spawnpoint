import { useShape } from "@electric-sql/react"
import apiBaseUrl from "../apiBaseUrl"
import useUser, { getUserToken } from "../lib/useUser"
import { useCallback, useEffect, useState } from "react"
import type { OrderList, OrderNew, OrdersShape } from "../types/order"
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Notification,
  Paper,
  SegmentedControl,
  SegmentedControlItem,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core"
import { IconBasketPlus, IconBasketX, IconInfoSmall } from "@tabler/icons-react"
import ingredientTypeToEmoji from "../lib/ingredientTypeToEmoji"
import type { IngredientShape } from "../types/ingredient"
import useAppConfig from "../lib/useAppConfig"

const breadNumbers: SegmentedControlItem[] = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "2", label: "2", disabled: true },
]

const OrderPage = () => {
  const appConfig = useAppConfig()
  const user = useUser()

  const [orders, setOrders] = useState<OrderList>([])
  const [newOrderIngredients, setNewOrderIngredients] = useState<string[]>([])
  const [newOrderInSubmission, setNewOrderInSubmission] = useState(false)

  const { data: shapeOrders } = useShape<OrdersShape>({
    url: `${apiBaseUrl()}/sync`,
    params: {
      table: '"Order"',
      where: `"userId"='${user.user?.sub}'`,
    },
    headers: {
      Authorization: `Bearer ${getUserToken()}`,
    },
  })

  const { data: ingredients } = useShape<IngredientShape>({
    url: `${apiBaseUrl()}/sync`,
    params: {
      table: '"Ingredient"',
      where: `enabled=true`,
    },
    headers: {
      Authorization: `Bearer ${getUserToken()}`,
    },
  })

  const fetchOrders = useCallback(async () => {
    const res: OrderList = await fetch(
      `${apiBaseUrl()}/order/list?uid=${user.user?.sub}`,
      {
        headers: {
          Authorization: `Bearer ${getUserToken()}`,
        },
      },
    ).then((res) => res.json())

    setOrders(res)
  }, [user.user?.sub])

  const missingFromFetched = shapeOrders
    .filter((item) => item.userId === user.user?.sub)
    .filter((order) => orders.findIndex((item) => item.id === order.id) === -1)

  const cancelOrder = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${apiBaseUrl()}/order/delete/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getUserToken()}`,
        },
      })

      /* Optimistic updates */
      if (res.ok) {
        setOrders((prev) => prev.filter((item) => item.id !== id))
      }

      return res.ok
    } catch (err) {
      console.error(err)
      return false
    }
  }, [])

  const modifyNewOrderIngredients = (id: string, amount: number) => {
    const itemArray = Array.from({ length: amount }, () => id)

    const filteredOrder = newOrderIngredients.filter((item) => item !== id)

    setNewOrderIngredients([...filteredOrder, ...itemArray])
  }

  const createNewOrder = useCallback(async () => {
    setNewOrderInSubmission(true)

    const filteredOrder = newOrderIngredients.filter(
      (ingredient) =>
        ingredients.findIndex((item) => item.id === ingredient) !== -1,
    )

    try {
      const res = await fetch(`${apiBaseUrl()}/order/new`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getUserToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingredients: filteredOrder }),
      })

      if (res.ok) {
        /* Optimisitic updates */
        const body: OrderNew = await res.json()
        const ingredientsArray = ingredients
          .map((item) => ({
            ingredientNumber: filteredOrder.filter((id) => id === item.id)
              .length,
            ingredient: item,
          }))
          .filter((item) => item.ingredientNumber > 0)
        setOrders((prev) => [
          ...prev,
          { ...body, ingredients: ingredientsArray },
        ])

        setNewOrderIngredients([])
        return true
      } else {
        return false
      }
    } catch (err) {
      console.error(err)
      return false
    } finally {
      setNewOrderInSubmission(false)
    }
  }, [ingredients, newOrderIngredients])

  useEffect(() => {
    if (missingFromFetched.length || shapeOrders.length !== orders.length) {
      fetchOrders()
    }
  }, [
    fetchOrders,
    missingFromFetched.length,
    orders.length,
    shapeOrders.length,
  ])

  return (
    <Grid>
      <Grid.Col span={{ base: 12, sm: 6, md: 7 }}>
        <Stack mb="xl">
          {orders.map((order) => {
            const cancelAllowed = order.status === "INQUEUE"

            return (
              <Card padding="xs" px="sm" key={order.id}>
                <Flex
                  justify="space-between"
                  align="center"
                  direction={{ base: "column", sm: "row" }}
                  gap="md"
                >
                  <Box w={"100%"}>
                    {(() => {
                      switch (order.status) {
                        case "INQUEUE":
                          return (
                            <Badge radius="md" color="blue">
                              In der Warteschlange
                            </Badge>
                          )
                        case "BEINGMADE":
                          return (
                            <Badge radius="md" color="teal">
                              In Bearbeitung
                            </Badge>
                          )
                        case "DONE":
                          return (
                            <Badge radius="md" color="green">
                              Fertig
                            </Badge>
                          )
                      }
                    })()}
                    <Box ml="xs" mt="xs">
                      <Text fw="bold">Zutaten</Text>
                      <Box ml="xs">
                        {order.ingredients.map((ingredient, index) => (
                          <Text key={index}>
                            {ingredient.ingredientNumber}&times;{" "}
                            {ingredientTypeToEmoji(ingredient.ingredient.type)}{" "}
                            {ingredient.ingredient.name}
                          </Text>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                  <Box>
                    <Tooltip
                      label="Bestellungen können nur storniert werden, wenn sie in der Warteschlange sind"
                      multiline
                      w={220}
                      position="bottom"
                      events={{
                        focus: !cancelAllowed,
                        hover: !cancelAllowed,
                        touch: !cancelAllowed,
                      }}
                    >
                      <Button
                        variant="subtle"
                        color="red"
                        leftSection={<IconBasketX size={14} />}
                        disabled={!cancelAllowed}
                        onClick={() => cancelOrder(order.id)}
                      >
                        Stornieren
                      </Button>
                    </Tooltip>
                  </Box>
                </Flex>
              </Card>
            )
          })}
          {!orders.length ? (
            <Text ta="center" fs="italic">
              Du hast keine Bestellungen
            </Text>
          ) : null}
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 5 }}>
        <Stack mb="xl">
          {ingredients.map((ingredient) => {
            const count = newOrderIngredients.filter(
              (item) => item === ingredient.id,
            ).length

            return (
              <Paper py="xs" px="md" key={ingredient.id}>
                <Flex
                  justify="space-between"
                  align="center"
                  direction={{ base: "column", sm: "row" }}
                  gap="md"
                  wrap="nowrap"
                >
                  <Text size="xl" fw="bold" lineClamp={1}>
                    {ingredientTypeToEmoji(ingredient.type)} {ingredient.name}
                  </Text>
                  <Box w="100%" maw={120}>
                    <SegmentedControl
                      data={
                        ingredient.type === "BREAD"
                          ? breadNumbers
                          : ["0", "1", "2"]
                      }
                      fullWidth
                      withItemsBorders={false}
                      value={count.toString()}
                      onChange={(e) =>
                        modifyNewOrderIngredients(ingredient.id, Number(e))
                      }
                    />
                  </Box>
                </Flex>
              </Paper>
            )
          })}
          <Button
            variant="light"
            leftSection={<IconBasketPlus size={14} />}
            mt="md"
            disabled={
              !newOrderIngredients.length || !appConfig.config.allowOrders
            }
            onClick={() => createNewOrder()}
            loading={newOrderInSubmission}
          >
            Bestellung aufgeben
          </Button>
          {!appConfig.config.allowOrders ? (
            <Notification
              withCloseButton={false}
              color="blue"
              mt="md"
              title="Bestellungen sind im Moment ausgeschaltet"
              icon={<IconInfoSmall size={28} />}
            />
          ) : null}
        </Stack>
      </Grid.Col>
    </Grid>
  )
}

export default OrderPage
