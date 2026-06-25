import {
  Braces,
  BoxSelect,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Download,
  FilePlus2,
  FolderOpen,
  Grid2X2,
  Laptop,
  Layers3,
  LayoutTemplate,
  Maximize2,
  Minus,
  Monitor,
  MousePointer2,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Tablet,
  Type,
  Upload,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { emptyDesign, normalizeDesign, parseDesign, serializeDesign, slugify, type DesignData, type TypeStyle } from './design'
import { examples, type StoredDesign } from './examples'

const STORAGE_KEY = 'design-md-editor-v1'
const LAST_KEY = 'design-md-editor-last'
const GOOGLE_FONTS = [
  'Archivo', 'Bebas Neue', 'Bitter', 'Bricolage Grotesque', 'Cabin', 'Cormorant Garamond',
  'DM Sans', 'DM Serif Display', 'Figtree', 'Geist', 'IBM Plex Mono', 'IBM Plex Sans',
  'Inconsolata', 'Inter', 'JetBrains Mono', 'Josefin Sans', 'Karla', 'Lato', 'Libre Baskerville',
  'Manrope', 'Merriweather', 'Montserrat', 'Noto Sans', 'Nunito', 'Open Sans', 'Oswald',
  'Outfit', 'Playfair Display', 'Plus Jakarta Sans', 'Poppins', 'PT Sans', 'Raleway',
  'Roboto', 'Roboto Mono', 'Rubik', 'Source Code Pro', 'Source Sans 3', 'Space Grotesk',
  'Syne', 'Work Sans',
]

const colorLabels: Record<string, string> = {
  primary: 'Primária',
  secondary: 'Secundária',
  accent: 'Acento',
  background: 'Fundo',
  surface: 'Superfície',
  'text-primary': 'Texto primário',
  'text-secondary': 'Texto secundário',
  border: 'Borda',
}

function uid() {
  return crypto.randomUUID()
}

function loadStored(): StoredDesign[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(value)) return []
    return value
      .filter((item) => item?.id && item?.data?.name && item?.data?.colors)
      .map((item) => ({ ...item, data: normalizeDesign(item.data) }))
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return []
  }
}

function download(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${slugify(name) || 'design'}-DESIGN.md`
  anchor.click()
  URL.revokeObjectURL(url)
}

function App() {
  const [documents, setDocuments] = useState<StoredDesign[]>(() => {
    const stored = loadStored()
    if (stored.length) return stored
    return examples.map(({ id, data }) => ({ id, data, updatedAt: Date.now() }))
  })
  const [activeId, setActiveId] = useState(() => {
    const last = localStorage.getItem(LAST_KEY)
    return documents.some((doc) => doc.id === last) ? last! : documents[0]?.id
  })
  const [mode, setMode] = useState<'form' | 'markdown'>('form')
  const [section, setSection] = useState('info')
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [editorOpen, setEditorOpen] = useState(true)
  const [raw, setRaw] = useState('')
  const [rawError, setRawError] = useState('')
  const [copied, setCopied] = useState(false)
  const [fontTarget, setFontTarget] = useState<string | null>(null)
  const [fontSearch, setFontSearch] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const active = documents.find((doc) => doc.id === activeId) || documents[0]
  const data = active?.data || emptyDesign

  useEffect(() => {
    if (!active) return
    localStorage.setItem(LAST_KEY, active.id)
  }, [activeId, active])

  useEffect(() => {
    if (!active) return
    setRaw(serializeDesign(active.data))
    setRawError('')
  }, [active])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents))
    }, 250)
    return () => clearTimeout(timer)
  }, [documents])

  useEffect(() => {
    const families = Array.from(new Set(data.googleFonts || []))
    document.querySelectorAll('[data-design-google-font]').forEach((element) => element.remove())
    if (!families.length) return
    const weights = '100;200;300;400;500;600;700;800;900'
    families.forEach((family) => {
      const encoded = encodeURIComponent(family).replace(/%20/g, '+')
      const link = document.createElement('link')
      link.dataset.designGoogleFont = family
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@${weights}&display=swap`
      link.onerror = () => {
        link.onerror = null
        link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@${weights}&display=swap`
      }
      document.head.appendChild(link)
    })
  }, [data.googleFonts])

  function updateData(updater: (current: DesignData) => DesignData) {
    setDocuments((current) =>
      current.map((doc) =>
        doc.id === active.id ? { ...doc, data: updater(doc.data), updatedAt: Date.now() } : doc,
      ),
    )
  }

  function setField<K extends keyof DesignData>(key: K, value: DesignData[K]) {
    updateData((current) => ({ ...current, [key]: value }))
  }

  function createNew() {
    const id = uid()
    const next = { id, data: structuredClone(emptyDesign), updatedAt: Date.now() }
    setDocuments((current) => [...current, next])
    setActiveId(id)
    setMode('form')
  }

  function importFile(file?: File) {
    if (!file) return
    file.text().then((text) => {
      try {
        const parsed = parseDesign(text)
        const id = uid()
        setDocuments((current) => [...current, { id, data: parsed, updatedAt: Date.now() }])
        setActiveId(id)
        setRawError('')
      } catch (error) {
        setRawError(error instanceof Error ? error.message : 'Arquivo inválido.')
      }
    })
  }

  function updateRaw(next: string) {
    setRaw(next)
    try {
      const parsed = parseDesign(next)
      updateData(() => parsed)
      setRawError('')
    } catch (error) {
      setRawError(error instanceof Error ? error.message : 'Markdown inválido.')
    }
  }

  function resetDocument() {
    const source = examples.find(({ id }) => id === active.id)?.data
    updateData(() => structuredClone(source || emptyDesign))
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(serializeDesign(data))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  const previewStyle = useMemo(
    () =>
      ({
        '--primary': data.colors.primary,
        '--secondary': data.colors.secondary,
        '--accent': data.colors.accent,
        '--background': data.colors.background,
        '--surface': data.colors.surface,
        '--text-primary': data.colors['text-primary'],
        '--text-secondary': data.colors['text-secondary'],
        '--border': data.colors.border,
        '--card-radius': data.rounded.card,
        '--control-radius': data.rounded.control,
        '--pill-radius': data.rounded.pill,
        '--base-gap': data.spacing.gap,
        '--base-space': data.spacing.base,
        '--card-padding': data.spacing['card-padding'],
        '--section-padding': data.spacing['section-padding'],
        '--state-hover': data.states.hover,
        '--state-focus': data.states.focus,
        '--focus-ring': data.states['focus-ring'],
        '--disabled-opacity': data.states['disabled-opacity'],
        '--shadow-sm': data.shadows.sm,
        '--shadow-md': data.shadows.md,
        '--shadow-lg': data.shadows.lg,
        '--layout-max': data.layout['max-width'],
        '--content-width': data.layout['content-width'],
        '--icon-size': data.icons.size,
        '--icon-stroke': data.icons['stroke-width'],
        '--display-font': data.typography['display-lg']?.fontFamily || 'Inter',
        '--display-size': data.typography['display-lg']?.fontSize || '64px',
        '--display-weight': data.typography['display-lg']?.fontWeight || 600,
        '--display-line-height': data.typography['display-lg']?.lineHeight || '1.04',
        '--display-letter-spacing': data.typography['display-lg']?.letterSpacing || '0',
        '--body-font': data.typography['body-md']?.fontFamily || 'Inter',
        '--body-size': data.typography['body-md']?.fontSize || '16px',
        '--body-weight': data.typography['body-md']?.fontWeight || 400,
        '--body-line-height': data.typography['body-md']?.lineHeight || '1.6',
        '--body-letter-spacing': data.typography['body-md']?.letterSpacing || '0',
        '--label-font': data.typography['label-md']?.fontFamily || 'JetBrains Mono',
        '--label-size': data.typography['label-md']?.fontSize || '12px',
        '--label-weight': data.typography['label-md']?.fontWeight || 600,
        '--label-line-height': data.typography['label-md']?.lineHeight || '1.2',
        '--label-letter-spacing': data.typography['label-md']?.letterSpacing || '0',
      }) as React.CSSProperties,
    [data],
  )

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setEditorOpen(true)} aria-label="Design">
          <Sparkles size={18} />
          <span>Design</span>
        </button>
        <div className="document-switcher">
          <select value={active.id} onChange={(event) => setActiveId(event.target.value)}>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.data.name}
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </div>
        <div className="top-actions">
          <button onClick={createNew}>
            <FilePlus2 size={16} /> <span>Novo</span>
          </button>
          <button onClick={() => fileInput.current?.click()}>
            <Upload size={16} /> <span>Importar</span>
          </button>
          <button onClick={() => download(data.name, serializeDesign(data))}>
            <Download size={16} /> <span>Exportar .md</span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".md,text/markdown"
            hidden
            onChange={(event) => importFile(event.target.files?.[0])}
          />
        </div>
        <div className="topbar-spacer" />
        <div className="save-state">
          <Check size={15} />
          <span>Salvo</span>
        </div>
      </header>

      <section className={`workspace ${editorOpen ? '' : 'editor-collapsed'}`}>
        {editorOpen ? (
          <aside className="editor-panel">
            <div className="panel-heading">
              <div>
                <strong>Design.MD</strong>
                <span>Estrutura</span>
              </div>
              <button className="icon-button" onClick={() => setEditorOpen(false)} title="Fechar editor">
                <PanelLeftClose size={17} />
              </button>
            </div>
            <div className="editor-body">
              <nav className="section-nav">
                <NavButton icon={<LayoutTemplate />} label="Informações" active={section === 'info'} onClick={() => setSection('info')} />
                <NavButton icon={<Palette />} label="Cores" active={section === 'colors'} onClick={() => setSection('colors')} />
                <NavButton icon={<Type />} label="Tipografia" active={section === 'type'} onClick={() => setSection('type')} />
                <NavButton icon={<Grid2X2 />} label="Espaçamento" active={section === 'spacing'} onClick={() => setSection('spacing')} />
                <NavButton icon={<Maximize2 />} label="Raio" active={section === 'rounded'} onClick={() => setSection('rounded')} />
                <NavButton icon={<MousePointer2 />} label="Estados" active={section === 'states'} onClick={() => setSection('states')} />
                <NavButton icon={<Layers3 />} label="Sombras" active={section === 'shadows'} onClick={() => setSection('shadows')} />
                <NavButton icon={<SlidersHorizontal />} label="Layout" active={section === 'layout'} onClick={() => setSection('layout')} />
                <NavButton icon={<BoxSelect />} label="Ícones" active={section === 'icons'} onClick={() => setSection('icons')} />
                <NavButton icon={<Code2 />} label="Conteúdo" active={section === 'content'} onClick={() => setSection('content')} />
              </nav>

              <div className="editor-content">
                <div className="editor-tabs">
                  <button className={mode === 'form' ? 'active' : ''} onClick={() => setMode('form')}>Formulário</button>
                  <button className={mode === 'markdown' ? 'active' : ''} onClick={() => setMode('markdown')}>Markdown</button>
                  <div />
                  <button className="small-icon" onClick={resetDocument} title="Restaurar">
                    <RotateCcw size={15} />
                  </button>
                </div>

                {mode === 'markdown' ? (
                  <div className="markdown-editor">
                    <div className="markdown-toolbar">
                      <span>Arquivo completo</span>
                      <button onClick={copyMarkdown}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar'}</button>
                    </div>
                    <textarea value={raw} onChange={(event) => updateRaw(event.target.value)} spellCheck={false} />
                    {rawError && <div className="error-message">{rawError}</div>}
                  </div>
                ) : (
                  <FormEditor data={data} section={section} setField={setField} onChooseFont={setFontTarget} />
                )}
              </div>
            </div>
          </aside>
        ) : (
          <button className="open-editor" onClick={() => setEditorOpen(true)} title="Abrir editor">
            <PanelLeftOpen size={18} />
          </button>
        )}

        <section className="preview-panel">
          <div className="preview-heading">
            <div>
              <Monitor size={17} />
              <strong>Pré-visualização ao vivo</strong>
            </div>
            <div className="device-switcher">
              <button className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')} title="Desktop"><Laptop size={16} /></button>
              <button className={device === 'tablet' ? 'active' : ''} onClick={() => setDevice('tablet')} title="Tablet"><Tablet size={16} /></button>
              <button className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')} title="Mobile"><Smartphone size={16} /></button>
            </div>
          </div>
          <div className="preview-stage">
            <div className={`site-preview ${device}`} style={previewStyle}>
              <PreviewSite data={data} />
            </div>
          </div>
        </section>
      </section>

      {fontTarget ? (
        <FontPicker
          search={fontSearch}
          setSearch={setFontSearch}
          selected={data.typography[fontTarget]?.fontFamily || ''}
          onClose={() => { setFontTarget(null); setFontSearch('') }}
          onSelect={(family) => {
            setField('typography', {
              ...data.typography,
              [fontTarget]: { ...data.typography[fontTarget], fontFamily: family },
            })
            setField('googleFonts', Array.from(new Set([...(data.googleFonts || []), family])))
            setFontTarget(null)
            setFontSearch('')
          }}
        />
      ) : null}
    </main>
  )
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return <button className={active ? 'active' : ''} onClick={onClick}>{icon}<span>{label}</span></button>
}

function FormEditor({
  data,
  section,
  setField,
  onChooseFont,
}: {
  data: DesignData
  section: string
  setField: <K extends keyof DesignData>(key: K, value: DesignData[K]) => void
  onChooseFont: (target: string) => void
}) {
  if (section === 'colors') {
    return (
      <EditorSection title="Cores" description="Tokens semânticos usados no preview.">
        <div className="color-list">
          {Object.entries(data.colors).map(([key, value]) => (
            <label className="color-row" key={key}>
              <input type="color" value={value} onChange={(event) => setField('colors', { ...data.colors, [key]: event.target.value.toUpperCase() })} />
              <span>{colorLabels[key] || key}</span>
              <input value={value} onChange={(event) => setField('colors', { ...data.colors, [key]: event.target.value })} />
              <small>{key}</small>
            </label>
          ))}
        </div>
      </EditorSection>
    )
  }

  if (section === 'type') {
    return (
      <EditorSection title="Tipografia" description="Família, escala e ritmo textual.">
        {Object.entries(data.typography).map(([key, style]) => (
          <TokenGroup key={key} title={key}>
            {(Object.keys(style) as Array<keyof TypeStyle>).map((property) => (
              property === 'fontFamily' ? (
                <div className="font-family-field" key={property}>
                  <span>fontFamily</span>
                  <button onClick={() => onChooseFont(key)}>
                    <b style={{ fontFamily: `"${style.fontFamily}", sans-serif` }}>{style.fontFamily}</b>
                    <small>Google Fonts</small>
                  </button>
                </div>
              ) : property === 'fontWeight' ? (
                <SelectField
                  key={property}
                  label="fontWeight"
                  value={String(style.fontWeight)}
                  options={[
                    ['100', 'Thin — 100'],
                    ['200', 'Extra Light — 200'],
                    ['300', 'Light — 300'],
                    ['400', 'Regular — 400'],
                    ['500', 'Medium — 500'],
                    ['600', 'Semi Bold — 600'],
                    ['700', 'Bold — 700'],
                    ['800', 'Extra Bold — 800'],
                    ['900', 'Black — 900'],
                  ]}
                  onChange={(value) =>
                    setField('typography', {
                      ...data.typography,
                      [key]: { ...style, fontWeight: Number(value) },
                    })
                  }
                />
              ) : (
                <NumericControl
                  key={property}
                  label={property}
                  value={String(style[property] ?? '')}
                  config={numericConfigFor(property)}
                  onChange={(value) =>
                    setField('typography', {
                      ...data.typography,
                      [key]: {
                        ...style,
                        [property]: value,
                      },
                    })
                  }
                />
              )
            ))}
          </TokenGroup>
        ))}
      </EditorSection>
    )
  }

  if (section === 'spacing') {
    const values = data[section]
    return (
      <EditorSection title="Espaçamento" description="Escala compartilhada entre componentes.">
        {Object.entries(values).map(([key, value]) => (
          <NumericControl
            key={key}
            label={key}
            value={value}
            config={{ min: 0, max: key === 'section-padding' ? 240 : 120, step: 1, defaultUnit: 'px' }}
            onChange={(next) => setField(section, { ...values, [key]: next })}
          />
        ))}
      </EditorSection>
    )
  }

  if (section === 'rounded') {
    const radiusConfig = [
      { key: 'card', label: 'Cards', help: 'Cards, painéis e blocos.', max: 64 },
      { key: 'control', label: 'Controles', help: 'Botões, campos e seletores.', max: 48 },
      { key: 'pill', label: 'Pílulas', help: 'Badges e botões totalmente arredondados.', max: 100 },
    ]
    return (
      <EditorSection title="Raio" description="Controle visual direto para cantos arredondados.">
        <div className="radius-list">
          {radiusConfig.map((item) => (
            <RadiusControl
              key={item.key}
              label={item.label}
              help={item.help}
              value={data.rounded[item.key] || '0px'}
              max={item.max}
              onChange={(value) => setField('rounded', { ...data.rounded, [item.key]: `${value}px` })}
            />
          ))}
        </div>
      </EditorSection>
    )
  }

  if (section === 'states') {
    return (
      <EditorSection title="Estados" description="Feedback visual para interação e acessibilidade.">
        <div className="color-list">
          {(['hover', 'focus'] as const).map((key) => (
            <label className="color-row" key={key}>
              <input type="color" value={data.states[key]} onChange={(event) => setField('states', { ...data.states, [key]: event.target.value.toUpperCase() })} />
              <span>{key === 'hover' ? 'Hover' : 'Focus'}</span>
              <input value={data.states[key]} onChange={(event) => setField('states', { ...data.states, [key]: event.target.value })} />
              <small>{key}</small>
            </label>
          ))}
        </div>
        <NumericControl
          label="focus-ring"
          value={data.states['focus-ring']}
          config={{ min: 0, max: 12, step: 1, defaultUnit: 'px' }}
          onChange={(value) => setField('states', { ...data.states, 'focus-ring': value })}
        />
        <NumericControl
          label="disabled-opacity"
          value={data.states['disabled-opacity']}
          config={{ min: 0.1, max: 1, step: 0.05, defaultUnit: '' }}
          onChange={(value) => setField('states', { ...data.states, 'disabled-opacity': value })}
        />
      </EditorSection>
    )
  }

  if (section === 'shadows') {
    return (
      <EditorSection title="Sombras" description="Escala de profundidade para superfícies.">
        {Object.entries(data.shadows).map(([key, value]) => (
          <ShadowControl
            key={key}
            label={key}
            value={value}
            onChange={(next) => setField('shadows', { ...data.shadows, [key]: next })}
          />
        ))}
      </EditorSection>
    )
  }

  if (section === 'layout') {
    return (
      <EditorSection title="Larguras e breakpoints" description="Limites responsivos do sistema.">
        {Object.entries(data.layout).map(([key, value]) => (
          <NumericControl
            key={key}
            label={key}
            value={value}
            config={{ min: 240, max: key === 'content-width' ? 1400 : 1920, step: 8, defaultUnit: 'px' }}
            onChange={(next) => setField('layout', { ...data.layout, [key]: next })}
          />
        ))}
      </EditorSection>
    )
  }

  if (section === 'icons') {
    return (
      <EditorSection title="Ícones" description="Tamanho e espessura compartilhados.">
        <NumericControl
          label="size"
          value={data.icons.size}
          config={{ min: 12, max: 64, step: 1, defaultUnit: 'px' }}
          onChange={(value) => setField('icons', { ...data.icons, size: value })}
        />
        <NumericControl
          label="stroke-width"
          value={data.icons['stroke-width']}
          config={{ min: 0.5, max: 4, step: 0.25, defaultUnit: '' }}
          onChange={(value) => setField('icons', { ...data.icons, 'stroke-width': value })}
        />
      </EditorSection>
    )
  }

  if (section === 'content') {
    const contentFields = [
      ['Overview', 'Visão geral', 'Objetivo e contexto do design.'],
      ['Composition', 'Composição', 'Hierarquia e organização visual.'],
      ['Colors', 'Uso das cores', 'Regras além dos tokens definidos em Cores.'],
      ['Typography', 'Uso da tipografia', 'Orientações além dos estilos definidos.'],
      ['Layout', 'Layout', 'Grid, largura, densidade e responsividade.'],
      ['Components', 'Comportamento', 'Interação e hierarquia dos componentes.'],
      ['Motion', 'Movimento', 'Animações, transições e feedback.'],
      ['WebGL & Effects', 'Efeitos', 'Canvas, partículas e efeitos especiais.'],
    ] as const
    return (
      <EditorSection title="Conteúdo guiado" description="Preencha instruções por assunto. Use aba Markdown para edição avançada.">
        <div className="content-guide">
          {contentFields.map(([heading, label, help]) => (
            <label className="guided-field" key={heading}>
              <span><b>{label}</b><small>{help}</small></span>
              <textarea
                value={readMarkdownSection(data.content, heading)}
                onChange={(event) => setField('content', writeMarkdownSection(data.content, heading, event.target.value))}
              />
            </label>
          ))}
          <label className="guided-field">
            <span><b>Restrições</b><small>Uma regra por linha. Marcadores são adicionados automaticamente.</small></span>
            <textarea
              value={readMarkdownSection(data.content, 'Guardrails').replace(/^- /gm, '')}
              onChange={(event) => {
                const rules = event.target.value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => `- ${line}`)
                  .join('\n')
                setField('content', writeMarkdownSection(data.content, 'Guardrails', rules))
              }}
            />
          </label>
        </div>
      </EditorSection>
    )
  }

  return (
    <EditorSection title="Informações" description="Identidade e contexto principal.">
      <Field label="Nome" value={data.name} onChange={(value) => setField('name', value)} />
      <Field label="Versão" value={data.version} onChange={(value) => setField('version', value)} />
      <Field label="Descrição" value={data.description} multiline onChange={(value) => setField('description', value)} />
      <div className="summary-grid">
        <button onClick={() => setField('colors', { ...data.colors, primary: '#45E58B' })}><Palette size={17} /><span><b>{Object.keys(data.colors).length}</b> cores</span></button>
        <button><Type size={17} /><span><b>{Object.keys(data.typography).length}</b> estilos</span></button>
        <button><Grid2X2 size={17} /><span><b>{Object.keys(data.spacing).length}</b> espaços</span></button>
        <button><Braces size={17} /><span><b>{Object.keys(data.components).length}</b> componentes</span></button>
      </div>
    </EditorSection>
  )
}

function FontPicker({
  search,
  setSearch,
  selected,
  onClose,
  onSelect,
}: {
  search: string
  setSearch: (value: string) => void
  selected: string
  onClose: () => void
  onSelect: (family: string) => void
}) {
  const fonts = GOOGLE_FONTS.filter((font) => font.toLowerCase().includes(search.toLowerCase()))
  useEffect(() => {
    const link = document.createElement('link')
    link.id = 'design-font-picker-fonts'
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?${GOOGLE_FONTS
      .map((family) => `family=${encodeURIComponent(family).replace(/%20/g, '+')}`)
      .join('&')}&display=swap&text=AaDesign.MD`
    document.head.appendChild(link)
    return () => link.remove()
  }, [])
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="font-modal" role="dialog" aria-modal="true" aria-label="Escolher fonte Google Fonts">
        <header>
          <div><Type size={18} /><span><b>Google Fonts</b><small>Escolha fonte para Design.MD</small></span></div>
          <button onClick={onClose}>×</button>
        </header>
        <div className="font-search">
          <input autoFocus placeholder="Buscar fonte..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <span>{fonts.length} fontes</span>
        </div>
        <div className="font-grid">
          {fonts.map((font) => (
            <button
              key={font}
              className={font === selected ? 'selected' : ''}
              style={{ fontFamily: `"${font}", sans-serif` }}
              onClick={() => onSelect(font)}
            >
              <span>Aa</span>
              <b>{font}</b>
              <small>Design.MD</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function EditorSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="form-section">
      <div className="section-title"><h2>{title}</h2><p>{description}</p></div>
      {children}
    </div>
  )
}

function TokenGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="token-group"><h3>{title}</h3>{children}</section>
}

function Field({ label, value, multiline, onChange }: { label: string; value: string; multiline?: boolean; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} /> : <input value={value} onChange={(event) => onChange(event.target.value)} />}
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<[string, string]>
  onChange: (value: string) => void
}) {
  return (
    <label className="field select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  )
}

function ShadowControl({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="shadow-control">
      <div className="shadow-header">
        <span className="shadow-label">{label}</span>
        <span className="shadow-value">{value}</span>
      </div>
      <div className="shadow-preview-row">
        <div className="shadow-preview-box" style={{ boxShadow: value }} />
        <input
          className="shadow-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  )
}

function RadiusControl({
  label,
  help,
  value,
  max,
  onChange,
}: {
  label: string
  help: string
  value: string
  max: number
  onChange: (value: number) => void
}) {
  const numericValue = Math.max(0, Number.parseInt(value, 10) || 0)
  const update = (next: number) => onChange(Math.max(0, Math.round(next)))
  return (
    <div className="radius-control">
      <div className="radius-copy"><b>{label}</b><small>{help}</small></div>
      <input
        aria-label={`${label} slider`}
        type="range"
        min="0"
        max={max}
        step="1"
        value={Math.min(numericValue, max)}
        onChange={(event) => update(Number(event.target.value))}
      />
      <div className="number-stepper">
        <button aria-label={`Diminuir ${label}`} onClick={() => update(numericValue - 1)}><Minus size={13} /></button>
        <input
          aria-label={`${label} em pixels`}
          type="number"
          min="0"
          step="1"
          value={numericValue}
          onChange={(event) => update(Number(event.target.value))}
        />
        <span>px</span>
        <button aria-label={`Aumentar ${label}`} onClick={() => update(numericValue + 1)}><Plus size={13} /></button>
      </div>
    </div>
  )
}

type NumericConfig = {
  min: number
  max: number
  step: number
  defaultUnit: string
}

function numericConfigFor(property: keyof TypeStyle): NumericConfig {
  if (property === 'fontSize') return { min: 8, max: 144, step: 1, defaultUnit: 'px' }
  if (property === 'lineHeight') return { min: 0.8, max: 3, step: 0.01, defaultUnit: '' }
  return { min: -0.2, max: 0.5, step: 0.01, defaultUnit: 'em' }
}

function NumericControl({
  label,
  value,
  config,
  onChange,
}: {
  label: string
  value: string
  config: NumericConfig
  onChange: (value: string) => void
}) {
  const parsed = parseNumericToken(value, config.defaultUnit)
  const precision = String(config.step).includes('.') ? String(config.step).split('.')[1].length : 0
  const update = (next: number) => {
    const clamped = Math.min(config.max, Math.max(config.min, next))
    const rounded = Number(clamped.toFixed(precision))
    onChange(`${rounded}${parsed.unit}`)
  }
  return (
    <div className="numeric-control">
      <span>{label}</span>
      <input
        aria-label={`${label} slider`}
        type="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={Math.min(config.max, Math.max(config.min, parsed.number))}
        onChange={(event) => update(Number(event.target.value))}
      />
      <div className="number-stepper">
        <button aria-label={`Diminuir ${label}`} onClick={() => update(parsed.number - config.step)}><Minus size={13} /></button>
        <input
          aria-label={`${label} valor`}
          type="number"
          min={config.min}
          max={config.max}
          step={config.step}
          value={parsed.number}
          onChange={(event) => update(Number(event.target.value))}
        />
        <span>{parsed.unit || '—'}</span>
        <button aria-label={`Aumentar ${label}`} onClick={() => update(parsed.number + config.step)}><Plus size={13} /></button>
      </div>
    </div>
  )
}

function parseNumericToken(value: string, defaultUnit: string) {
  const number = Number.parseFloat(value)
  const unit = value.trim().match(/[a-z%]+$/i)?.[0] ?? defaultUnit
  return { number: Number.isFinite(number) ? number : 0, unit }
}

function readMarkdownSection(content: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = content.match(new RegExp(`^## ${escaped}\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'))
  return match?.[1].trim() || ''
}

function writeMarkdownSection(content: string, heading: string, value: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const section = `## ${heading}\n${value.trim()}`
  const pattern = new RegExp(`^## ${escaped}\\s*\\n[\\s\\S]*?(?=^## |(?![\\s\\S]))`, 'm')
  if (pattern.test(content)) return content.replace(pattern, `${section}\n\n`)
  return `${content.trim()}\n\n${section}\n`
}

function PreviewSite({ data }: { data: DesignData }) {
  return (
    <div className="preview-page">
      <nav className="demo-nav">
        <div className="demo-logo"><Sparkles size={20} /><span>Design</span></div>
        <div className="demo-links"><a>Como funciona</a><a>Tokens</a><a>Preview</a><a>Exportação</a></div>
        <button className="ghost-action">Importar</button>
        <button className="primary-action">Novo Design.MD</button>
      </nav>
      <section className="demo-hero">
        <div className="hero-copy">
          <span className="demo-label">Editando: {data.name}</span>
          <h1>Defina seu sistema.<em>Veja cada mudança.</em></h1>
          <p>Design transforma arquivos Design.MD em controles visuais. Ajuste cores, tipografia, espaçamento e componentes enquanto acompanha resultado neste preview.</p>
          <div className="hero-actions">
            <button className="primary-action">Começar novo arquivo</button>
            <button className="secondary-action">Importar Design.MD</button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-grid" />
          <div className="cube cube-one"><i /><i /><i /></div>
          <div className="cube cube-two"><i /><i /><i /></div>
          <div className="cube cube-three"><i /><i /><i /></div>
        </div>
      </section>
      <section className="feature-row">
        <PreviewCard icon={<Palette />} title="1. Configure tokens" text="Escolha cores, fontes, espaços e raios usando controles visuais." />
        <PreviewCard icon={<Monitor />} title="2. Acompanhe preview" text="Cada ajuste aparece imediatamente em componentes reais desta página." />
        <PreviewCard icon={<Download />} title="3. Exporte arquivo" text="Baixe Design.MD pronto para documentar e reutilizar sistema visual." />
      </section>
      <section className="code-block">
        <div className="code-header"><span><Code2 size={14} /> Estrutura Design.MD</span><div><b>YAML</b><span>Tokens</span><span>Markdown</span></div></div>
        <code>colors.primary: {data.colors.primary} · rounded.card: {data.rounded.card} · spacing.gap: {data.spacing.gap}</code>
        <button><Copy size={14} /></button>
      </section>
      <section className="form-preview">
        <div className="form-intro">
          <span className="demo-label">Preview de formulário</span>
          <h2>Componentes em contexto</h2>
          <p>Confira campos, estados, sombras e ícones usando mesmos tokens do arquivo.</p>
          <div className="state-preview">
            <button className="primary-action">Normal</button>
            <button className="primary-action forced-hover">Hover</button>
            <button className="primary-action forced-focus">Focus</button>
            <button className="primary-action" disabled>Disabled</button>
          </div>
        </div>
        <form className="demo-form" onSubmit={(event) => event.preventDefault()}>
          <label><span>Nome do projeto</span><input placeholder="Meu Design System" /></label>
          <label><span>Categoria</span><select defaultValue=""><option value="" disabled>Selecione</option><option>Produto digital</option><option>Aplicativo</option><option>Website</option></select></label>
          <label className="demo-check"><input type="checkbox" defaultChecked /><span>Salvar configurações localmente</span></label>
          <button className="primary-action">Criar Design.MD</button>
        </form>
      </section>
      <section className="bottom-feature">
        <div><h2>Seu trabalho fica neste navegador</h2><p>Projetos são salvos localmente. Nenhum arquivo ou configuração precisa sair do dispositivo.</p></div>
        <ul><li><Check /> Criação sem cadastro</li><li><Check /> Importação e exportação Markdown</li><li><Check /> Preview responsivo em tempo real</li></ul>
      </section>
    </div>
  )
}

function PreviewCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <article className="preview-card"><div>{icon}</div><h2>{title}</h2><p>{text}</p><a>Saiba mais <span>→</span></a></article>
}

export default App
