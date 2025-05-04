import { useRef } from "react"

const useRandomName = () => {
  const nameIndex = useRef<number>(null)

  const nameList = [
    "Max",
    "Josef",
    "Karl",
    "Heinrich",
    "Peter",
    "Paul",
    "Helga",
    "Emma",
    "Maria",
    "Ursula",
  ]

  if (nameIndex.current === null) {
    nameIndex.current = Math.floor(Math.random() * nameList.length)
    return nameList[nameIndex.current]
  } else {
    return nameList[nameIndex.current]
  }
}

export default useRandomName
