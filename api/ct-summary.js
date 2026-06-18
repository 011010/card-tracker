import { createClient } from '@supabase/supabase-js'

const HUBE_API_KEY = process.env.HUBE_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function purchaseMonthly(p) {
  return Number(p.amount) / Math.max(1, Number(p.months))
}

function purchaseRemainingMonths(p) {
  return Math.max(0, Number(p.months) - Number(p.months_paid))
}

function round2(n) {
  return Math.round(n * 100) / 100
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.HUBE_ORIGIN || '*')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!HUBE_API_KEY || req.headers['x-hube-key'] !== HUBE_API_KEY) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'supabase not configured' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const [cardsRes, purchasesRes] = await Promise.all([
    supabase.from('cards').select('id,alias,bank,last4,pay_date,limit_amount'),
    supabase.from('purchases').select('card_id,amount,months,months_paid'),
  ])

  if (cardsRes.error || purchasesRes.error) {
    return res.status(500).json({ error: 'failed to fetch data' })
  }

  // group purchases by card
  const byCard = {}
  for (const p of purchasesRes.data) {
    ;(byCard[p.card_id] ||= []).push(p)
  }

  const cards = cardsRes.data.map((card) => {
    const purchases = (byCard[card.id] || []).filter((p) => purchaseRemainingMonths(p) > 0)
    const estimated_payment = purchases.reduce((s, p) => s + purchaseMonthly(p), 0)
    const balance = purchases.reduce((s, p) => s + purchaseMonthly(p) * purchaseRemainingMonths(p), 0)
    return {
      id: card.id,
      alias: card.alias,
      bank: card.bank,
      last4: card.last4 || '',
      pay_date: card.pay_date,
      limit: round2(Number(card.limit_amount) || 0),
      estimated_payment: round2(estimated_payment),
      balance: round2(balance),
    }
  }).sort((a, b) => a.pay_date.localeCompare(b.pay_date))

  const total_debt = round2(cards.reduce((s, c) => s + c.balance, 0))
  const total_payment = round2(cards.reduce((s, c) => s + c.estimated_payment, 0))
  const next_pay_date = cards.find((c) => c.estimated_payment > 0)?.pay_date ?? null

  return res.status(200).json({
    total_debt,
    total_payment,
    next_pay_date,
    cards,
  })
}
