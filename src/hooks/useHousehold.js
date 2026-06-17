import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { serializePlan, deserializePlan } from '../lib/mealLogic'
import toast from 'react-hot-toast'

export function useHousehold() {
  const { user } = useAuth()
  const [household,     setHousehold]     = useState(null)
  const [members,       setMembers]       = useState([])
  const [sharedPlans,   setSharedPlans]   = useState([])
  const [loading,       setLoading]       = useState(true)
  const [joining,       setJoining]       = useState(false)
  const [creating,      setCreating]      = useState(false)

  useEffect(() => { if (user) fetchHousehold() }, [user])

  async function fetchHousehold() {
    setLoading(true)
    // Find household this user belongs to
    const { data: memberRows } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!memberRows) { setLoading(false); return }

    const { data: hh } = await supabase
      .from('households')
      .select('*')
      .eq('id', memberRows.household_id)
      .single()

    if (!hh) { setLoading(false); return }
    setHousehold(hh)

    // Fetch members
    const { data: memberData } = await supabase
      .from('household_members')
      .select('*, profiles(username)')
      .eq('household_id', hh.id)
    setMembers(memberData || [])

    // Fetch shared plans
    const { data: plans } = await supabase
      .from('shared_plans')
      .select('*')
      .eq('household_id', hh.id)
      .order('created_at', { ascending: false })
    setSharedPlans(plans || [])

    setLoading(false)
  }

  async function createHousehold(name) {
    setCreating(true)
    const { data: hh, error } = await supabase
      .from('households')
      .insert({ name, owner_id: user.id })
      .select()
      .single()

    if (error) { toast.error('Failed to create household'); setCreating(false); return }

    // Add owner as member
    await supabase.from('household_members').insert({
      household_id: hh.id, user_id: user.id, role: 'owner'
    })

    setHousehold(hh)
    toast.success(`Household "${name}" created!`)
    setCreating(false)
    await fetchHousehold()
  }

  async function joinHousehold(inviteCode) {
    setJoining(true)
    const { data: hh, error } = await supabase
      .from('households')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase().trim())
      .single()

    if (error || !hh) { toast.error('Invalid invite code'); setJoining(false); return }

    const { error: joinErr } = await supabase
      .from('household_members')
      .insert({ household_id: hh.id, user_id: user.id, role: 'member' })

    if (joinErr) { toast.error('Could not join — you may already be a member'); setJoining(false); return }

    toast.success(`Joined "${hh.name}"!`)
    setJoining(false)
    await fetchHousehold()
  }

  async function leaveHousehold() {
    if (!household) return
    await supabase.from('household_members')
      .delete().eq('household_id', household.id).eq('user_id', user.id)
    setHousehold(null); setMembers([]); setSharedPlans([])
    toast.success('Left household')
  }

  async function shareWeeklyPlan(name, weeklyPlan) {
    if (!household) return
    const { data, error } = await supabase
      .from('shared_plans')
      .insert({ household_id: household.id, created_by: user.id, name, plan_json: serializePlan(weeklyPlan) })
      .select().single()
    if (error) { toast.error('Failed to share plan'); return }
    setSharedPlans(prev => [data, ...prev])
    toast.success(`"${name}" shared with your household!`)
  }

  function deserializeSharedPlan(plan) { return deserializePlan(plan.plan_json) }

  return {
    household, members, sharedPlans, loading, joining, creating,
    createHousehold, joinHousehold, leaveHousehold,
    shareWeeklyPlan, deserializeSharedPlan, refetch: fetchHousehold,
  }
}
