import { BlockNode, BlockType } from '@/types'
import { uid } from './id'

const base = (type: BlockType, label: string, args: Record<string, unknown> = {}, children: BlockNode[] = [], elseChildren?: BlockNode[]): BlockNode => ({
  id: uid('block'),
  type,
  label,
  args,
  children,
  elseChildren,
})

export const blockTemplate = (type: BlockType): BlockNode => {
  switch (type) {
    case 'VAR_CREATE': return base(type, 'Variable erstellen', { name: 'value', value: 0 })
    case 'VAR_SET': return base(type, 'Variable setzen', { name: 'value', value: 0 })
    case 'VAR_GET': return base(type, 'Variable lesen', { name: 'value' })
    case 'IF': return base(type, 'IF', { left: 0, op: '==', right: 0 }, [], [])
    case 'ELSE': return base(type, 'ELSE')
    case 'AND': return base(type, 'AND', { a: true, b: true })
    case 'OR': return base(type, 'OR', { a: true, b: false })
    case 'NOT': return base(type, 'NOT', { value: false })
    case 'EQ': return base(type, '==', { a: 0, b: 0 })
    case 'NEQ': return base(type, '!=', { a: 0, b: 1 })
    case 'GT': return base(type, '>', { a: 1, b: 0 })
    case 'GTE': return base(type, '>=', { a: 1, b: 1 })
    case 'LT': return base(type, '<', { a: 0, b: 1 })
    case 'LTE': return base(type, '<=', { a: 0, b: 0 })
    case 'REPEAT': return base(type, 'Repeat', { count: 5 }, [])
    case 'WHILE': return base(type, 'While', { left: 0, op: '<', right: 10 }, [])
    case 'FOR': return base(type, 'For', { start: 0, end: 10, step: 1 }, [])
    case 'CALL_FUNCTION': return base(type, 'Funktion aufrufen', { name: 'Bounce', arg0: 'selected' })
    case 'RETURN': return base(type, 'Return', { value: null })
    case 'ADD': return base(type, '+', { a: 0, b: 0 })
    case 'SUBTRACT': return base(type, '-', { a: 0, b: 0 })
    case 'MULTIPLY': return base(type, '×', { a: 1, b: 1 })
    case 'DIVIDE': return base(type, '÷', { a: 1, b: 1 })
    case 'MODULO': return base(type, '%', { a: 1, b: 2 })
    case 'RANDOM': return base(type, 'Random', { min: 0, max: 1 })
    case 'CLAMP': return base(type, 'Clamp', { value: 0, min: 0, max: 1 })
    case 'GO_FORWARD': return base(type, 'GO_FORWARD', { target: 'selected', distance: 2 })
    case 'GO_BACK': return base(type, 'GO_BACK', { target: 'selected', distance: 2 })
    case 'GO_LEFT': return base(type, 'GO_LEFT', { target: 'selected', distance: 2 })
    case 'GO_RIGHT': return base(type, 'GO_RIGHT', { target: 'selected', distance: 2 })
    case 'ROTATE': return base(type, 'ROTATE', { target: 'selected', degrees: 1 })
    case 'MOVE_TO': return base(type, 'MOVE_TO', { target: 'selected', x: 100, y: 100 })
    default: return base(type, type)
  }
}

export const isContainerBlock = (type: BlockType) =>
  type === 'IF' || type === 'REPEAT' || type === 'WHILE' || type === 'FOR'
