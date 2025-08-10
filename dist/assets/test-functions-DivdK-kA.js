(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const l of n)if(l.type==="childList")for(const r of l.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function e(n){const l={};return n.integrity&&(l.integrity=n.integrity),n.referrerPolicy&&(l.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?l.credentials="include":n.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function i(n){if(n.ep)return;n.ep=!0;const l=e(n);fetch(n.href,l)}})();/**
 * lil-gui
 * https://lil-gui.georgealways.com
 * @version 0.20.0
 * @author George Michael Brower
 * @license MIT
 */class x{constructor(t,e,i,n,l="div"){this.parent=t,this.object=e,this.property=i,this._disabled=!1,this._hidden=!1,this.initialValue=this.getValue(),this.domElement=document.createElement(l),this.domElement.classList.add("controller"),this.domElement.classList.add(n),this.$name=document.createElement("div"),this.$name.classList.add("name"),x.nextNameID=x.nextNameID||0,this.$name.id=`lil-gui-name-${++x.nextNameID}`,this.$widget=document.createElement("div"),this.$widget.classList.add("widget"),this.$disable=this.$widget,this.domElement.appendChild(this.$name),this.domElement.appendChild(this.$widget),this.domElement.addEventListener("keydown",r=>r.stopPropagation()),this.domElement.addEventListener("keyup",r=>r.stopPropagation()),this.parent.children.push(this),this.parent.controllers.push(this),this.parent.$children.appendChild(this.domElement),this._listenCallback=this._listenCallback.bind(this),this.name(i)}name(t){return this._name=t,this.$name.textContent=t,this}onChange(t){return this._onChange=t,this}_callOnChange(){this.parent._callOnChange(this),this._onChange!==void 0&&this._onChange.call(this,this.getValue()),this._changed=!0}onFinishChange(t){return this._onFinishChange=t,this}_callOnFinishChange(){this._changed&&(this.parent._callOnFinishChange(this),this._onFinishChange!==void 0&&this._onFinishChange.call(this,this.getValue())),this._changed=!1}reset(){return this.setValue(this.initialValue),this._callOnFinishChange(),this}enable(t=!0){return this.disable(!t)}disable(t=!0){return t===this._disabled?this:(this._disabled=t,this.domElement.classList.toggle("disabled",t),this.$disable.toggleAttribute("disabled",t),this)}show(t=!0){return this._hidden=!t,this.domElement.style.display=this._hidden?"none":"",this}hide(){return this.show(!1)}options(t){const e=this.parent.add(this.object,this.property,t);return e.name(this._name),this.destroy(),e}min(t){return this}max(t){return this}step(t){return this}decimals(t){return this}listen(t=!0){return this._listening=t,this._listenCallbackID!==void 0&&(cancelAnimationFrame(this._listenCallbackID),this._listenCallbackID=void 0),this._listening&&this._listenCallback(),this}_listenCallback(){this._listenCallbackID=requestAnimationFrame(this._listenCallback);const t=this.save();t!==this._listenPrevValue&&this.updateDisplay(),this._listenPrevValue=t}getValue(){return this.object[this.property]}setValue(t){return this.getValue()!==t&&(this.object[this.property]=t,this._callOnChange(),this.updateDisplay()),this}updateDisplay(){return this}load(t){return this.setValue(t),this._callOnFinishChange(),this}save(){return this.getValue()}destroy(){this.listen(!1),this.parent.children.splice(this.parent.children.indexOf(this),1),this.parent.controllers.splice(this.parent.controllers.indexOf(this),1),this.parent.$children.removeChild(this.domElement)}}class H extends x{constructor(t,e,i){super(t,e,i,"boolean","label"),this.$input=document.createElement("input"),this.$input.setAttribute("type","checkbox"),this.$input.setAttribute("aria-labelledby",this.$name.id),this.$widget.appendChild(this.$input),this.$input.addEventListener("change",()=>{this.setValue(this.$input.checked),this._callOnFinishChange()}),this.$disable=this.$input,this.updateDisplay()}updateDisplay(){return this.$input.checked=this.getValue(),this}}function N(s){let t,e;return(t=s.match(/(#|0x)?([a-f0-9]{6})/i))?e=t[2]:(t=s.match(/rgb\(\s*(\d*)\s*,\s*(\d*)\s*,\s*(\d*)\s*\)/))?e=parseInt(t[1]).toString(16).padStart(2,0)+parseInt(t[2]).toString(16).padStart(2,0)+parseInt(t[3]).toString(16).padStart(2,0):(t=s.match(/^#?([a-f0-9])([a-f0-9])([a-f0-9])$/i))&&(e=t[1]+t[1]+t[2]+t[2]+t[3]+t[3]),e?"#"+e:!1}const B={isPrimitive:!0,match:s=>typeof s=="string",fromHexString:N,toHexString:N},S={isPrimitive:!0,match:s=>typeof s=="number",fromHexString:s=>parseInt(s.substring(1),16),toHexString:s=>"#"+s.toString(16).padStart(6,0)},G={isPrimitive:!1,match:s=>Array.isArray(s),fromHexString(s,t,e=1){const i=S.fromHexString(s);t[0]=(i>>16&255)/255*e,t[1]=(i>>8&255)/255*e,t[2]=(i&255)/255*e},toHexString([s,t,e],i=1){i=255/i;const n=s*i<<16^t*i<<8^e*i<<0;return S.toHexString(n)}},W={isPrimitive:!1,match:s=>Object(s)===s,fromHexString(s,t,e=1){const i=S.fromHexString(s);t.r=(i>>16&255)/255*e,t.g=(i>>8&255)/255*e,t.b=(i&255)/255*e},toHexString({r:s,g:t,b:e},i=1){i=255/i;const n=s*i<<16^t*i<<8^e*i<<0;return S.toHexString(n)}},X=[B,S,G,W];function j(s){return X.find(t=>t.match(s))}class R extends x{constructor(t,e,i,n){super(t,e,i,"color"),this.$input=document.createElement("input"),this.$input.setAttribute("type","color"),this.$input.setAttribute("tabindex",-1),this.$input.setAttribute("aria-labelledby",this.$name.id),this.$text=document.createElement("input"),this.$text.setAttribute("type","text"),this.$text.setAttribute("spellcheck","false"),this.$text.setAttribute("aria-labelledby",this.$name.id),this.$display=document.createElement("div"),this.$display.classList.add("display"),this.$display.appendChild(this.$input),this.$widget.appendChild(this.$display),this.$widget.appendChild(this.$text),this._format=j(this.initialValue),this._rgbScale=n,this._initialValueHexString=this.save(),this._textFocused=!1,this.$input.addEventListener("input",()=>{this._setValueFromHexString(this.$input.value)}),this.$input.addEventListener("blur",()=>{this._callOnFinishChange()}),this.$text.addEventListener("input",()=>{const l=N(this.$text.value);l&&this._setValueFromHexString(l)}),this.$text.addEventListener("focus",()=>{this._textFocused=!0,this.$text.select()}),this.$text.addEventListener("blur",()=>{this._textFocused=!1,this.updateDisplay(),this._callOnFinishChange()}),this.$disable=this.$text,this.updateDisplay()}reset(){return this._setValueFromHexString(this._initialValueHexString),this}_setValueFromHexString(t){if(this._format.isPrimitive){const e=this._format.fromHexString(t);this.setValue(e)}else this._format.fromHexString(t,this.getValue(),this._rgbScale),this._callOnChange(),this.updateDisplay()}save(){return this._format.toHexString(this.getValue(),this._rgbScale)}load(t){return this._setValueFromHexString(t),this._callOnFinishChange(),this}updateDisplay(){return this.$input.value=this._format.toHexString(this.getValue(),this._rgbScale),this._textFocused||(this.$text.value=this.$input.value.substring(1)),this.$display.style.backgroundColor=this.$input.value,this}}class L extends x{constructor(t,e,i){super(t,e,i,"function"),this.$button=document.createElement("button"),this.$button.appendChild(this.$name),this.$widget.appendChild(this.$button),this.$button.addEventListener("click",n=>{n.preventDefault(),this.getValue().call(this.object),this._callOnChange()}),this.$button.addEventListener("touchstart",()=>{},{passive:!0}),this.$disable=this.$button}}class J extends x{constructor(t,e,i,n,l,r){super(t,e,i,"number"),this._initInput(),this.min(n),this.max(l);const a=r!==void 0;this.step(a?r:this._getImplicitStep(),a),this.updateDisplay()}decimals(t){return this._decimals=t,this.updateDisplay(),this}min(t){return this._min=t,this._onUpdateMinMax(),this}max(t){return this._max=t,this._onUpdateMinMax(),this}step(t,e=!0){return this._step=t,this._stepExplicit=e,this}updateDisplay(){const t=this.getValue();if(this._hasSlider){let e=(t-this._min)/(this._max-this._min);e=Math.max(0,Math.min(e,1)),this.$fill.style.width=e*100+"%"}return this._inputFocused||(this.$input.value=this._decimals===void 0?t:t.toFixed(this._decimals)),this}_initInput(){this.$input=document.createElement("input"),this.$input.setAttribute("type","text"),this.$input.setAttribute("aria-labelledby",this.$name.id),window.matchMedia("(pointer: coarse)").matches&&(this.$input.setAttribute("type","number"),this.$input.setAttribute("step","any")),this.$widget.appendChild(this.$input),this.$disable=this.$input;const e=()=>{let o=parseFloat(this.$input.value);isNaN(o)||(this._stepExplicit&&(o=this._snap(o)),this.setValue(this._clamp(o)))},i=o=>{const c=parseFloat(this.$input.value);isNaN(c)||(this._snapClampSetValue(c+o),this.$input.value=this.getValue())},n=o=>{o.key==="Enter"&&this.$input.blur(),o.code==="ArrowUp"&&(o.preventDefault(),i(this._step*this._arrowKeyMultiplier(o))),o.code==="ArrowDown"&&(o.preventDefault(),i(this._step*this._arrowKeyMultiplier(o)*-1))},l=o=>{this._inputFocused&&(o.preventDefault(),i(this._step*this._normalizeMouseWheel(o)))};let r=!1,a,h,u,g,p;const f=5,v=o=>{a=o.clientX,h=u=o.clientY,r=!0,g=this.getValue(),p=0,window.addEventListener("mousemove",b),window.addEventListener("mouseup",A)},b=o=>{if(r){const c=o.clientX-a,y=o.clientY-h;Math.abs(y)>f?(o.preventDefault(),this.$input.blur(),r=!1,this._setDraggingStyle(!0,"vertical")):Math.abs(c)>f&&A()}if(!r){const c=o.clientY-u;p-=c*this._step*this._arrowKeyMultiplier(o),g+p>this._max?p=this._max-g:g+p<this._min&&(p=this._min-g),this._snapClampSetValue(g+p)}u=o.clientY},A=()=>{this._setDraggingStyle(!1,"vertical"),this._callOnFinishChange(),window.removeEventListener("mousemove",b),window.removeEventListener("mouseup",A)},E=()=>{this._inputFocused=!0},d=()=>{this._inputFocused=!1,this.updateDisplay(),this._callOnFinishChange()};this.$input.addEventListener("input",e),this.$input.addEventListener("keydown",n),this.$input.addEventListener("wheel",l,{passive:!1}),this.$input.addEventListener("mousedown",v),this.$input.addEventListener("focus",E),this.$input.addEventListener("blur",d)}_initSlider(){this._hasSlider=!0,this.$slider=document.createElement("div"),this.$slider.classList.add("slider"),this.$fill=document.createElement("div"),this.$fill.classList.add("fill"),this.$slider.appendChild(this.$fill),this.$widget.insertBefore(this.$slider,this.$input),this.domElement.classList.add("hasSlider");const t=(d,o,c,y,$)=>(d-o)/(c-o)*($-y)+y,e=d=>{const o=this.$slider.getBoundingClientRect();let c=t(d,o.left,o.right,this._min,this._max);this._snapClampSetValue(c)},i=d=>{this._setDraggingStyle(!0),e(d.clientX),window.addEventListener("mousemove",n),window.addEventListener("mouseup",l)},n=d=>{e(d.clientX)},l=()=>{this._callOnFinishChange(),this._setDraggingStyle(!1),window.removeEventListener("mousemove",n),window.removeEventListener("mouseup",l)};let r=!1,a,h;const u=d=>{d.preventDefault(),this._setDraggingStyle(!0),e(d.touches[0].clientX),r=!1},g=d=>{d.touches.length>1||(this._hasScrollBar?(a=d.touches[0].clientX,h=d.touches[0].clientY,r=!0):u(d),window.addEventListener("touchmove",p,{passive:!1}),window.addEventListener("touchend",f))},p=d=>{if(r){const o=d.touches[0].clientX-a,c=d.touches[0].clientY-h;Math.abs(o)>Math.abs(c)?u(d):(window.removeEventListener("touchmove",p),window.removeEventListener("touchend",f))}else d.preventDefault(),e(d.touches[0].clientX)},f=()=>{this._callOnFinishChange(),this._setDraggingStyle(!1),window.removeEventListener("touchmove",p),window.removeEventListener("touchend",f)},v=this._callOnFinishChange.bind(this),b=400;let A;const E=d=>{if(Math.abs(d.deltaX)<Math.abs(d.deltaY)&&this._hasScrollBar)return;d.preventDefault();const c=this._normalizeMouseWheel(d)*this._step;this._snapClampSetValue(this.getValue()+c),this.$input.value=this.getValue(),clearTimeout(A),A=setTimeout(v,b)};this.$slider.addEventListener("mousedown",i),this.$slider.addEventListener("touchstart",g,{passive:!1}),this.$slider.addEventListener("wheel",E,{passive:!1})}_setDraggingStyle(t,e="horizontal"){this.$slider&&this.$slider.classList.toggle("active",t),document.body.classList.toggle("lil-gui-dragging",t),document.body.classList.toggle(`lil-gui-${e}`,t)}_getImplicitStep(){return this._hasMin&&this._hasMax?(this._max-this._min)/1e3:.1}_onUpdateMinMax(){!this._hasSlider&&this._hasMin&&this._hasMax&&(this._stepExplicit||this.step(this._getImplicitStep(),!1),this._initSlider(),this.updateDisplay())}_normalizeMouseWheel(t){let{deltaX:e,deltaY:i}=t;return Math.floor(t.deltaY)!==t.deltaY&&t.wheelDelta&&(e=0,i=-t.wheelDelta/120,i*=this._stepExplicit?1:10),e+-i}_arrowKeyMultiplier(t){let e=this._stepExplicit?1:10;return t.shiftKey?e*=10:t.altKey&&(e/=10),e}_snap(t){let e=0;return this._hasMin?e=this._min:this._hasMax&&(e=this._max),t-=e,t=Math.round(t/this._step)*this._step,t+=e,t=parseFloat(t.toPrecision(15)),t}_clamp(t){return t<this._min&&(t=this._min),t>this._max&&(t=this._max),t}_snapClampSetValue(t){this.setValue(this._clamp(this._snap(t)))}get _hasScrollBar(){const t=this.parent.root.$children;return t.scrollHeight>t.clientHeight}get _hasMin(){return this._min!==void 0}get _hasMax(){return this._max!==void 0}}class K extends x{constructor(t,e,i,n){super(t,e,i,"option"),this.$select=document.createElement("select"),this.$select.setAttribute("aria-labelledby",this.$name.id),this.$display=document.createElement("div"),this.$display.classList.add("display"),this.$select.addEventListener("change",()=>{this.setValue(this._values[this.$select.selectedIndex]),this._callOnFinishChange()}),this.$select.addEventListener("focus",()=>{this.$display.classList.add("focus")}),this.$select.addEventListener("blur",()=>{this.$display.classList.remove("focus")}),this.$widget.appendChild(this.$select),this.$widget.appendChild(this.$display),this.$disable=this.$select,this.options(n)}options(t){return this._values=Array.isArray(t)?t:Object.values(t),this._names=Array.isArray(t)?t:Object.keys(t),this.$select.replaceChildren(),this._names.forEach(e=>{const i=document.createElement("option");i.textContent=e,this.$select.appendChild(i)}),this.updateDisplay(),this}updateDisplay(){const t=this.getValue(),e=this._values.indexOf(t);return this.$select.selectedIndex=e,this.$display.textContent=e===-1?t:this._names[e],this}}class U extends x{constructor(t,e,i){super(t,e,i,"string"),this.$input=document.createElement("input"),this.$input.setAttribute("type","text"),this.$input.setAttribute("spellcheck","false"),this.$input.setAttribute("aria-labelledby",this.$name.id),this.$input.addEventListener("input",()=>{this.setValue(this.$input.value)}),this.$input.addEventListener("keydown",n=>{n.code==="Enter"&&this.$input.blur()}),this.$input.addEventListener("blur",()=>{this._callOnFinishChange()}),this.$widget.appendChild(this.$input),this.$disable=this.$input,this.updateDisplay()}updateDisplay(){return this.$input.value=this.getValue(),this}}var Z=`.lil-gui {
  font-family: var(--font-family);
  font-size: var(--font-size);
  line-height: 1;
  font-weight: normal;
  font-style: normal;
  text-align: left;
  color: var(--text-color);
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  --background-color: #1f1f1f;
  --text-color: #ebebeb;
  --title-background-color: #111111;
  --title-text-color: #ebebeb;
  --widget-color: #424242;
  --hover-color: #4f4f4f;
  --focus-color: #595959;
  --number-color: #2cc9ff;
  --string-color: #a2db3c;
  --font-size: 11px;
  --input-font-size: 11px;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  --font-family-mono: Menlo, Monaco, Consolas, "Droid Sans Mono", monospace;
  --padding: 4px;
  --spacing: 4px;
  --widget-height: 20px;
  --title-height: calc(var(--widget-height) + var(--spacing) * 1.25);
  --name-width: 45%;
  --slider-knob-width: 2px;
  --slider-input-width: 27%;
  --color-input-width: 27%;
  --slider-input-min-width: 45px;
  --color-input-min-width: 45px;
  --folder-indent: 7px;
  --widget-padding: 0 0 0 3px;
  --widget-border-radius: 2px;
  --checkbox-size: calc(0.75 * var(--widget-height));
  --scrollbar-width: 5px;
}
.lil-gui, .lil-gui * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
.lil-gui.root {
  width: var(--width, 245px);
  display: flex;
  flex-direction: column;
  background: var(--background-color);
}
.lil-gui.root > .title {
  background: var(--title-background-color);
  color: var(--title-text-color);
}
.lil-gui.root > .children {
  overflow-x: hidden;
  overflow-y: auto;
}
.lil-gui.root > .children::-webkit-scrollbar {
  width: var(--scrollbar-width);
  height: var(--scrollbar-width);
  background: var(--background-color);
}
.lil-gui.root > .children::-webkit-scrollbar-thumb {
  border-radius: var(--scrollbar-width);
  background: var(--focus-color);
}
@media (pointer: coarse) {
  .lil-gui.allow-touch-styles, .lil-gui.allow-touch-styles .lil-gui {
    --widget-height: 28px;
    --padding: 6px;
    --spacing: 6px;
    --font-size: 13px;
    --input-font-size: 16px;
    --folder-indent: 10px;
    --scrollbar-width: 7px;
    --slider-input-min-width: 50px;
    --color-input-min-width: 65px;
  }
}
.lil-gui.force-touch-styles, .lil-gui.force-touch-styles .lil-gui {
  --widget-height: 28px;
  --padding: 6px;
  --spacing: 6px;
  --font-size: 13px;
  --input-font-size: 16px;
  --folder-indent: 10px;
  --scrollbar-width: 7px;
  --slider-input-min-width: 50px;
  --color-input-min-width: 65px;
}
.lil-gui.autoPlace {
  max-height: 100%;
  position: fixed;
  top: 0;
  right: 15px;
  z-index: 1001;
}

.lil-gui .controller {
  display: flex;
  align-items: center;
  padding: 0 var(--padding);
  margin: var(--spacing) 0;
}
.lil-gui .controller.disabled {
  opacity: 0.5;
}
.lil-gui .controller.disabled, .lil-gui .controller.disabled * {
  pointer-events: none !important;
}
.lil-gui .controller > .name {
  min-width: var(--name-width);
  flex-shrink: 0;
  white-space: pre;
  padding-right: var(--spacing);
  line-height: var(--widget-height);
}
.lil-gui .controller .widget {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: var(--widget-height);
}
.lil-gui .controller.string input {
  color: var(--string-color);
}
.lil-gui .controller.boolean {
  cursor: pointer;
}
.lil-gui .controller.color .display {
  width: 100%;
  height: var(--widget-height);
  border-radius: var(--widget-border-radius);
  position: relative;
}
@media (hover: hover) {
  .lil-gui .controller.color .display:hover:before {
    content: " ";
    display: block;
    position: absolute;
    border-radius: var(--widget-border-radius);
    border: 1px solid #fff9;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }
}
.lil-gui .controller.color input[type=color] {
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.lil-gui .controller.color input[type=text] {
  margin-left: var(--spacing);
  font-family: var(--font-family-mono);
  min-width: var(--color-input-min-width);
  width: var(--color-input-width);
  flex-shrink: 0;
}
.lil-gui .controller.option select {
  opacity: 0;
  position: absolute;
  width: 100%;
  max-width: 100%;
}
.lil-gui .controller.option .display {
  position: relative;
  pointer-events: none;
  border-radius: var(--widget-border-radius);
  height: var(--widget-height);
  line-height: var(--widget-height);
  max-width: 100%;
  overflow: hidden;
  word-break: break-all;
  padding-left: 0.55em;
  padding-right: 1.75em;
  background: var(--widget-color);
}
@media (hover: hover) {
  .lil-gui .controller.option .display.focus {
    background: var(--focus-color);
  }
}
.lil-gui .controller.option .display.active {
  background: var(--focus-color);
}
.lil-gui .controller.option .display:after {
  font-family: "lil-gui";
  content: "↕";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  padding-right: 0.375em;
}
.lil-gui .controller.option .widget,
.lil-gui .controller.option select {
  cursor: pointer;
}
@media (hover: hover) {
  .lil-gui .controller.option .widget:hover .display {
    background: var(--hover-color);
  }
}
.lil-gui .controller.number input {
  color: var(--number-color);
}
.lil-gui .controller.number.hasSlider input {
  margin-left: var(--spacing);
  width: var(--slider-input-width);
  min-width: var(--slider-input-min-width);
  flex-shrink: 0;
}
.lil-gui .controller.number .slider {
  width: 100%;
  height: var(--widget-height);
  background: var(--widget-color);
  border-radius: var(--widget-border-radius);
  padding-right: var(--slider-knob-width);
  overflow: hidden;
  cursor: ew-resize;
  touch-action: pan-y;
}
@media (hover: hover) {
  .lil-gui .controller.number .slider:hover {
    background: var(--hover-color);
  }
}
.lil-gui .controller.number .slider.active {
  background: var(--focus-color);
}
.lil-gui .controller.number .slider.active .fill {
  opacity: 0.95;
}
.lil-gui .controller.number .fill {
  height: 100%;
  border-right: var(--slider-knob-width) solid var(--number-color);
  box-sizing: content-box;
}

.lil-gui-dragging .lil-gui {
  --hover-color: var(--widget-color);
}
.lil-gui-dragging * {
  cursor: ew-resize !important;
}

.lil-gui-dragging.lil-gui-vertical * {
  cursor: ns-resize !important;
}

.lil-gui .title {
  height: var(--title-height);
  font-weight: 600;
  padding: 0 var(--padding);
  width: 100%;
  text-align: left;
  background: none;
  text-decoration-skip: objects;
}
.lil-gui .title:before {
  font-family: "lil-gui";
  content: "▾";
  padding-right: 2px;
  display: inline-block;
}
.lil-gui .title:active {
  background: var(--title-background-color);
  opacity: 0.75;
}
@media (hover: hover) {
  body:not(.lil-gui-dragging) .lil-gui .title:hover {
    background: var(--title-background-color);
    opacity: 0.85;
  }
  .lil-gui .title:focus {
    text-decoration: underline var(--focus-color);
  }
}
.lil-gui.root > .title:focus {
  text-decoration: none !important;
}
.lil-gui.closed > .title:before {
  content: "▸";
}
.lil-gui.closed > .children {
  transform: translateY(-7px);
  opacity: 0;
}
.lil-gui.closed:not(.transition) > .children {
  display: none;
}
.lil-gui.transition > .children {
  transition-duration: 300ms;
  transition-property: height, opacity, transform;
  transition-timing-function: cubic-bezier(0.2, 0.6, 0.35, 1);
  overflow: hidden;
  pointer-events: none;
}
.lil-gui .children:empty:before {
  content: "Empty";
  padding: 0 var(--padding);
  margin: var(--spacing) 0;
  display: block;
  height: var(--widget-height);
  font-style: italic;
  line-height: var(--widget-height);
  opacity: 0.5;
}
.lil-gui.root > .children > .lil-gui > .title {
  border: 0 solid var(--widget-color);
  border-width: 1px 0;
  transition: border-color 300ms;
}
.lil-gui.root > .children > .lil-gui.closed > .title {
  border-bottom-color: transparent;
}
.lil-gui + .controller {
  border-top: 1px solid var(--widget-color);
  margin-top: 0;
  padding-top: var(--spacing);
}
.lil-gui .lil-gui .lil-gui > .title {
  border: none;
}
.lil-gui .lil-gui .lil-gui > .children {
  border: none;
  margin-left: var(--folder-indent);
  border-left: 2px solid var(--widget-color);
}
.lil-gui .lil-gui .controller {
  border: none;
}

.lil-gui label, .lil-gui input, .lil-gui button {
  -webkit-tap-highlight-color: transparent;
}
.lil-gui input {
  border: 0;
  outline: none;
  font-family: var(--font-family);
  font-size: var(--input-font-size);
  border-radius: var(--widget-border-radius);
  height: var(--widget-height);
  background: var(--widget-color);
  color: var(--text-color);
  width: 100%;
}
@media (hover: hover) {
  .lil-gui input:hover {
    background: var(--hover-color);
  }
  .lil-gui input:active {
    background: var(--focus-color);
  }
}
.lil-gui input:disabled {
  opacity: 1;
}
.lil-gui input[type=text],
.lil-gui input[type=number] {
  padding: var(--widget-padding);
  -moz-appearance: textfield;
}
.lil-gui input[type=text]:focus,
.lil-gui input[type=number]:focus {
  background: var(--focus-color);
}
.lil-gui input[type=checkbox] {
  appearance: none;
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  border-radius: var(--widget-border-radius);
  text-align: center;
  cursor: pointer;
}
.lil-gui input[type=checkbox]:checked:before {
  font-family: "lil-gui";
  content: "✓";
  font-size: var(--checkbox-size);
  line-height: var(--checkbox-size);
}
@media (hover: hover) {
  .lil-gui input[type=checkbox]:focus {
    box-shadow: inset 0 0 0 1px var(--focus-color);
  }
}
.lil-gui button {
  outline: none;
  cursor: pointer;
  font-family: var(--font-family);
  font-size: var(--font-size);
  color: var(--text-color);
  width: 100%;
  border: none;
}
.lil-gui .controller button {
  height: var(--widget-height);
  text-transform: none;
  background: var(--widget-color);
  border-radius: var(--widget-border-radius);
}
@media (hover: hover) {
  .lil-gui .controller button:hover {
    background: var(--hover-color);
  }
  .lil-gui .controller button:focus {
    box-shadow: inset 0 0 0 1px var(--focus-color);
  }
}
.lil-gui .controller button:active {
  background: var(--focus-color);
}

@font-face {
  font-family: "lil-gui";
  src: url("data:application/font-woff;charset=utf-8;base64,d09GRgABAAAAAAUsAAsAAAAACJwAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAABHU1VCAAABCAAAAH4AAADAImwmYE9TLzIAAAGIAAAAPwAAAGBKqH5SY21hcAAAAcgAAAD0AAACrukyyJBnbHlmAAACvAAAAF8AAACEIZpWH2hlYWQAAAMcAAAAJwAAADZfcj2zaGhlYQAAA0QAAAAYAAAAJAC5AHhobXR4AAADXAAAABAAAABMAZAAAGxvY2EAAANsAAAAFAAAACgCEgIybWF4cAAAA4AAAAAeAAAAIAEfABJuYW1lAAADoAAAASIAAAIK9SUU/XBvc3QAAATEAAAAZgAAAJCTcMc2eJxVjbEOgjAURU+hFRBK1dGRL+ALnAiToyMLEzFpnPz/eAshwSa97517c/MwwJmeB9kwPl+0cf5+uGPZXsqPu4nvZabcSZldZ6kfyWnomFY/eScKqZNWupKJO6kXN3K9uCVoL7iInPr1X5baXs3tjuMqCtzEuagm/AAlzQgPAAB4nGNgYRBlnMDAysDAYM/gBiT5oLQBAwuDJAMDEwMrMwNWEJDmmsJwgCFeXZghBcjlZMgFCzOiKOIFAB71Bb8AeJy1kjFuwkAQRZ+DwRAwBtNQRUGKQ8OdKCAWUhAgKLhIuAsVSpWz5Bbkj3dEgYiUIszqWdpZe+Z7/wB1oCYmIoboiwiLT2WjKl/jscrHfGg/pKdMkyklC5Zs2LEfHYpjcRoPzme9MWWmk3dWbK9ObkWkikOetJ554fWyoEsmdSlt+uR0pCJR34b6t/TVg1SY3sYvdf8vuiKrpyaDXDISiegp17p7579Gp3p++y7HPAiY9pmTibljrr85qSidtlg4+l25GLCaS8e6rRxNBmsnERunKbaOObRz7N72ju5vdAjYpBXHgJylOAVsMseDAPEP8LYoUHicY2BiAAEfhiAGJgZWBgZ7RnFRdnVJELCQlBSRlATJMoLV2DK4glSYs6ubq5vbKrJLSbGrgEmovDuDJVhe3VzcXFwNLCOILB/C4IuQ1xTn5FPilBTj5FPmBAB4WwoqAHicY2BkYGAA4sk1sR/j+W2+MnAzpDBgAyEMQUCSg4EJxAEAwUgFHgB4nGNgZGBgSGFggJMhDIwMqEAYAByHATJ4nGNgAIIUNEwmAABl3AGReJxjYAACIQYlBiMGJ3wQAEcQBEV4nGNgZGBgEGZgY2BiAAEQyQWEDAz/wXwGAAsPATIAAHicXdBNSsNAHAXwl35iA0UQXYnMShfS9GPZA7T7LgIu03SSpkwzYTIt1BN4Ak/gKTyAeCxfw39jZkjymzcvAwmAW/wgwHUEGDb36+jQQ3GXGot79L24jxCP4gHzF/EIr4jEIe7wxhOC3g2TMYy4Q7+Lu/SHuEd/ivt4wJd4wPxbPEKMX3GI5+DJFGaSn4qNzk8mcbKSR6xdXdhSzaOZJGtdapd4vVPbi6rP+cL7TGXOHtXKll4bY1Xl7EGnPtp7Xy2n00zyKLVHfkHBa4IcJ2oD3cgggWvt/V/FbDrUlEUJhTn/0azVWbNTNr0Ens8de1tceK9xZmfB1CPjOmPH4kitmvOubcNpmVTN3oFJyjzCvnmrwhJTzqzVj9jiSX911FjeAAB4nG3HMRKCMBBA0f0giiKi4DU8k0V2GWbIZDOh4PoWWvq6J5V8If9NVNQcaDhyouXMhY4rPTcG7jwYmXhKq8Wz+p762aNaeYXom2n3m2dLTVgsrCgFJ7OTmIkYbwIbC6vIB7WmFfAAAA==") format("woff");
}`;function Q(s){const t=document.createElement("style");t.innerHTML=s;const e=document.querySelector("head link[rel=stylesheet], head style");e?document.head.insertBefore(t,e):document.head.appendChild(t)}let D=!1;class P{constructor({parent:t,autoPlace:e=t===void 0,container:i,width:n,title:l="Controls",closeFolders:r=!1,injectStyles:a=!0,touchStyles:h=!0}={}){if(this.parent=t,this.root=t?t.root:this,this.children=[],this.controllers=[],this.folders=[],this._closed=!1,this._hidden=!1,this.domElement=document.createElement("div"),this.domElement.classList.add("lil-gui"),this.$title=document.createElement("button"),this.$title.classList.add("title"),this.$title.setAttribute("aria-expanded",!0),this.$title.addEventListener("click",()=>this.openAnimated(this._closed)),this.$title.addEventListener("touchstart",()=>{},{passive:!0}),this.$children=document.createElement("div"),this.$children.classList.add("children"),this.domElement.appendChild(this.$title),this.domElement.appendChild(this.$children),this.title(l),this.parent){this.parent.children.push(this),this.parent.folders.push(this),this.parent.$children.appendChild(this.domElement);return}this.domElement.classList.add("root"),h&&this.domElement.classList.add("allow-touch-styles"),!D&&a&&(Q(Z),D=!0),i?i.appendChild(this.domElement):e&&(this.domElement.classList.add("autoPlace"),document.body.appendChild(this.domElement)),n&&this.domElement.style.setProperty("--width",n+"px"),this._closeFolders=r}add(t,e,i,n,l){if(Object(i)===i)return new K(this,t,e,i);const r=t[e];switch(typeof r){case"number":return new J(this,t,e,i,n,l);case"boolean":return new H(this,t,e);case"string":return new U(this,t,e);case"function":return new L(this,t,e)}console.error(`gui.add failed
	property:`,e,`
	object:`,t,`
	value:`,r)}addColor(t,e,i=1){return new R(this,t,e,i)}addFolder(t){const e=new P({parent:this,title:t});return this.root._closeFolders&&e.close(),e}load(t,e=!0){return t.controllers&&this.controllers.forEach(i=>{i instanceof L||i._name in t.controllers&&i.load(t.controllers[i._name])}),e&&t.folders&&this.folders.forEach(i=>{i._title in t.folders&&i.load(t.folders[i._title])}),this}save(t=!0){const e={controllers:{},folders:{}};return this.controllers.forEach(i=>{if(!(i instanceof L)){if(i._name in e.controllers)throw new Error(`Cannot save GUI with duplicate property "${i._name}"`);e.controllers[i._name]=i.save()}}),t&&this.folders.forEach(i=>{if(i._title in e.folders)throw new Error(`Cannot save GUI with duplicate folder "${i._title}"`);e.folders[i._title]=i.save()}),e}open(t=!0){return this._setClosed(!t),this.$title.setAttribute("aria-expanded",!this._closed),this.domElement.classList.toggle("closed",this._closed),this}close(){return this.open(!1)}_setClosed(t){this._closed!==t&&(this._closed=t,this._callOnOpenClose(this))}show(t=!0){return this._hidden=!t,this.domElement.style.display=this._hidden?"none":"",this}hide(){return this.show(!1)}openAnimated(t=!0){return this._setClosed(!t),this.$title.setAttribute("aria-expanded",!this._closed),requestAnimationFrame(()=>{const e=this.$children.clientHeight;this.$children.style.height=e+"px",this.domElement.classList.add("transition");const i=l=>{l.target===this.$children&&(this.$children.style.height="",this.domElement.classList.remove("transition"),this.$children.removeEventListener("transitionend",i))};this.$children.addEventListener("transitionend",i);const n=t?this.$children.scrollHeight:0;this.domElement.classList.toggle("closed",!t),requestAnimationFrame(()=>{this.$children.style.height=n+"px"})}),this}title(t){return this._title=t,this.$title.textContent=t,this}reset(t=!0){return(t?this.controllersRecursive():this.controllers).forEach(i=>i.reset()),this}onChange(t){return this._onChange=t,this}_callOnChange(t){this.parent&&this.parent._callOnChange(t),this._onChange!==void 0&&this._onChange.call(this,{object:t.object,property:t.property,value:t.getValue(),controller:t})}onFinishChange(t){return this._onFinishChange=t,this}_callOnFinishChange(t){this.parent&&this.parent._callOnFinishChange(t),this._onFinishChange!==void 0&&this._onFinishChange.call(this,{object:t.object,property:t.property,value:t.getValue(),controller:t})}onOpenClose(t){return this._onOpenClose=t,this}_callOnOpenClose(t){this.parent&&this.parent._callOnOpenClose(t),this._onOpenClose!==void 0&&this._onOpenClose.call(this,t)}destroy(){this.parent&&(this.parent.children.splice(this.parent.children.indexOf(this),1),this.parent.folders.splice(this.parent.folders.indexOf(this),1)),this.domElement.parentElement&&this.domElement.parentElement.removeChild(this.domElement),Array.from(this.children).forEach(t=>t.destroy())}controllersRecursive(){let t=Array.from(this.controllers);return this.folders.forEach(e=>{t=t.concat(e.controllersRecursive())}),t}foldersRecursive(){let t=Array.from(this.folders);return this.folders.forEach(e=>{t=t.concat(e.foldersRecursive())}),t}}const C={HardinSloane:{1:0,2:1,3:1,5:1,4:2,7:2,9:2,6:3,8:3,10:3,11:3,13:3,15:3,24:7,14:4,17:4,19:4,21:4,12:5,16:5,18:5,20:5,22:5,23:5,25:5,27:5,60:10,26:6,28:6,29:6,31:6,33:6,35:6,30:7,32:7,34:7,37:7,38:7,39:7,41:7,43:7,36:8,40:8,42:8,44:8,45:8,46:8,47:8,49:8,51:8,53:8,48:9,50:9,52:9,54:9,55:9,56:9,57:9,58:9,59:9,61:9,63:9,62:10,64:10,65:10,66:10,67:10,68:10,69:10,71:10,73:10,70:11,72:11,74:11,75:11,76:11,77:11,78:11,79:11,80:11,81:11,82:11,83:11,85:11,84:12,86:12,87:12,88:12,89:12,90:12,91:12,92:12,93:12,95:12,97:12,99:12,94:13,96:13,98:13,100:13,108:14,120:15,132:15,144:16,156:17,180:18,204:19,216:20,240:21},WomersleySym:{2:1,6:3,12:5,32:7,48:9,70:11,94:13,120:15,156:17,192:19,234:21,278:23,328:25,380:27,438:29,498:31,564:33,632:35,706:37,782:39,864:41,948:43,1038:45,1130:47,1228:49,1328:51,1434:53,1542:55,1656:57,1772:59,1894:61,2018:63,2148:65,2280:67,2418:69,2558:71,2704:73,2852:75,3006:77,3162:79,3324:81,3488:83,3658:85,3830:87,4008:89,4188:91,4374:93,4562:95,4756:97,4952:99,5154:101,5358:103,5568:105,5780:107,5998:109,6218:111,6444:113,6672:115,6906:117,7142:119,7384:121,7628:123,7878:125,8130:127,8388:129,8648:131,8914:133,9182:135,9456:137,9732:139,10014:141,10298:143,10588:145,10880:147,11178:149,11478:151,11784:153,12092:155,12406:157,12722:159,13044:161,13368:163,13698:165,14030:167,14368:169,14708:171,15054:173,15402:175,15756:177,16112:179,16474:181,16838:183,17208:185,17580:187,17958:189,18338:191,18724:193,19112:195,19506:197,19902:199,20304:201,20708:203,21118:205,21530:207,21948:209,22368:211,22794:213,23222:215,23656:217,24092:219,24534:221,24978:223,25428:225,25880:227,26338:229,26798:231,27264:233,27732:235,28206:237,28682:239,29164:241,29648:243,30138:245,30630:247,31128:249,31628:251,32134:253,32642:255,33156:257,33672:259,34194:261,34718:263,35248:265,35780:267,36318:269,36858:271,37404:273,37952:275,38506:277,39062:279,39624:281,40188:283,40758:285,41330:287,41908:289,42488:291,43074:293,43662:295,44256:297,44852:299,45454:301,46058:303,46668:305,47280:307,47898:309,48518:311,49144:313,49772:315,50406:317,51042:319,51684:321,52328:323,52978:325},WomersleyNonSym:{3:1,6:2,8:3,14:4,18:5,26:6,32:7,42:8,50:9,62:10,72:11,86:12,98:13,114:14,128:15,146:16,163:17,182:18,201:19,222:20,243:21,266:22,289:23,314:24,339:25,366:26,393:27,422:28,451:29,482:30,513:31,546:32,579:33,614:34,649:35,686:36,723:37,762:38,801:39,842:40,883:41,926:42,969:43,1014:44,1059:45,1106:46,1153:47,1202:48,1251:49,1302:50,1353:51,1406:52,1459:53,1514:54,1569:55,1626:56,1683:57,1742:58,1801:59,1862:60,1923:61,1986:62,2049:63,2114:64,2179:65,2246:66,2313:67,2382:68,2451:69,2522:70,2593:71,2666:72,2739:73,2814:74,2889:75,2966:76,3043:77,3122:78,3201:79,3282:80,3363:81,3446:82,3529:83,3614:84,3699:85,3786:86,3873:87,3962:88,4051:89,4142:90,4233:91,4326:92,4419:93,4514:94,4609:95,4706:96,4803:97,4902:98,5001:99,5102:100,5203:101,5306:102,5409:103,5514:104,5619:105,5726:106,5833:107,5942:108,6051:109,6162:110,6273:111,6386:112,6499:113,6614:114,6729:115,6846:116,6963:117,7082:118,7201:119,7322:120,7443:121,7566:122,7689:123,7814:124,7939:125,8066:126,8193:127,8322:128,8451:129,8582:130,8713:131,8846:132,8979:133,9114:134,9249:135,9386:136,9523:137,9662:138,9801:139,9942:140,10083:141,10226:142,10369:143,10514:144,10659:145,10806:146,10953:147,11102:148,11251:149,11402:150,11553:151,11706:152,11859:153,12014:154,12169:155,12326:156,12483:157,12642:158,12801:159,12962:160,13123:161,13286:162,13449:163,13614:164,13779:165,13946:166,14113:167,14282:168,14451:169,14622:170,14793:171,14966:172,15139:173,15314:174,15489:175,15666:176,15843:177,16022:178,16201:179,16382:180},lebedev:{6:3,14:5,26:7,38:9,50:11,74:13,86:15,110:17,146:19,170:21,194:23,230:25,266:27,302:29,350:31,434:35,590:41,770:47,974:53,1202:59,1454:65,1730:71,2030:77,2354:83,2702:89,3074:95,3470:101,3890:107,4334:113,4802:119,5294:125,5810:131}},V=1,_={lebedev:{},HardinSloane:{},WomersleySym:{},WomersleyNonSym:{}};class F{x;y;z;phi;theta;weight;constructor(t,e,i){this.phi=t,this.theta=e,this.weight=i,this.x=V*Math.sin(this.phi)*Math.cos(this.theta),this.y=V*Math.sin(this.phi)*Math.sin(this.theta),this.z=V*Math.cos(this.phi)}}function lt(s){let t=[];for(let e=0;e<s;e++){let i=Math.random(),n=Math.random(),l=Math.acos(2*i-1),r=2*Math.PI*n,a=new F(l,r,1/s);t.push(a)}return t}function rt(s){let t=[];for(let e=0;e<s;e++){let i=Math.random(),n=Math.random(),l=i*Math.PI,r=2*Math.PI*n,a=new F(l,r,Math.sin(l)/s);t.push(a)}return t}async function ot(s,t=!1){try{let e,i;if(t){if(e=Number(Object.values(C.lebedev).reduce((o,c)=>Math.abs(c-s)<Math.abs(o-s)?c:o)),_.lebedev[e])return _.lebedev[e];i=await fetch(`PointDistFiles/lebedev/lebedev_${e.toString().padStart(3,"0")}`)}else{e=Number(Object.keys(C.lebedev).reduce((o,c)=>Math.abs(Number(c)-s)<Math.abs(Number(o)-s)?c:o));for(let o of Object.keys(_.lebedev)){const c=_.lebedev[Number(o)];if(c&&c.data.length==e)return c}i=await fetch(`PointDistFiles/lebedev/lebedev_${C.lebedev[e].toString().padStart(3,"0")}`)}if(!i.ok)throw new Error(`HTTP ${i.status}`);let l=(await i.text()).trim().split(`
`),r=[],a=Number.POSITIVE_INFINITY,h=Number.POSITIVE_INFINITY,u=Number.POSITIVE_INFINITY,g=Number.NEGATIVE_INFINITY,p=Number.NEGATIVE_INFINITY,f=Number.NEGATIVE_INFINITY,v=Number.POSITIVE_INFINITY,b=Number.NEGATIVE_INFINITY;for(let o of l)if(o.trim()){let c=o.trim().split(/\s+/);if(c.length>=3){let y=parseFloat(c[0])*Math.PI/180,$=parseFloat(c[1])*Math.PI/180,w=parseFloat(c[2]),m=new F($,y,w);m.x<a&&(a=m.x),m.x>g&&(g=m.x),m.y<h&&(h=m.y),m.y>p&&(p=m.y),m.z<u&&(u=m.z),m.z>f&&(f=m.z),w<v&&(v=w),w>b&&(b=w),r.push(m)}}const d={data:r,boundingBox:{min:{x:a,y:h,z:u},max:{x:g,y:p,z:f}},weightRange:{min:v,max:b},id:t?e:C.lebedev[e],kind:"lebedev",meta:{byOrder:t}};return t?_.lebedev[e]=d:_.lebedev[C.lebedev[e]]=d,d}catch(e){return console.warn(`Could not load Lebedev data for N = ${s}: ${e.message}`),null}}function q(s){if(s<=0)throw new Error("Degree must be a positive integer.");const t=new Array(s),e=new Array(s),i=1e-15;for(let l=0;l<s;l++){let r=Math.cos(Math.PI*(l+.75)/(s+.5)),a;for(;;){let h=1,u=0;for(let p=0;p<s;p++){const f=u;u=h,h=((2*p+1)*r*u-p*f)/(p+1)}a=s*(r*h-u)/(r*r-1);const g=h/a;if(r-=g,Math.abs(g)<i)break}t[l]=r,e[l]=2/((1-r*r)*a*a)}const n=Math.floor(s/2);for(let l=0;l<n;l++){const r=t[l];t[l]=t[s-1-l],t[s-1-l]=r;const a=e[l];e[l]=e[s-1-l],e[s-1-l]=a}return{x:t,w:e}}function at(s){let t=[];s=Math.round(Math.sqrt(s/2));let e=2*s+1,{x:i,w:n}=q(s);i=i.map(h=>Math.PI*(h+1)/2),n=n.map(h=>Math.PI/2*h),n=n.map((h,u)=>h*Math.sin(i[u]));let l=[],r=[];const a=2*Math.PI/e;for(let h=0;h<e;h++)l.push(h*a),r.push(a);for(let h=0;h<s;h++)for(let u=0;u<e;u++)t.push(new F(i[h],l[u],r[u]*n[h]/(4*Math.PI)));return t}async function ht(s,t="HardinSloane",e="points"){const i=C[t],n=Object.keys(i).map(r=>Number(r));let l;if(e==="degree"?l=n.reduce((r,a)=>Math.abs(a-s)<Math.abs(r-s)?a:r):l=n.reduce((r,a)=>Math.abs(i[a]-s)<Math.abs(i[r]-s)?a:r),_[t][l])return _[t][l];try{let a=await fetch(`PointDistFiles/sphdesigns/${t}/${{HardinSloane:"hs",WomersleySym:"ss",WomersleyNonSym:"sf"}[t]+i[l].toString().padStart(3,"0")}.${l.toString().padStart(5,"0")}`);if(!a.ok)throw new Error(`HTTP ${a.status}`);let u=(await a.text()).trim().split(`
`),g=[],p=Number.POSITIVE_INFINITY,f=Number.POSITIVE_INFINITY,v=Number.POSITIVE_INFINITY,b=Number.NEGATIVE_INFINITY,A=Number.NEGATIVE_INFINITY,E=Number.NEGATIVE_INFINITY;for(let $ of u)if($.trim()){let w=$.trim().split(/\s+/);if(w.length>=3){let m=parseFloat(w[0]),M=parseFloat(w[1]),I=parseFloat(w[2]),O=Math.acos(I),z=Math.atan2(M,m);const T=1/u.length;let Y=new F(O,z,T);m<p&&(p=m),m>b&&(b=m),M<f&&(f=M),M>A&&(A=M),I<v&&(v=I),I>E&&(E=I),g.push(Y)}}const d={min:{x:p,y:f,z:v},max:{x:b,y:A,z:E}},o=g.length>0?g[0].weight:0,y={data:g,boundingBox:d,weightRange:{min:o,max:o},id:l,kind:t,meta:{selectBy:e}};return _[t][l]=y,y}catch(r){return console.warn(`Could not load ${t} data for degree = ${l}: ${r.message}`),null}}function k(s,t){return{x:Math.sin(s)*Math.cos(t),y:Math.sin(s)*Math.sin(t),z:Math.cos(s)}}function tt(s,t,e=1){const{x:i,y:n,z:l}=k(s,t);return 1+i+n*n+i*i*n+Math.pow(i,4)+Math.pow(n,5)+i*i*n*n*l*l}function et(s,t,e=1){const{x:i,y:n,z:l}=k(s,t);let r=.75*Math.exp(-.25*(Math.pow(9*i-2,2)+Math.pow(9*n-2,2)+Math.pow(9*l-2,2))),a=.75*Math.exp(-(Math.pow(9*i+1,2)/49+(9*n+1)/10+(9*l+1)/10)),h=.5*Math.exp(-.25*(Math.pow(9*i-7,2)+Math.pow(9*n-3,2)+Math.pow(9*l-5,2))),u=-.2*Math.exp(-(Math.pow(9*i-4,2)+Math.pow(9*n-7,2)+Math.pow(9*l-5,2)));return r+a+h+u}function it(s,t,e=9){const{x:i,y:n,z:l}=k(s,t);return(1+Math.tanh(-e*(i+n-l)))/(1*e)}function st(s,t,e=9){const{x:i,y:n,z:l}=k(s,t);return(1+Math.sign(-e*(i+(n-l))))/(1*e)}function nt(s,t,e=9){const{x:i,y:n}=k(s,t);return(1+Math.sign(-e*(Math.PI*i+n)))/(1*e)}const dt=[{value:"f1",name:"Polynomial",description:"1 + x + y² + x²y + x⁴ + y⁵ + x²y²z²",function:tt,analyticalValue:s=>216*Math.PI/35/(4*Math.PI)},{value:"f2",name:"Gaussian Peaks",description:"Sum of Gaussian functions",function:et,analyticalValue:s=>6.696182220073618/(4*Math.PI)},{value:"f3",name:"Hyperbolic Tangent",description:"tanh(-a(x + y - z))",function:it,analyticalValue:s=>4*Math.PI/s/(4*Math.PI)},{value:"f4",name:"Sign Function 1",description:"sign(-a(x + y - z))",function:st,analyticalValue:s=>4*Math.PI/s/(4*Math.PI)},{value:"f5",name:"Sign Function 2",description:"sign(-a(πx + y))",function:nt,analyticalValue:s=>4*Math.PI/s/(4*Math.PI)}];export{C as A,P as G,V as S,ht as a,at as b,ot as c,rt as d,lt as g,dt as t};
