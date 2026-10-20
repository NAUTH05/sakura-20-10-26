import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function Photo({ image, alt }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [image?.id])

  if (!image || failed) {
    return (
      <div className="dream__photo-missing">
        <span>♡</span>
        <small>{failed ? 'Hình ảnh này chưa tải được' : 'Chưa có hình ảnh'}</small>
      </div>
    )
  }

  return <img src={image.url} alt={alt} loading="lazy" onError={() => setFailed(true)} draggable={false} />
}

/**
 * Dream Memories — a scrapbook of the moments kept in the admin.
 */
export default function DreamOverlay() {
  const stage = useStore((s) => s.stage)
  const memories = useStore((s) => s.content.memories)
  const index = useStore((s) => s.dreamIndex)
  const setIndex = useStore((s) => s.setDreamIndex)
  const closeDream = useStore((s) => s.closeDream)
  const wakeUp = useStore((s) => s.wakeUp)
  const settings = useStore((s) => s.content.settings)

  const [imageIndex, setImageIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const lastIndex = useRef(index)

  const open = stage === 'dream'
  const memory = memories[index]
  const images = useMemo(() => memory?.images || [], [memory])
  const total = memories.length
  const isLast = index >= total - 1
  const isFirst = index <= 0

  useEffect(() => {
    if (index !== lastIndex.current) {
      setDirection(index > lastIndex.current ? 1 : -1)
      lastIndex.current = index
    }
    setImageIndex(0)
  }, [index])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeDream()
      if (e.key === 'ArrowRight' && !isLast) setIndex(index + 1)
      if (e.key === 'ArrowLeft' && !isFirst) setIndex(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, index, isLast, isFirst, closeDream, setIndex])

  if (!memory) return null

  return (
    <div className={`dream ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="dream__scrim" onClick={closeDream} />

      <article className="dream__card" role="dialog" aria-modal="true" aria-label={memory.title}>
        <button className="dream__close" type="button" onClick={closeDream} aria-label="Đóng">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>

        <div className="dream__media">
          <div className={`dream__frame dream__frame--${direction > 0 ? 'in' : 'back'}`} key={`${memory.id}-${imageIndex}`}>
            <Photo image={images[imageIndex]} alt={memory.title} />
            <span className="dream__tape" aria-hidden />
          </div>

          {images.length > 1 && (
            <div className="dream__thumbs">
              {images.map((im, i) => (
                <button
                  key={im.id}
                  type="button"
                  className={`dream__thumb ${i === imageIndex ? 'is-active' : ''}`}
                  onClick={() => setImageIndex(i)}
                  aria-label={`Ảnh ${i + 1}`}
                >
                  <Photo image={im} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="dream__content">
          <div className="dream__meta">
            <span className="dream__counter">
              {String(index + 1).padStart(2, '0')} <i>/</i> {String(total).padStart(2, '0')}
            </span>
            {memory.date && <span className="dream__date">{formatDate(memory.date)}</span>}
          </div>

          <div className={`dream__text dream__text--${direction > 0 ? 'in' : 'back'}`} key={`t-${memory.id}`}>
            <h2>{memory.title}</h2>
            <p>{memory.body}</p>
          </div>

          <div className="dream__nav">
            <button
              type="button"
              className="dream__arrow"
              onClick={() => setIndex(index - 1)}
              disabled={isFirst}
              aria-label="Kỷ niệm trước"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="dream__dots">
              {memories.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  className={`dream__dot ${i === index ? 'is-active' : ''}`}
                  onClick={() => setIndex(i)}
                  aria-label={`Kỷ niệm ${i + 1}`}
                />
              ))}
            </div>

            {!isLast ? (
              <button
                type="button"
                className="dream__arrow"
                onClick={() => setIndex(index + 1)}
                aria-label="Kỷ niệm tiếp theo"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : (
              <span className="dream__arrow dream__arrow--ghost" aria-hidden />
            )}
          </div>

          {isLast && (
            <button type="button" className="dream__wake" onClick={wakeUp}>
              <span className="dream__wake-heart">♡</span>
              {settings.wakeLabel || 'Wake up together'}
            </button>
          )}
        </div>
      </article>
    </div>
  )
}
