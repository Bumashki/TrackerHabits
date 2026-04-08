import { useState, useEffect, useCallback } from 'react'
import { getFriends, getFriendsFeed, cheerFriend } from '../api/friendsApi'

export function useFriends() {
  const [friends, setFriends] = useState([])
  const [feed, setFeed]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const cheer = useCallback(
    async friendId => {
      await cheerFriend(friendId)
      await load()
    },
    [load]
  )

  return { friends, feed, loading, error, cheer, refetch: load }
}
