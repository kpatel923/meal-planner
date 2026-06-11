import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { serializePlan, deserializePlan } from '../lib/mealLogic'
import toast from 'react-hot-toast'

export function usePlans() {
  const { user } = useAuth()
  const [plans,   setPlans]   = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchPlans() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('saved_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setPlans(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchPlans() }, [user])

  async function savePlan(name, weeklyPlan) {
    const { data, error } = await supabase
      .from('saved_plans')
      .insert({
        user_id:  user.id,
        name,
        plan_json: serializePlan(weeklyPlan),
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to save plan')
      return { error }
    }
    setPlans(prev => [data, ...prev])
    toast.success(`"${name}" saved!`)
    return { data }
  }

  async function deletePlan(id) {
    const { error } = await supabase
      .from('saved_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      toast.error('Failed to delete plan')
      return { error }
    }
    setPlans(prev => prev.filter(p => p.id !== id))
    toast.success('Plan deleted')
    return {}
  }

  function loadPlan(plan) {
    return deserializePlan(plan.plan_json)
  }

  return { plans, loading, savePlan, deletePlan, loadPlan, refetch: fetchPlans }
}
