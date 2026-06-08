import { useQuery } from '@tanstack/react-query'
import api from '../services/api.js'

export function useAxiosQuery(key, path) {
  return useQuery(key, async () => {
    const { data } = await api.get(path)
    return data
  })
}
