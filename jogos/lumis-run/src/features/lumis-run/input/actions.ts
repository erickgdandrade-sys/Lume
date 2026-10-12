/** Ações semânticas, iguais para teclado, toque e controle. */
export type InputAction = 'left' | 'right' | 'up' | 'down' | 'confirm' | 'back' | 'pause' | 'help' | 'disconnect'
export type InputDevice = 'keyboard' | 'touch' | 'gamepad'
/** contexto atual: em "game" as setas viram comandos da Lumis; em "menu" navegam */
export type InputContext = 'menu' | 'game' | 'text'
export type InputListener = (action: InputAction, device: InputDevice) => void
