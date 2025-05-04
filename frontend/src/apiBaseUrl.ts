const apiBaseUrl =
  import.meta.env.MODE === "development"
    ? () => "http://localhost:3000/api"
    : () => `${window.location.origin}/api`

export default apiBaseUrl
