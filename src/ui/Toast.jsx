import { useStore } from '../store/useStore'

export default function Toast() {
  const toast = useStore((s) => s.toast)
  if (!toast) return null
  return (
    <div className={`toast toast--${toast.tone}`} key={toast.id} role="status">
      {toast.message}
    </div>
  )
}
