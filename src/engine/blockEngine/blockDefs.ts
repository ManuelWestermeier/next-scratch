import type { BlockType, BlockCategory } from '../../types'

export interface BlockDef {
  type: BlockType
  category: BlockCategory
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: string
  description: string
  hasChildren?: boolean
  hasElse?: boolean
  isContainer?: boolean
}

const defs: BlockDef[] = [
  { type: 'setup',        category: 'lifecycle', label: 'Bei Start',      color: '#fbbf24', bgColor: '#451a03', borderColor: '#92400e', icon: '▶', description: 'Wird einmal beim Start ausgeführt', hasChildren: true, isContainer: true },
  { type: 'loop_tick',    category: 'lifecycle', label: 'Jeder Frame',    color: '#fbbf24', bgColor: '#451a03', borderColor: '#92400e', icon: '🔄', description: 'Wird jeden Frame ausgeführt', hasChildren: true, isContainer: true },
  { type: 'on_click',     category: 'lifecycle', label: 'Bei Klick',      color: '#fbbf24', bgColor: '#451a03', borderColor: '#92400e', icon: '🖱', description: 'Wird bei Klick auf das Objekt ausgelöst', hasChildren: true, isContainer: true },
  { type: 'on_key_down',  category: 'lifecycle', label: 'Bei Taste',      color: '#fbbf24', bgColor: '#451a03', borderColor: '#92400e', icon: '⌨', description: 'Wird bei Tastendruck ausgelöst', hasChildren: true, isContainer: true },

  { type: 'var_declare', category: 'variable', label: 'Variable erstellen', color: '#fb923c', bgColor: '#431407', borderColor: '#9a3412', icon: '📦', description: 'Erstellt eine neue Variable' },
  { type: 'var_set',     category: 'variable', label: 'Variable setzen',   color: '#fb923c', bgColor: '#431407', borderColor: '#9a3412', icon: '✏️', description: 'Setzt den Wert einer Variable' },
  { type: 'var_get',     category: 'variable', label: 'Variable lesen',    color: '#fb923c', bgColor: '#431407', borderColor: '#9a3412', icon: '📖', description: 'Liest den Wert einer Variable' },

  { type: 'if',         category: 'logic', label: 'Wenn',         color: '#facc15', bgColor: '#422006', borderColor: '#854d0e', icon: '❓', description: 'Wenn-Bedingung', hasChildren: true },
  { type: 'if_else',    category: 'logic', label: 'Wenn / Sonst', color: '#facc15', bgColor: '#422006', borderColor: '#854d0e', icon: '⟨⟩', description: 'Wenn-Sonst-Verzweigung', hasChildren: true, hasElse: true },
  { type: 'compare',    category: 'logic', label: 'Vergleich',    color: '#a3e635', bgColor: '#1a2e05', borderColor: '#3f6212', icon: '⚖️', description: 'Vergleicht zwei Werte' },
  { type: 'and',        category: 'logic', label: 'UND',          color: '#a3e635', bgColor: '#1a2e05', borderColor: '#3f6212', icon: '∧', description: 'Logisches UND' },
  { type: 'or',         category: 'logic', label: 'ODER',         color: '#a3e635', bgColor: '#1a2e05', borderColor: '#3f6212', icon: '∨', description: 'Logisches ODER' },
  { type: 'not',        category: 'logic', label: 'NICHT',        color: '#a3e635', bgColor: '#1a2e05', borderColor: '#3f6212', icon: '¬', description: 'Logische Negation' },

  { type: 'repeat',     category: 'loop', label: 'Wiederhole',          color: '#34d399', bgColor: '#022c22', borderColor: '#065f46', icon: '🔁', description: 'Wiederholt N mal', hasChildren: true },
  { type: 'while',      category: 'loop', label: 'Solange',             color: '#34d399', bgColor: '#022c22', borderColor: '#065f46', icon: '♾️', description: 'Schleife mit Bedingung', hasChildren: true },
  { type: 'for',        category: 'loop', label: 'Für (Zählerschleife)', color: '#34d399', bgColor: '#022c22', borderColor: '#065f46', icon: '🔢', description: 'Zählerschleife', hasChildren: true },

  { type: 'func_declare', category: 'function', label: 'Funktion definieren', color: '#818cf8', bgColor: '#1e1b4b', borderColor: '#3730a3', icon: 'ƒ', description: 'Definiert eine wiederverwendbare Funktion', hasChildren: true, isContainer: true },
  { type: 'func_call',    category: 'function', label: 'Funktion aufrufen',   color: '#818cf8', bgColor: '#1e1b4b', borderColor: '#3730a3', icon: '→ƒ', description: 'Ruft eine Funktion auf' },
  { type: 'return',       category: 'function', label: 'Rückgabe',             color: '#818cf8', bgColor: '#1e1b4b', borderColor: '#3730a3', icon: '↩', description: 'Gibt einen Wert zurück' },

  { type: 'math_add',    category: 'math', label: 'Addieren',      color: '#38bdf8', bgColor: '#082f49', borderColor: '#0c4a6e', icon: '+', description: 'a + b' },
  { type: 'math_sub',    category: 'math', label: 'Subtrahieren',  color: '#38bdf8', bgColor: '#082f49', borderColor: '#0c4a6e', icon: '−', description: 'a − b' },
  { type: 'math_mul',    category: 'math', label: 'Multiplizieren', color: '#38bdf8', bgColor: '#082f49', borderColor: '#0c4a6e', icon: '×', description: 'a × b' },
  { type: 'math_div',    category: 'math', label: 'Dividieren',    color: '#38bdf8', bgColor: '#082f49', borderColor: '#0c4a6e', icon: '÷', description: 'a ÷ b' },
  { type: 'math_mod',    category: 'math', label: 'Modulo',        color: '#38bdf8', bgColor: '#082f49', borderColor: '#0c4a6e', icon: '%', description: 'Rest von a ÷ b' },
  { type: 'math_random', category: 'math', label: 'Zufall',        color: '#38bdf8', bgColor: '#082f49', borderColor: '#0c4a6e', icon: '🎲', description: 'Zufallszahl zwischen min und max' },
  { type: 'math_clamp',  category: 'math', label: 'Begrenzen',     color: '#38bdf8', bgColor: '#082f49', borderColor: '#0c4a6e', icon: '⊡', description: 'Begrenzt einen Wert auf [min, max]' },
  { type: 'math_number', category: 'math', label: 'Zahl',          color: '#38bdf8', bgColor: '#082f49', borderColor: '#0c4a6e', icon: '#', description: 'Ein fester Zahlenwert' },

  { type: 'move_forward', category: 'motion', label: 'Vorwärts',  color: '#c084fc', bgColor: '#2e1065', borderColor: '#6b21a8', icon: '↑', description: 'Bewegt das Objekt nach oben' },
  { type: 'move_back',    category: 'motion', label: 'Rückwärts', color: '#c084fc', bgColor: '#2e1065', borderColor: '#6b21a8', icon: '↓', description: 'Bewegt das Objekt nach unten' },
  { type: 'move_left',    category: 'motion', label: 'Links',     color: '#c084fc', bgColor: '#2e1065', borderColor: '#6b21a8', icon: '←', description: 'Bewegt das Objekt nach links' },
  { type: 'move_right',   category: 'motion', label: 'Rechts',    color: '#c084fc', bgColor: '#2e1065', borderColor: '#6b21a8', icon: '→', description: 'Bewegt das Objekt nach rechts' },
  { type: 'rotate',       category: 'motion', label: 'Drehen',    color: '#c084fc', bgColor: '#2e1065', borderColor: '#6b21a8', icon: '↻', description: 'Dreht das Objekt um N Grad' },
  { type: 'move_to',      category: 'motion', label: 'Gehe zu',   color: '#c084fc', bgColor: '#2e1065', borderColor: '#6b21a8', icon: '⊕', description: 'Bewegt das Objekt zu einer Position' },

  { type: 'wait',    category: 'control', label: 'Warten',  color: '#94a3b8', bgColor: '#0f172a', borderColor: '#334155', icon: '⏳', description: 'Wartet N Millisekunden' },
  { type: 'stop',    category: 'control', label: 'Stoppen', color: '#f43f5e', bgColor: '#4c0519', borderColor: '#9f1239', icon: '⏹', description: 'Stoppt die Ausführung' },
  { type: 'comment', category: 'control', label: 'Kommentar', color: '#94a3b8', bgColor: '#0f172a', borderColor: '#334155', icon: '💬', description: 'Ein Kommentar (wird nicht ausgeführt)' },
]

export const blockDefs: Map<BlockType, BlockDef> = new Map(defs.map(d => [d.type, d]))

export const blocksByCategory: Record<BlockCategory, BlockDef[]> = {
  lifecycle: defs.filter(d => d.category === 'lifecycle'),
  variable: defs.filter(d => d.category === 'variable'),
  logic: defs.filter(d => d.category === 'logic'),
  loop: defs.filter(d => d.category === 'loop'),
  function: defs.filter(d => d.category === 'function'),
  math: defs.filter(d => d.category === 'math'),
  motion: defs.filter(d => d.category === 'motion'),
  control: defs.filter(d => d.category === 'control'),
}

export const categoryLabels: Record<BlockCategory, string> = {
  lifecycle: 'Lebenszyklus',
  variable:  'Variablen',
  logic:     'Logik',
  loop:      'Schleifen',
  function:  'Funktionen',
  math:      'Mathematik',
  motion:    'Bewegung',
  control:   'Steuerung',
}

export const categoryColors: Record<BlockCategory, string> = {
  lifecycle: '#fbbf24',
  variable:  '#fb923c',
  logic:     '#facc15',
  loop:      '#34d399',
  function:  '#818cf8',
  math:      '#38bdf8',
  motion:    '#c084fc',
  control:   '#94a3b8',
}
