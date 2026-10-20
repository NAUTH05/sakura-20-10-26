import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { Button, Card, Field, Range, TextArea, TextInput, Toggle, Toast } from './ui'
import './admin.css'

export default function AdminApp() {
  const [auth, setAuth] = useState('checking')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [content, setContent] = useState(null)
  const [section, setSection] = useState('dreams')
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)

  const notify = useCallback((message, tone = 'ok') => {
    setToast({ message, tone, id: Date.now() })
    setTimeout(() => setToast((t) => (t && t.message === message ? null : t)), 3600)
  }, [])

  const refresh = useCallback(async () => {
    const next = await api.adminContent()
    setContent(next)
    return next
  }, [])

  useEffect(() => {
    api
      .session()
      .then((s) => {
        if (s.authenticated) {
          setAuth('in')
          return refresh()
        }
        setAuth('out')
        return null
      })
      .catch(() => setAuth('out'))
  }, [refresh])

  const login = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.login(password)
      await refresh()
      setAuth('in')
      setPassword('')
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại')
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch {
      /* ignore */
    }
    setAuth('out')
    setContent(null)
  }

  if (auth === 'checking') {
    return (
      <div className="admin admin--center">
        <div className="adm-splash">Đang kiểm tra phiên đăng nhập…</div>
      </div>
    )
  }

  if (auth === 'out') {
    return (
      <div className="admin admin--center">
        <form className="adm-login" onSubmit={login}>
          <span className="adm-login__kicker">Our Little Dream</span>
          <h1>Admin</h1>
          <p>Nhập mật khẩu quản trị để sửa nội dung website.</p>
          <input
            className="adm-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
            autoFocus
          />
          {error && <div className="adm-error">{error}</div>}
          <Button variant="primary" type="submit" disabled={busy || !password}>
            {busy ? 'Đang vào…' : 'Đăng nhập'}
          </Button>
          <small className="adm-login__hint">
            Mật khẩu được kiểm tra ở server (biến môi trường <code>ADMIN_PASSWORD</code>).
          </small>
        </form>
        <Toast toast={toast} />
      </div>
    )
  }

  if (!content) {
    return (
      <div className="admin admin--center">
        <div className="adm-splash">Đang tải nội dung…</div>
      </div>
    )
  }

  const sections = [
    { id: 'dreams', label: 'Dreams', count: content.memories.length },
    { id: 'music', label: 'Music', count: content.tracks.length },
    { id: 'couples', label: 'Couples' },
    { id: 'environment', label: 'Environment' },
    { id: 'general', label: 'General' },
  ]

  return (
    <div className="admin">
      <aside className="adm-side">
        <div className="adm-brand">
          <span className="adm-brand__mark" aria-hidden>♡</span>
          <div>
            <strong>Our Little Dream</strong>
            <small>content studio</small>
          </div>
        </div>

        <nav className="adm-nav">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              className={section === s.id ? 'is-active' : ''}
              onClick={() => setSection(s.id)}
            >
              <span>{s.label}</span>
              {s.count != null && <em>{s.count}</em>}
            </button>
          ))}
        </nav>

        <div className="adm-side__foot">
          <a href="/" target="_blank" rel="noreferrer">Xem website ↗</a>
          <button type="button" onClick={logout}>Đăng xuất</button>
        </div>
      </aside>

      <main className="adm-main">
        <header className="adm-top">
          <div>
            <h1>{sections.find((s) => s.id === section)?.label}</h1>
            <p>Mọi thay đổi được lưu trên server và hiện ngay trên website.</p>
          </div>
        </header>

        <div className="adm-body">
          {section === 'dreams' && <DreamManager content={content} refresh={refresh} notify={notify} />}
          {section === 'music' && <MusicManager content={content} refresh={refresh} notify={notify} />}
          {(section === 'couples' || section === 'environment' || section === 'general') && (
            <SettingsManager section={section} content={content} refresh={refresh} notify={notify} />
          )}
        </div>
      </main>

      <Toast toast={toast} />
    </div>
  )
}

/* ------------------------------------------------------------------ dreams */

function DreamManager({ content, refresh, notify }) {
  const [selected, setSelected] = useState(content.memories[0]?.id || null)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(false)
  const dragId = useRef(null)
  const fileInput = useRef(null)

  const memory = content.memories.find((m) => m.id === selected) || null

  useEffect(() => {
    if (!memory) {
      setDraft(null)
      return
    }
    setDraft({
      title: memory.title,
      body: memory.body,
      date: memory.date,
      trackId: memory.trackId || '',
      visible: memory.visible,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory?.id, content])

  const create = async () => {
    try {
      const res = await api.createMemory({ title: 'Kỷ niệm mới', body: '', visible: true })
      await refresh()
      setSelected(res.id)
      notify('Đã tạo kỷ niệm mới')
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  const save = async () => {
    if (!memory || !draft) return
    setSaving(true)
    try {
      await api.updateMemory(memory.id, draft)
      await refresh()
      notify('Đã lưu kỷ niệm')
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!memory) return
    if (!window.confirm('Xoá kỷ niệm này? Hành động không thể hoàn tác.')) return
    try {
      await api.deleteMemory(memory.id)
      const next = await refresh()
      setSelected(next.memories[0]?.id || null)
      notify('Đã xoá kỷ niệm')
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  const toggleVisible = async (m) => {
    try {
      await api.updateMemory(m.id, { visible: !m.visible })
      await refresh()
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  const upload = async (files) => {
    if (!memory || !files?.length) return
    setUploading(true)
    try {
      for (const file of files) {
        await api.uploadImage(memory.id, file)
      }
      await refresh()
      notify(`Đã tải ${files.length} ảnh lên`)
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const dropImage = async (imageId) => {
    if (!window.confirm('Xoá ảnh này?')) return
    try {
      await api.deleteImage(imageId)
      await refresh()
      notify('Đã xoá ảnh')
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  const onDrop = async (targetId) => {
    const from = dragId.current
    dragId.current = null
    if (!from || from === targetId) return
    const ids = content.memories.map((m) => m.id)
    const fromIdx = ids.indexOf(from)
    const toIdx = ids.indexOf(targetId)
    ids.splice(toIdx, 0, ids.splice(fromIdx, 1)[0])
    try {
      await api.reorderMemories(ids)
      await refresh()
      notify('Đã đổi thứ tự')
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  const dirty = memory && draft && (
    draft.title !== memory.title ||
    draft.body !== memory.body ||
    draft.date !== memory.date ||
    draft.trackId !== (memory.trackId || '') ||
    draft.visible !== memory.visible
  )

  return (
    <div className="adm-dreams">
      <Card
        title="Dream Memories"
        description="Kéo để sắp xếp lại thứ tự."
        actions={<Button variant="primary" onClick={create}>+ Kỷ niệm mới</Button>}
      >
        <ul className="adm-list">
          {content.memories.map((m, i) => (
            <li
              key={m.id}
              draggable
              onDragStart={() => (dragId.current = m.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(m.id)}
              className={`adm-memory ${m.id === selected ? 'is-active' : ''} ${m.visible ? '' : 'is-hidden'}`}
              onClick={() => setSelected(m.id)}
            >
              <span className="adm-memory__handle" aria-hidden>⠿</span>
              <span className="adm-memory__index">{String(i + 1).padStart(2, '0')}</span>
              <span className="adm-memory__thumb">
                {m.images[0] ? <img src={m.images[0].url} alt="" /> : <i />}
              </span>
              <span className="adm-memory__text">
                <strong>{m.title || 'Chưa có tiêu đề'}</strong>
                <small>{m.images.length} ảnh{m.date ? ` · ${m.date}` : ''}</small>
              </span>
              <button
                type="button"
                className={`adm-eye ${m.visible ? 'is-on' : ''}`}
                title={m.visible ? 'Đang hiển thị' : 'Đang ẩn'}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleVisible(m)
                }}
              >
                {m.visible ? '◉' : '○'}
              </button>
            </li>
          ))}
          {!content.memories.length && <li className="adm-empty">Chưa có kỷ niệm nào.</li>}
        </ul>
      </Card>

      <Card
        title={memory ? 'Nội dung kỷ niệm' : 'Chọn một kỷ niệm'}
        description={memory ? 'Tiêu đề, lời nhắn, ngày và hình ảnh.' : 'Hoặc tạo kỷ niệm mới ở cột bên trái.'}
        actions={
          memory && (
            <>
              <Button onClick={() => setPreview((p) => !p)}>{preview ? 'Đóng preview' : 'Preview'}</Button>
              <Button variant="danger" onClick={remove}>Xoá</Button>
              <Button variant="primary" onClick={save} disabled={!dirty || saving}>
                {saving ? 'Đang lưu…' : 'Lưu'}
              </Button>
            </>
          )
        }
      >
        {!memory && <p className="adm-muted">Chưa chọn kỷ niệm.</p>}

        {memory && draft && (
          <div className="adm-editor">
            <div className="adm-editor__fields">
              <Field label="Tiêu đề">
                <TextInput value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
              </Field>
              <Field label="Lời nhắn" hint="Xuống dòng sẽ được giữ nguyên.">
                <TextArea rows={8} value={draft.body} onChange={(v) => setDraft({ ...draft, body: v })} />
              </Field>
              <div className="adm-row">
                <Field label="Ngày">
                  <TextInput type="date" value={draft.date || ''} onChange={(v) => setDraft({ ...draft, date: v })} />
                </Field>
                <Field label="Nhạc riêng" hint="Phát khi mở kỷ niệm này.">
                  <select
                    className="adm-input"
                    value={draft.trackId || ''}
                    onChange={(e) => setDraft({ ...draft, trackId: e.target.value })}
                  >
                    <option value="">— Không —</option>
                    {content.tracks.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Toggle
                label="Hiển thị trên website"
                hint="Tắt để giấu kỷ niệm này khỏi trang chính."
                checked={draft.visible}
                onChange={(v) => setDraft({ ...draft, visible: v })}
              />
            </div>

            <div className="adm-editor__media">
              <div className="adm-editor__media-head">
                <span>Hình ảnh</span>
                <label className="adm-upload">
                  {uploading ? 'Đang tải…' : 'Tải ảnh lên'}
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    multiple
                    onChange={(e) => upload(Array.from(e.target.files || []))}
                  />
                </label>
              </div>
              <div className="adm-thumbs">
                {memory.images.map((im) => (
                  <figure key={im.id}>
                    <img src={im.url} alt="" />
                    <button type="button" onClick={() => dropImage(im.id)} aria-label="Xoá ảnh">✕</button>
                  </figure>
                ))}
                {!memory.images.length && <p className="adm-muted">Chưa có ảnh — tải lên JPG/PNG/WEBP.</p>}
              </div>
              <p className="adm-hint">Ảnh tối đa 10MB. Ảnh đầu tiên là ảnh bìa.</p>

              {preview && (
                <div className="adm-preview">
                  <div className="adm-preview__photo">
                    {memory.images[0] ? <img src={memory.images[0].url} alt="" /> : <i />}
                  </div>
                  <div>
                    <small>{draft.date}</small>
                    <h3>{draft.title}</h3>
                    <p>{draft.body}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------- music */

function MusicManager({ content, refresh, notify }) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [renaming, setRenaming] = useState({})

  const upload = async (e) => {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    try {
      await api.uploadTrack(file, title || file.name.replace(/\.[^.]+$/, ''))
      setTitle('')
      setFile(null)
      e.target.reset()
      await refresh()
      notify('Đã thêm bài hát')
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const setDefault = async (id) => {
    try {
      await api.updateTrack(id, { isDefault: true })
      await refresh()
      notify('Đã đặt làm nhạc mặc định')
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  const rename = async (t) => {
    const value = renaming[t.id]
    if (value === undefined || value === t.title) return
    try {
      await api.updateTrack(t.id, { title: value })
      await refresh()
      notify('Đã đổi tên')
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  const remove = async (t) => {
    if (!window.confirm(`Xoá bài "${t.title}"?`)) return
    try {
      await api.deleteTrack(t.id)
      await refresh()
      notify('Đã xoá bài hát')
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  return (
    <div className="adm-stack">
      <Card title="Thêm nhạc" description="MP3 / M4A / OGG / WAV, tối đa 20MB.">
        <form className="adm-upload-row" onSubmit={upload}>
          <Field label="Tên bài hát">
            <TextInput value={title} onChange={setTitle} placeholder="Ví dụ: Until I Found You" />
          </Field>
          <Field label="Tệp âm thanh">
            <input
              className="adm-input adm-file"
              type="file"
              accept="audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/wav,audio/webm"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Field>
          <Button variant="primary" type="submit" disabled={!file || busy}>
            {busy ? 'Đang tải…' : 'Tải lên'}
          </Button>
        </form>
      </Card>

      <Card title="Playlist" description="Bài mặc định phát khi khách bấm Enter.">
        <ul className="adm-tracks">
          {content.tracks.map((t) => (
            <li key={t.id} className={t.isDefault ? 'is-default' : ''}>
              <button
                type="button"
                className={`adm-radio ${t.isDefault ? 'is-on' : ''}`}
                onClick={() => setDefault(t.id)}
                title="Đặt làm mặc định"
              >
                {t.isDefault ? '●' : '○'}
              </button>
              <input
                className="adm-input adm-input--ghost"
                defaultValue={t.title}
                onChange={(e) => setRenaming((r) => ({ ...r, [t.id]: e.target.value }))}
                onBlur={() => rename(t)}
              />
              <span className="adm-track-url">{t.url === 'ambient:' ? 'generated' : 'file'}</span>
              <audio controls preload="none" src={t.url === 'ambient:' ? undefined : t.url} />
              <Button variant="danger" onClick={() => remove(t)} disabled={t.id === 'ambient'}>
                Xoá
              </Button>
            </li>
          ))}
          {!content.tracks.length && <li className="adm-empty">Chưa có bài nào.</li>}
        </ul>
      </Card>
    </div>
  )
}

/* ---------------------------------------------------------------- settings */

const SECTIONS = {
  couples: {
    title: 'NPC Couples',
    description: 'Những cặp đôi đi dạo dưới hàng cây.',
    fields: ['npcEnabled', 'npcCouples', 'npcSpeed', 'npcBehavior'],
  },
  environment: {
    title: 'Environment',
    description: 'Ánh sáng, hoa rơi và thời tiết.',
    fields: ['petalIntensity', 'lightIntensity', 'rain', 'fog', 'bloom'],
  },
  general: {
    title: 'General',
    description: 'Lời chào, thư kết và camera mặc định.',
    fields: [
      'siteTitle',
      'welcomeKicker',
      'welcomeTitle',
      'welcomeSubtitle',
      'welcomeButton',
      'introLine',
      'dreamHint',
      'wakeLabel',
      'letter',
      'specialDate',
      'defaultCamera',
      'musicDefaultId',
      'musicVolume',
    ],
  },
}

function SettingsManager({ section, content, refresh, notify }) {
  const conf = SECTIONS[section]
  const [draft, setDraft] = useState(content.settings)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(content.settings)
  }, [content.settings])

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }))
  const dirty = conf.fields.some((k) => draft[k] !== content.settings[k])

  const save = async () => {
    setSaving(true)
    try {
      const patch = {}
      conf.fields.forEach((k) => {
        patch[k] = draft[k]
      })
      await api.saveSettings(patch)
      await refresh()
      notify('Đã lưu cài đặt')
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-stack">
      <Card title={conf.title} description={conf.description}>
        <div className="adm-settings">
          {section === 'couples' && (
            <>
              <Toggle
                label="Bật NPC"
                hint="Tắt để con đường vắng lặng, chỉ còn hai nhân vật chính."
                checked={draft.npcEnabled !== false}
                onChange={(v) => set('npcEnabled', v)}
              />
              <Range
                label="Số cặp đôi"
                min={0}
                max={5}
                step={1}
                value={draft.npcCouples ?? 4}
                onChange={(v) => set('npcCouples', v)}
                format={(v) => `${v} cặp`}
              />
              <Range
                label="Tốc độ đi"
                min={0.4}
                max={1.8}
                step={0.05}
                value={draft.npcSpeed ?? 1}
                onChange={(v) => set('npcSpeed', v)}
                format={(v) => `${v.toFixed(2)}×`}
              />
              <Field label="Hành vi" hint="Ảnh hưởng đến tần suất dừng lại ngắm cảnh.">
                <select
                  className="adm-input"
                  value={draft.npcBehavior || 'wander'}
                  onChange={(e) => set('npcBehavior', e.target.value)}
                >
                  <option value="wander">Đi dạo, thỉnh thoảng dừng</option>
                  <option value="stroll">Đi đều, ít dừng</option>
                  <option value="lingering">Đi chậm, dừng lâu</option>
                </select>
              </Field>
            </>
          )}

          {section === 'environment' && (
            <>
              <Range
                label="Mật độ hoa rơi"
                min={0}
                max={2}
                step={0.05}
                value={draft.petalIntensity ?? 1}
                onChange={(v) => set('petalIntensity', v)}
                format={(v) => `${Math.round(v * 100)}%`}
              />
              <Range
                label="Độ sáng"
                min={0.4}
                max={1.8}
                step={0.05}
                value={draft.lightIntensity ?? 1}
                onChange={(v) => set('lightIntensity', v)}
                format={(v) => `${Math.round(v * 100)}%`}
              />
              <Toggle label="Mưa" hint="Mặc định khi mở trang." checked={!!draft.rain} onChange={(v) => set('rain', v)} />
              <Toggle label="Sương mù" hint="Tạo chiều sâu cho thành phố phía sau." checked={draft.fog !== false} onChange={(v) => set('fog', v)} />
              <Toggle label="Bloom" hint="Quầng sáng quanh đèn và biển neon." checked={draft.bloom !== false} onChange={(v) => set('bloom', v)} />
            </>
          )}

          {section === 'general' && (
            <>
              <div className="adm-row">
                <Field label="Tên website">
                  <TextInput value={draft.siteTitle || ''} onChange={(v) => set('siteTitle', v)} />
                </Field>
                <Field label="Ngày đặc biệt">
                  <TextInput type="date" value={draft.specialDate || ''} onChange={(v) => set('specialDate', v)} />
                </Field>
              </div>
              <Field label="Dòng nhỏ trên lời chào">
                <TextInput value={draft.welcomeKicker || ''} onChange={(v) => set('welcomeKicker', v)} />
              </Field>
              <Field label="Tiêu đề lời chào">
                <TextInput value={draft.welcomeTitle || ''} onChange={(v) => set('welcomeTitle', v)} />
              </Field>
              <Field label="Lời chào phụ">
                <TextArea rows={3} value={draft.welcomeSubtitle || ''} onChange={(v) => set('welcomeSubtitle', v)} />
              </Field>
              <div className="adm-row">
                <Field label="Chữ trên nút Enter">
                  <TextInput value={draft.welcomeButton || ''} onChange={(v) => set('welcomeButton', v)} />
                </Field>
                <Field label="Camera mặc định">
                  <select className="adm-input" value={draft.defaultCamera || 'overview'} onChange={(e) => set('defaultCamera', e.target.value)}>
                    <option value="overview">Overview</option>
                    <option value="road">Sakura Road</option>
                    <option value="cinematic">Cinematic</option>
                  </select>
                </Field>
              </div>
              <Field label="Câu dẫn khi bay vào công viên">
                <TextInput value={draft.introLine || ''} onChange={(v) => set('introLine', v)} />
              </Field>
              <div className="adm-row">
                <Field label="Gợi ý khi hover cặp đôi">
                  <TextInput value={draft.dreamHint || ''} onChange={(v) => set('dreamHint', v)} />
                </Field>
                <Field label="Chữ nút thức dậy">
                  <TextInput value={draft.wakeLabel || ''} onChange={(v) => set('wakeLabel', v)} />
                </Field>
              </div>
              <Field label="Lá thư cuối" hint="Hiện sau khi hai nhân vật mở mắt.">
                <TextArea rows={4} value={draft.letter || ''} onChange={(v) => set('letter', v)} />
              </Field>
              <div className="adm-row">
                <Field label="Nhạc mặc định">
                  <select
                    className="adm-input"
                    value={draft.musicDefaultId || ''}
                    onChange={(e) => set('musicDefaultId', e.target.value || null)}
                  >
                    <option value="">— Tự động —</option>
                    {content.tracks.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </Field>
                <Range
                  label="Âm lượng mặc định"
                  min={0}
                  max={1}
                  step={0.05}
                  value={draft.musicVolume ?? 0.55}
                  onChange={(v) => set('musicVolume', v)}
                  format={(v) => `${Math.round(v * 100)}%`}
                />
              </div>
            </>
          )}
        </div>

        <div className="adm-savebar-wrap">
          <span className={dirty ? 'is-dirty' : ''}>{dirty ? 'Có thay đổi chưa lưu' : 'Đã đồng bộ'}</span>
          <Button variant="primary" onClick={save} disabled={!dirty || saving}>
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
