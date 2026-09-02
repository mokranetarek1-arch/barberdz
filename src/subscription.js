export const SUBSCRIPTION_PLANS = [
  { id: 'month', label: '1 mois', duration: '1 mois', months: 1, amount: 1500 },
  { id: 'quarter', label: '3 mois', duration: '3 mois', months: 3, amount: 4000 },
  { id: 'half-year', label: '6 mois', duration: '6 mois', months: 6, amount: 7000 },
  { id: 'year', label: '1 an', duration: '1 an', months: 12, amount: 12000 },
]

export const formatSubscriptionAmount = (amount) => `${new Intl.NumberFormat('fr-DZ').format(amount)} DA`

export const addMonths = (date, months) => {
  const result = new Date(date)
  const targetDay = result.getDate()
  result.setDate(1)
  result.setMonth(result.getMonth() + months)
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(targetDay, lastDay))
  return result
}

export const subscriptionStatus = (subscription) => {
  if (!subscription?.end_date) return 'pending'
  return new Date(subscription.end_date).getTime() <= Date.now() ? 'expired' : 'active'
}
