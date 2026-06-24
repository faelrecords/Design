import yaml from 'js-yaml'

export type TokenMap = Record<string, string>
export type TypeStyle = {
  fontFamily: string
  fontSize: string
  fontWeight: number
  lineHeight: string
  letterSpacing?: string
}

export type DesignData = {
  version: string
  name: string
  description: string
  colors: TokenMap
  typography: Record<string, TypeStyle>
  googleFonts: string[]
  spacing: TokenMap
  rounded: TokenMap
  components: Record<string, TokenMap>
  content: string
}

export const emptyDesign: DesignData = {
  version: '1.0.0',
  name: 'Novo Design',
  description: 'Sistema visual criado no editor Design.',
  colors: {
    primary: '#45E58B',
    secondary: '#FFFFFF',
    accent: '#9CF7C5',
    background: '#080B0A',
    surface: '#121715',
    'text-primary': '#F3F7F5',
    'text-secondary': '#94A29B',
    border: '#26302B',
  },
  typography: {
    'display-lg': {
      fontFamily: 'Inter',
      fontSize: '64px',
      fontWeight: 600,
      lineHeight: '1.04',
      letterSpacing: '-0.04em',
    },
    'body-md': {
      fontFamily: 'Inter',
      fontSize: '16px',
      fontWeight: 400,
      lineHeight: '1.6',
    },
    'label-md': {
      fontFamily: 'JetBrains Mono',
      fontSize: '12px',
      fontWeight: 600,
      lineHeight: '1.2',
    },
  },
  googleFonts: ['Inter', 'JetBrains Mono'],
  spacing: {
    base: '8px',
    gap: '16px',
    'card-padding': '24px',
    'section-padding': '80px',
  },
  rounded: { card: '16px', control: '10px', pill: '9999px' },
  components: {
    card: {
      background: 'Use o token surface com borda sutil',
      radius: 'Use o raio card',
    },
    button: {
      background: 'Use primary na ação principal',
      radius: 'Use o raio control',
    },
  },
  content: `# Novo Design
## Overview
Descreva objetivo, composição e comportamento visual.

## Composition
Preserve hierarquia clara, ritmo estável e foco na ação principal.

## Colors
Use os tokens conforme suas funções semânticas.

## Typography
Mantenha contraste entre display, corpo e rótulos.

## Layout
Use espaçamento consistente e responsivo.

## Components
Botões e cards devem compartilhar linguagem visual.

## Guardrails
- Não troque papéis semânticos das cores.
- Preserve contraste e legibilidade.
- Mantenha raios e bordas consistentes.`,
}

function normalize(data: Partial<DesignData>): DesignData {
  return {
    ...structuredClone(emptyDesign),
    ...data,
    colors: { ...emptyDesign.colors, ...(data.colors || {}) },
    typography: { ...emptyDesign.typography, ...(data.typography || {}) },
    googleFonts: data.googleFonts || Array.from(new Set(
      Object.values(data.typography || emptyDesign.typography).map((style) => style.fontFamily),
    )),
    spacing: { ...emptyDesign.spacing, ...(data.spacing || {}) },
    rounded: { ...emptyDesign.rounded, ...(data.rounded || {}) },
    components: { ...emptyDesign.components, ...(data.components || {}) },
    content: data.content || `# ${data.name || emptyDesign.name}`,
  }
}

export function parseDesign(raw: string): DesignData {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) throw new Error('Frontmatter YAML não encontrado.')
  const frontmatter = (yaml.load(match[1]) || {}) as Partial<DesignData>
  return normalize({ ...frontmatter, content: match[2].trim() })
}

export function serializeDesign(data: DesignData): string {
  const { content, ...frontmatter } = data
  return `---\n${yaml.dump(frontmatter, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: true,
  })}---\n${content.trim()}\n`
}

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
