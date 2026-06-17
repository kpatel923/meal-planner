import { useState } from 'react'
import { useHousehold } from '../hooks/useHousehold'
import { usePlanStore } from '../hooks/usePlanStore'
import { useAuth } from '../hooks/useAuth'
import { DAYS, CATEGORIES, CATEGORY_ICONS } from '../lib/mealLogic'
import {
  Users, Plus, LogIn, Copy, Check, Share2,
  Loader2, Trash2, Eye, EyeOff, Crown, User, X
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function HouseholdPage() {
  const { user, profile } = useAuth()
  const { weeklyPlan } = usePlanStore()
  const {
    household, members, sharedPlans, loading, joining, creating,
    createHousehold, joinHousehold, leaveHousehold, shareWeeklyPlan, deserializeSharedPlan
  } = useHousehold()
  const { loadPlan } = usePlanStore()

  const [hhName,       setHhName]       = useState('')
  const [inviteCode,   setInviteCode]   = useState('')
  const [shareName,    setShareName]    = useState('')
  const [codeCopied,   setCodeCopied]   = useState(false)
  const [expandedPlan, setExpandedPlan] = useState(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [sharing,      setSharing]      = useState(false)

  async function copyInviteCode() {
    if (!household?.invite_code) return
    await navigator.clipboard.writeText(household.invite_code)
    setCodeCopied(true)
    toast.success('Invite code copied!')
    setTimeout(() => setCodeCopied(false), 3000)
  }

  async function handleSharePlan() {
    if (!weeklyPlan) { toast.error('Generate a plan first'); return }
    if (!shareName.trim()) { toast.error('Give this plan a name'); return }
    setSharing(true)
    await shareWeeklyPlan(shareName.trim(), weeklyPlan)
    setShareName('')
    setSharing(false)
  }

  function handleLoadSharedPlan(plan) {
    loadPlan(deserializeSharedPlan(plan))
    toast.success(`"${plan.name}" loaded into your Planner!`)
  }

  if (loading) return (
    <div className="page-container space-y-4 mt-8">
      {[...Array(3)].map((_,i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
    </div>
  )

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.35s ease', maxWidth: '720px' }}>

      <div className="mb-8">
        <span className="page-eyebrow">Household</span>
        <h1 className="section-title">Family & Friends</h1>
        <p style={{ color: 'var(--text-3)', fontSize: '15px', marginTop: '8px' }}>
          Share meal plans with your household — cook together, shop together.
        </p>
      </div>

      {/* ── No household yet ─────────────────────────────── */}
      {!household && (
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Create */}
          <div className="card p-6" style={{ animation: 'slideUp 0.4s ease 0.05s both' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(145deg,#27B872,#0B4529)', boxShadow: '0 4px 16px rgba(31,158,98,0.3)' }}>
              <Plus size={22} className="text-white" />
            </div>
            <h3 className="font-display font-semibold mb-1" style={{ fontSize: '18px', color: 'var(--text)', letterSpacing: '-0.03em' }}>
              Create a household
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px', lineHeight: '1.6' }}>
              Start a new household and invite your family or roommates to join with a code.
            </p>
            <input className="input mb-3" placeholder="Household name (e.g. The Smiths)"
              value={hhName} onChange={e => setHhName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && hhName.trim() && createHousehold(hhName)} />
            <button onClick={() => createHousehold(hhName)} disabled={creating || !hhName.trim()}
              className="btn-primary btn w-full">
              {creating ? <Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> : <Plus size={16} />}
              Create
            </button>
          </div>

          {/* Join */}
          <div className="card p-6" style={{ animation: 'slideUp 0.4s ease 0.1s both' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
              <LogIn size={22} style={{ color: 'var(--brand)' }} />
            </div>
            <h3 className="font-display font-semibold mb-1" style={{ fontSize: '18px', color: 'var(--text)', letterSpacing: '-0.03em' }}>
              Join a household
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px', lineHeight: '1.6' }}>
              Have an invite code? Enter it here to join your household and see shared plans.
            </p>
            <input className="input mb-3 font-mono" placeholder="INVITE CODE"
              value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
              maxLength={8} style={{ letterSpacing: '0.15em', fontSize: '16px' }}
              onKeyDown={e => e.key === 'Enter' && inviteCode.trim() && joinHousehold(inviteCode)} />
            <button onClick={() => joinHousehold(inviteCode)} disabled={joining || !inviteCode.trim()}
              className="btn-secondary btn w-full">
              {joining ? <Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> : <LogIn size={16} />}
              Join
            </button>
          </div>
        </div>
      )}

      {/* ── Active household ──────────────────────────────── */}
      {household && (
        <>
          {/* Household info card */}
          <div className="card p-6 mb-5" style={{ animation: 'slideUp 0.4s ease 0.05s both' }}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: 'linear-gradient(145deg,rgba(31,158,98,0.15),rgba(31,158,98,0.05))', border: '1.5px solid rgba(31,158,98,0.2)' }}>
                  🏠
                </div>
                <div>
                  <h3 className="font-display font-semibold" style={{ fontSize: '20px', color: 'var(--text)', letterSpacing: '-0.03em' }}>
                    {household.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Invite code */}
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Invite code</p>
                  <p className="font-mono font-bold" style={{ fontSize: '18px', color: 'var(--text)', letterSpacing: '0.12em' }}>
                    {household.invite_code}
                  </p>
                </div>
                <button onClick={copyInviteCode} className="p-2 rounded-xl transition-all hover:bg-[var(--surface)]"
                  style={{ color: codeCopied ? 'var(--brand)' : 'var(--text-3)' }}>
                  {codeCopied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Members list */}
            <div className="space-y-2 mb-4">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'var(--surface-2)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{ background: m.user_id === household.owner_id ? 'linear-gradient(145deg,#27B872,#167D4D)' : 'var(--border)', color: m.user_id === household.owner_id ? '#fff' : 'var(--text-3)' }}>
                    {(m.profiles?.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium" style={{ fontSize: '14px', color: 'var(--text)' }}>
                      {m.profiles?.username || 'Member'}
                      {m.user_id === user.id && <span style={{ fontSize: '11px', color: 'var(--text-3)', marginLeft: '6px' }}>(you)</span>}
                    </p>
                  </div>
                  {m.user_id === household.owner_id && (
                    <Crown size={14} style={{ color: '#F59E0B' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Leave */}
            {confirmLeave ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>Leave this household?</span>
                <button onClick={leaveHousehold} className="btn-danger btn-sm btn">Yes, leave</button>
                <button onClick={() => setConfirmLeave(false)} className="btn-secondary btn-sm btn">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmLeave(true)} className="btn-ghost btn-sm btn" style={{ color: '#D4502A' }}>
                Leave household
              </button>
            )}
          </div>

          {/* Share current plan */}
          <div className="card p-6 mb-5" style={{ animation: 'slideUp 0.4s ease 0.1s both' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(31,158,98,0.1)', border: '1px solid rgba(31,158,98,0.2)' }}>
                <Share2 size={18} style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <p className="font-semibold" style={{ fontSize: '16px', color: 'var(--text)' }}>Share this week's plan</p>
                <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>
                  {weeklyPlan ? 'Share your current plan with the household' : 'Generate a plan first to share it'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <input className="input flex-1" placeholder="Plan name (e.g. Week of June 15)"
                value={shareName} onChange={e => setShareName(e.target.value)}
                disabled={!weeklyPlan}
                onKeyDown={e => e.key === 'Enter' && handleSharePlan()} />
              <button onClick={handleSharePlan} disabled={sharing || !weeklyPlan || !shareName.trim()} className="btn-primary btn">
                {sharing ? <Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> : <Share2 size={16} />}
                Share
              </button>
            </div>
          </div>

          {/* Shared plans */}
          {sharedPlans.length > 0 && (
            <div style={{ animation: 'slideUp 0.4s ease 0.15s both' }}>
              <h2 className="font-display font-semibold mb-4" style={{ fontSize: '20px', color: 'var(--text)', letterSpacing: '-0.03em' }}>
                Shared plans ({sharedPlans.length})
              </h2>
              <div className="space-y-3">
                {sharedPlans.map((plan, idx) => {
                  const isExpanded = expandedPlan === plan.id
                  let parsed = null
                  if (isExpanded) {
                    try { parsed = typeof plan.plan_json === 'string' ? JSON.parse(plan.plan_json) : plan.plan_json } catch {}
                  }

                  return (
                    <div key={plan.id} className="card overflow-hidden" style={{ animation: `slideUp 0.4s ease ${idx*50}ms both` }}>
                      <div className="flex items-center gap-4 px-5 py-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold" style={{ fontSize: '15px', color: 'var(--text)' }}>{plan.name}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                            {new Date(plan.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setExpandedPlan(isExpanded ? null : plan.id)} className="btn-secondary btn-sm btn gap-1.5">
                            {isExpanded ? <EyeOff size={13} /> : <Eye size={13} />}
                            {isExpanded ? 'Collapse' : 'Preview'}
                          </button>
                          <button onClick={() => handleLoadSharedPlan(plan)} className="btn-primary btn-sm btn">
                            Load
                          </button>
                        </div>
                      </div>

                      {isExpanded && parsed && (
                        <div className="px-5 pb-4" style={{ borderTop: '1px solid var(--border)', animation: 'slideDown 0.25s ease' }}>
                          <div className="overflow-x-auto mt-3">
                            <table className="w-full" style={{ minWidth: '480px' }}>
                              <thead>
                                <tr>
                                  <th className="text-left pr-4 pb-2 w-20" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)' }}>Day</th>
                                  {CATEGORIES.map(cat => (
                                    <th key={cat} className="text-left pr-4 pb-2" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)' }}>
                                      {CATEGORY_ICONS[cat]} {cat}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {DAYS.map((day, di) => (
                                  <tr key={day} style={{ borderTop: '1px solid var(--border)' }}>
                                    <td className="py-2.5 pr-4 font-semibold" style={{ fontSize: '13px', color: 'var(--text-2)' }}>{day.slice(0,3)}</td>
                                    {CATEGORIES.map(cat => {
                                      const meal = parsed[di]?.[cat]
                                      return (
                                        <td key={cat} className="py-2.5 pr-4" style={{ fontSize: '13px', color: 'var(--text)' }}>
                                          {meal ? meal.item_name : <span style={{ color: 'var(--border)' }}>—</span>}
                                        </td>
                                      )
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
