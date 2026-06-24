import {
  Braces,
  Check,
  ChevronDown,
  CircleHelp,
  Code2,
  Copy,
  Download,
  FilePlus2,
  FolderOpen,
  Github,
  Grid2X2,
  Laptop,
  LayoutTemplate,
  Maximize2,
  Monitor,
  Moon,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
  Tablet,
  Type,
  Upload,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { emptyDesign, parseDesign, serializeDesign, slugify, type DesignData, type TypeStyle } from './design'
import { examples, type StoredDesign } from './examples'

const STORAGE_KEY = 'design-md-editor-v1'
const LAST_KEY = 'design-md-editor-last'

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
    return value.filter((item) => item?.id && item?.data?.name && item?.data?.colors)
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
  const fileInput = useRef<HTMLInputElement>(null)

  const active = documents.find((doc) => doc.id === activeId) || documents[0]
  const data = active?.data || emptyDesign

  useEffect(() => {
    if (!active) return
    setRaw(serializeDesign(active.data))
    setRawError('')
    localStorage.setItem(LAST_KEY, active.id)
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents))
    }, 250)
    return () => clearTimeout(timer)
  }, [documents])

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
        '--card-padding': data.spacing['card-padding'],
        '--display-font': data.typography['display-lg']?.fontFamily || 'Inter',
        '--display-size': data.typography['display-lg']?.fontSize || '64px',
        '--display-weight': data.typography['display-lg']?.fontWeight || 600,
        '--body-font': data.typography['body-md']?.fontFamily || 'Inter',
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
        <a className="icon-link" href="https://github.com/faelrecords/Design" target="_blank" rel="noreferrer">
          <Github size={17} />
        </a>
        <button className="theme-button" aria-label="Tema escuro">
          <Moon size={15} /> <span>Tema</span>
        </button>
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
                <NavButton icon={<Maximize2 />} label="Raios" active={section === 'rounded'} onClick={() => setSection('rounded')} />
                <NavButton icon={<Braces />} label="Componentes" active={section === 'components'} onClick={() => setSection('components')} />
                <NavButton icon={<Code2 />} label="Conteúdo" active={section === 'content'} onClick={() => setSection('content')} />
                <div className="nav-spacer" />
                <NavButton icon={<CircleHelp />} label="Sobre" onClick={() => setSection('about')} />
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
                  <FormEditor data={data} section={section} setField={setField} />
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

      <footer className="statusbar">
        <div><span className="status-dot" /> Salvo automaticamente no navegador</div>
        <div className="status-tag">LocalStorage</div>
        <div className="status-spacer" />
        <div><Check size={14} /> Design.MD válido</div>
        <div>Versão {data.version}</div>
        <div>{serializeDesign(data).split('\n').length} linhas</div>
      </footer>
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
}: {
  data: DesignData
  section: string
  setField: <K extends keyof DesignData>(key: K, value: DesignData[K]) => void
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
              <Field
                key={property}
                label={property}
                value={String(style[property] ?? '')}
                onChange={(value) =>
                  setField('typography', {
                    ...data.typography,
                    [key]: {
                      ...style,
                      [property]: property === 'fontWeight' ? Number(value) : value,
                    },
                  })
                }
              />
            ))}
          </TokenGroup>
        ))}
      </EditorSection>
    )
  }

  if (section === 'spacing' || section === 'rounded') {
    const values = data[section]
    return (
      <EditorSection title={section === 'spacing' ? 'Espaçamento' : 'Raios'} description="Escala compartilhada entre componentes.">
        {Object.entries(values).map(([key, value]) => (
          <Field key={key} label={key} value={value} onChange={(next) => setField(section, { ...values, [key]: next })} />
        ))}
      </EditorSection>
    )
  }

  if (section === 'components') {
    return (
      <EditorSection title="Componentes" description="Regras para elementos recorrentes.">
        {Object.entries(data.components).map(([component, values]) => (
          <TokenGroup key={component} title={component}>
            {Object.entries(values).map(([key, value]) => (
              <Field
                key={key}
                label={key}
                value={value}
                multiline
                onChange={(next) => setField('components', { ...data.components, [component]: { ...values, [key]: next } })}
              />
            ))}
          </TokenGroup>
        ))}
      </EditorSection>
    )
  }

  if (section === 'content') {
    return (
      <EditorSection title="Conteúdo" description="Instruções Markdown após frontmatter.">
        <label className="field stacked">
          <span>Markdown</span>
          <textarea className="content-textarea" value={data.content} onChange={(event) => setField('content', event.target.value)} />
        </label>
      </EditorSection>
    )
  }

  if (section === 'about') {
    return (
      <EditorSection title="Sobre Design" description="Editor visual para Design.MD.">
        <div className="about-block">
          <Sparkles size={24} />
          <h3>Design</h3>
          <p>Crie, importe, edite e exporte sistemas visuais em Design.MD.</p>
          <p>Dados ficam somente neste navegador.</p>
          <a href="https://github.com/faelrecords/Design" target="_blank" rel="noreferrer"><Github size={15} /> Abrir GitHub</a>
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

function PreviewSite({ data }: { data: DesignData }) {
  const title = data.name.replace(/\s*[-/|].*$/, '') || data.name
  return (
    <div className="preview-page">
      <nav className="demo-nav">
        <div className="demo-logo"><Sparkles size={20} /><span>{title}</span></div>
        <div className="demo-links"><a>Produto</a><a>Recursos</a><a>Preços</a><a>Documentação</a></div>
        <button className="ghost-action">Entrar</button>
        <button className="primary-action">Começar agora</button>
      </nav>
      <section className="demo-hero">
        <div className="hero-copy">
          <span className="demo-label">Sistema conectado</span>
          <h1>Construa sem limites.<em>Escala real.</em></h1>
          <p>{data.description}</p>
          <div className="hero-actions">
            <button className="primary-action">Começar gratuitamente</button>
            <button className="secondary-action">Ver documentação</button>
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
        <PreviewCard icon={<Save />} title="Seguro por design" text="Estrutura resiliente, previsível e pronta para produção." />
        <PreviewCard icon={<Sparkles />} title="Performance global" text="Experiência rápida em qualquer dispositivo ou região." />
        <PreviewCard icon={<FolderOpen />} title="Sistema escalável" text="Tokens consistentes para produtos que continuam crescendo." />
      </section>
      <section className="code-block">
        <div className="code-header"><span><Code2 size={14} /> Instalação</span><div><b>NPM</b><span>Yarn</span><span>PNPM</span></div></div>
        <code>$ npm install @design/system</code>
        <button><Copy size={14} /></button>
      </section>
      <section className="bottom-feature">
        <div><h2>Feito para desenvolvedores</h2><p>Tokens claros, documentação completa e componentes reutilizáveis.</p></div>
        <ul><li><Check /> Sem dependências ocultas</li><li><Check /> Pronto para produção</li><li><Check /> Exportação direta</li></ul>
      </section>
    </div>
  )
}

function PreviewCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <article className="preview-card"><div>{icon}</div><h2>{title}</h2><p>{text}</p><a>Saiba mais <span>→</span></a></article>
}

export default App
