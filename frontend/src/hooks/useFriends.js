import { useState, useEffect, useCallback, useMemo } from 'react'
import { getFriendsOverview, cheerFriend } from '../api/friendsApi'

export function useFriends() {
  const [friends, setFriends]       = useState([])
  const [incoming, setIncoming]     = useState([])
  const [outgoing, setOutgoing]   = useState([])
  const [feed, setFeed]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [cheerAvailableAt, setCheerAvailableAt] = useState(null)
  const [lastCheeredFriendId, setLastCheeredFriendId] = useState(null)
  const [tick, setTick]             = useState(0)

  const load = useCallback(async (opts = {}) => {
    const silent = opts.silent === true
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const o = await getFriendsOverview()
      setFriends(o.friends ?? [])
      setFeed(o.feed ?? [])
      setIncoming(o.incoming ?? [])
      setOutgoing(o.outgoing ?? [])
      setCheerAvailableAt(o.cheerAvailableAt ?? null)
      setLastCheeredFriendId(o.lastCheeredFriendId ?? null)
    } catch (e) {
      setError(e.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!cheerAvailableAt) return
    const deadline = new Date(cheerAvailableAt).getTime()
    if (deadline <= Date.now()) return
    const id = setInterval(() => setTick((x) => x + 1), 3000)
    return () => clearInterval(id)
  }, [cheerAvailableAt])

  const canCheer = useMemo(() => {
    if (!cheerAvailableAt) return true
    return new Date(cheerAvailableAt).getTime() <= Date.now()
  }, [cheerAvailableAt, tick])

  const cheer = useCallback(
    async friendId => {
      try {
        await cheerFriend(friendId)
        await load({ silent: true })
      } catch (e) {
        setError(e.message)
      }
    },
    [load]
  )

  return {
    friends,
    incoming,
    outgoing,
    feed,
    loading,
    error,
    cheer,
    canCheer,
    cheerAvailableAt,
    lastCheeredFriendId,
    refetch: load,
  }
}
