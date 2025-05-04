import { useShape } from "@electric-sql/react"
import { IngredientType, type IngredientShape } from "../../types/ingredient"
import apiBaseUrl from "../../apiBaseUrl"
import { getUserToken } from "../../lib/useUser"
import {
  ActionIcon,
  Badge,
  Button,
  Flex,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core"
import ingredientTypeToEmoji from "../../lib/ingredientTypeToEmoji"
import {
  IconDeviceFloppy,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"
import { useCallback, useState } from "react"
import { useForm } from "@mantine/form"

const ingredientTypes = Object.values(IngredientType)

const IngredientsTab = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<"add" | "edit">("add")
  const [modalId, setModalId] = useState("")

  const { data: ingredients } = useShape<IngredientShape>({
    url: `${apiBaseUrl()}/sync`,
    params: {
      table: '"Ingredient"',
    },
    headers: {
      Authorization: `Bearer ${getUserToken()}`,
    },
  })

  const form = useForm({
    initialValues: {
      name: "",
      type: "BREAD",
      enabled: true,
    },
    validate: {
      name: (value) => (value.length ? null : "Kann nicht leer sein"),
      type: (value) =>
        ingredientTypes.findIndex((item) => item === value) !== -1
          ? null
          : "Muss ein gültiger Typ sein",
    },
  })

  const openModal = (id = "") => {
    if (id.length) {
      const ingredient = ingredients.filter((item) => item.id === id)[0]
      if (!ingredient) return

      form.setValues({
        name: ingredient.name,
        enabled: ingredient.enabled,
        type: ingredient.type,
      })
      setModalType("edit")
      setModalId(id)
      setModalOpen(true)
    } else {
      form.reset()
      setModalType("add")
      setModalId("")
      setModalOpen(true)
    }
  }

  const submitForm = useCallback(
    async (values: { name: string; type: string; enabled: boolean }) => {
      if (modalType === "add") {
        await fetch(`${apiBaseUrl()}/ingredient/add`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getUserToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        })
        setModalOpen(false)
        form.reset()
      } else {
        await fetch(`${apiBaseUrl()}/ingredient/modify/${modalId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${getUserToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        })
        setModalOpen(false)
        form.reset()
      }
    },
    [form, modalId, modalType],
  )

  const deleteIngredient = useCallback(
    async (id: string) => {
      if (ingredients.findIndex((item) => item.id === id) === -1) return
      await fetch(`${apiBaseUrl()}/ingredient/delete/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getUserToken()}`,
        },
      })
    },
    [ingredients],
  )

  return (
    <>
      <Stack>
        {ingredients.map((ingredient) => (
          <Paper py="xs" px="md" key={ingredient.id}>
            <Flex
              justify="space-between"
              align="center"
              direction={{ base: "column", sm: "row" }}
              gap="md"
              wrap="nowrap"
            >
              <Group gap="xs">
                <Text size="xl" fw="bold" lineClamp={1}>
                  {ingredientTypeToEmoji(ingredient.type)} {ingredient.name}
                </Text>
                {!ingredient.enabled ? (
                  <Badge color="gray">Deaktiviert</Badge>
                ) : null}
              </Group>
              <Group>
                <ActionIcon onClick={() => openModal(ingredient.id)}>
                  <IconPencil size={14} />
                </ActionIcon>
                <ActionIcon
                  color="red"
                  onClick={() => deleteIngredient(ingredient.id)}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Flex>
          </Paper>
        ))}
        <Button
          leftSection={<IconPlus />}
          variant="default"
          w="max-content"
          mx="auto"
          onClick={() => openModal()}
        >
          Zutat hinzufügen
        </Button>
      </Stack>
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Zutat ${modalType === "add" ? "hinzufügen" : "bearbeiten"}`}
        size="lg"
      >
        <form onSubmit={form.onSubmit(submitForm)}>
          <Stack>
            <TextInput
              label="Name"
              placeholder="Toastbrot"
              {...form.getInputProps("name")}
            />
            <Select
              data={[
                { value: "BREAD", label: "Brot" },
                { value: "CHEESE", label: "Käse" },
                { value: "MEAT", label: "Fleisch" },
                { value: "SPECIAL", label: "Spezial" },
              ]}
              label="Zutatentyp"
              checkIconPosition="right"
              {...form.getInputProps("type")}
            />
            <Switch
              label="Zutat aktiviert"
              {...form.getInputProps("enabled", { type: "checkbox" })}
            />
            <Button type="submit" leftSection={<IconDeviceFloppy size={14} />}>
              Speichern
            </Button>
          </Stack>
        </form>
      </Modal>
    </>
  )
}

export default IngredientsTab
