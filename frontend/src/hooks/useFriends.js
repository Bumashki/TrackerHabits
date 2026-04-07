import { useState, useEffect } from 'react'
import { getFriends, getFriendsFeed, cheerFriend } from '../api/friendsApi'

export function useFriends() {
  const [friends, setFriends] = useState([])
  const [feed, setFeed]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [f, a] = await Promise.all([getFriends(), getFriendsFeed()])
        setFriends(f)
        setFeed(a)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function cheer(friendId) {
    await cheerFriend(friendId)
    // После реального бэкенда можно обновить счётчик похвал в UI
  }

  return { friends, feed, loading, error, cheer }
}
