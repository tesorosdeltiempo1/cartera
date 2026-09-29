export function notifyPortfolioChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('portfolio:changed'))
  }
}
