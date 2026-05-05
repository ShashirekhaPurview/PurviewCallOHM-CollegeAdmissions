import { api } from '../client'

export function createBookDemoRequest(payload) {
  return api.post('/book-demo', payload)
}
