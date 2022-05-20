const get = ({ key, isJSON = true }) => {
  const value = window.localStorage.getItem(key)
  return isJSON ? JSON.parse(value) : value
}

const set = ({ key, value, isJSON = true }) => {
  const stringifiedValue = isJSON ? JSON.stringify(value) : value
  window.localStorage.setItem(key, stringifiedValue)
  return { key, value, isJSON }
}

const localStorageHelper = {
  get,
  set
}

export default localStorageHelper