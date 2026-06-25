import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import toast from 'react-hot-toast'

export function useMeals(filters = {}) {
  const { user } = useAuth()
  const [meals,   setMeals]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchMeals = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    let query = supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .order('category')
      .order('item_name')

    if (filters.diet_types && filters.diet_types.length > 0) {
      query = query.in('diet_type', filters.diet_types)
    }
    if (filters.category) {
      query = query.eq('category', filters.category)
    }
    if (filters.search) {
      query = query.ilike('item_name', `%${filters.search}%`)
    }

    const { data, error: err } = await query
    if (err) {
      setError(err.message)
    } else {
      setMeals(data || [])
    }
    setLoading(false)
  }, [user, JSON.stringify(filters)])

  useEffect(() => { fetchMeals() }, [fetchMeals])

  // ── CRUD ─────────────────────────────────────────────────────
  async function addMeal(mealData) {
    const { data, error } = await supabase
      .from('meals')
      .insert({ ...mealData, user_id: user.id })
      .select()
      .single()

    if (error) {
      toast.error('Failed to add meal')
      return { error }
    }
    setMeals(prev => [...prev, data].sort((a, b) => a.item_name.localeCompare(b.item_name)))
    toast.success(`${data.item_name} added!`)
    return { data }
  }

  async function updateMeal(id, updates) {
    const { data, error } = await supabase
      .from('meals')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      toast.error('Failed to update meal')
      return { error }
    }
    setMeals(prev => prev.map(m => m.id === id ? data : m))
    toast.success('Meal updated!')
    return { data }
  }

  async function toggleFavorite(id, current) {
    // optimistic update — favoriting should feel instant, no toast spam
    setMeals(prev => prev.map(m => m.id === id ? { ...m, is_favorite: !current } : m))
    const { error } = await supabase
      .from('meals')
      .update({ is_favorite: !current })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) {
      // revert on failure
      setMeals(prev => prev.map(m => m.id === id ? { ...m, is_favorite: current } : m))
      toast.error('Could not update favorite')
      return { error }
    }
    return {}
  }

  async function deleteMeal(id) {
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      toast.error('Failed to delete meal')
      return { error }
    }
    setMeals(prev => prev.filter(m => m.id !== id))
    toast.success('Meal removed')
    return {}
  }

  async function bulkAddMeals(mealsArray) {
    const rows = mealsArray.map(m => ({ ...m, user_id: user.id }))
    const { data, error } = await supabase
      .from('meals')
      .insert(rows)
      .select()

    if (error) {
      toast.error('Import failed: ' + error.message)
      return { error }
    }
    setMeals(prev => [...prev, ...data].sort((a, b) => a.item_name.localeCompare(b.item_name)))
    toast.success(`${data.length} meals imported!`)
    return { data }
  }

  async function deleteAllMeals() {
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      toast.error('Failed to delete meals')
      return { error }
    }
    setMeals([])
    toast.success('All recipes deleted')
    return {}
  }

  return { meals, loading, error, addMeal, updateMeal, deleteMeal, deleteAllMeals, toggleFavorite, bulkAddMeals, refetch: fetchMeals }
}
