/** Mantém alvos de toque e evita zoom acidental por duplo toque nos botões. */
export class TouchControls{constructor(){this.handler=e=>{if(e.target.closest('button')&&e.touches?.length>1)e.preventDefault();};document.addEventListener('touchstart',this.handler,{passive:false});}dispose(){document.removeEventListener('touchstart',this.handler);}}
