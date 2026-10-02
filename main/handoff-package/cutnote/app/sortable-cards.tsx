'use client';
import {Children,cloneElement,isValidElement,useEffect,useLayoutEffect,useRef,useState,type ReactElement,type ReactNode} from 'react';
import {ArrowLeft,ArrowRight,GripVertical,Loader2,Check} from 'lucide-react';
import {moveKey} from '@/lib/library-order';
type Card=ReactElement<{children?:ReactNode;className?:string;'data-sort-key'?:string}>;
type Gesture={key:string;over:string;startX:number;startY:number;x:number;y:number;touch:boolean;active:boolean;timer:ReturnType<typeof setTimeout>|null};
export function SortableCards({children,className,onReorder}:{children:ReactNode;className:string;onReorder?:(keys:string[])=>Promise<void>}){
 const cards=Children.toArray(children).filter(isValidElement) as Card[];
 // React's Children utility escapes keys; the explicit card attribute is the storage identity.
 const keys=cards.map(card=>card.props['data-sort-key']||String(card.key));
 const root=useRef<HTMLDivElement>(null),gesture=useRef<Gesture|null>(null),blockedUntil=useRef(0),frame=useRef(0);
 const latest=useRef({keys,onReorder});useLayoutEffect(()=>{latest.current={keys,onReorder};});
 const[mode,setMode]=useState(false),[drag,setDrag]=useState<{key:string;over:string}|null>(null),[saving,setSaving]=useState(false),[announcement,setAnnouncement]=useState('');
 const savingRef=useRef(false);
 async function commit(from:string,to:string){if(savingRef.current)return;const next=moveKey(latest.current.keys,from,to);if(next===latest.current.keys)return;savingRef.current=true;setSaving(true);try{await latest.current.onReorder?.(next);setAnnouncement('카드 순서를 저장했어요.');}catch{setAnnouncement('순서를 저장하지 못했어요. 다시 이동해주세요.');}finally{savingRef.current=false;setSaving(false);}}
 const commitRef=useRef(commit);useLayoutEffect(()=>{commitRef.current=commit;});
 const sortable=!!onReorder,keyIdentity=keys.join("|");
 useEffect(()=>{
  const el=root.current;if(!el||!sortable)return;
  function clear(cancel=false){const g=gesture.current;if(!g)return;if(g.timer)clearTimeout(g.timer);cancelAnimationFrame(frame.current);gesture.current=null;setDrag(null);if(g.active){blockedUntil.current=Date.now()+450;if(!cancel)void commitRef.current(g.key,g.over);}}
  function targetAt(x:number,y:number){const card=document.elementFromPoint(x,y)?.closest<HTMLElement>('[data-sort-key]');return card&&el!.contains(card)?card.dataset.sortKey:null;}
  function scroll(){const g=gesture.current;if(!g?.active)return;const edge=80,dy=g.y<edge?-12:g.y>window.innerHeight-edge?12:0;if(dy){window.scrollBy(0,dy);const key=targetAt(g.x,g.y);if(key){g.over=key;setDrag({key:g.key,over:key});}}frame.current=requestAnimationFrame(scroll);}
  function activate(){const g=gesture.current;if(!g)return;g.active=true;g.timer=null;setMode(true);setDrag({key:g.key,over:g.key});setAnnouncement('이동할 카드 위로 끌어 놓으세요.');window.getSelection()?.removeAllRanges();frame.current=requestAnimationFrame(scroll);}
  function begin(target:EventTarget|null,x:number,y:number,touch:boolean){if(savingRef.current||gesture.current||!(target instanceof Element))return;const card=target.closest<HTMLElement>('[data-sort-key]');if(!card||!el!.contains(card))return;const control=target.closest('button,a,input,textarea,select');if(control&&!control.classList.contains('card-open')&&!control.classList.contains('card-drag-handle'))return;const key=card.dataset.sortKey;if(!key)return;gesture.current={key,over:key,startX:x,startY:y,x,y,touch,active:false,timer:null};if(control?.classList.contains('card-drag-handle'))activate();else gesture.current.timer=setTimeout(activate,350);}
  function move(x:number,y:number){const g=gesture.current;if(!g)return;g.x=x;g.y=y;if(!g.active){if(Math.hypot(x-g.startX,y-g.startY)>9)clear(true);return;}const key=targetAt(x,y);if(key&&key!==g.over){g.over=key;setDrag({key:g.key,over:key});}}
  function mouseDown(e:PointerEvent){if(e.pointerType==='touch'||e.button!==0)return;begin(e.target,e.clientX,e.clientY,false);}
  function mouseMove(e:PointerEvent){if(e.pointerType==='touch'||gesture.current?.touch)return;move(e.clientX,e.clientY);if(gesture.current?.active)e.preventDefault();}
  function mouseUp(e:PointerEvent){if(e.pointerType!=='touch'&&!gesture.current?.touch)clear();}
  function touchStart(e:TouchEvent){if(e.touches.length!==1){clear(true);return;}const t=e.touches[0];begin(e.target,t.clientX,t.clientY,true);if(gesture.current?.active)e.preventDefault();}
  function touchMove(e:TouchEvent){const g=gesture.current;if(!g?.touch)return;if(e.touches.length!==1){clear(true);return;}if(g.active&&e.cancelable)e.preventDefault();const t=e.touches[0];move(t.clientX,t.clientY);}
  function touchEnd(){if(gesture.current?.touch)clear();}
  function cancel(){clear(true);}
  function click(e:MouseEvent){if(gesture.current?.active||Date.now()<blockedUntil.current){e.preventDefault();e.stopPropagation();}}
  function context(e:Event){if(gesture.current){e.preventDefault();}}
  function keydown(e:KeyboardEvent){if(e.key==='Escape')clear(true);}
  el.addEventListener('pointerdown',mouseDown);window.addEventListener('pointermove',mouseMove);window.addEventListener('pointerup',mouseUp);window.addEventListener('pointercancel',cancel);
  // This listener is non-passive from touchstart, so a held touch can switch to
  // dragging without disabling ordinary scrolling on every card.
  el.addEventListener('touchstart',touchStart,{passive:false});el.addEventListener('touchmove',touchMove,{passive:false});window.addEventListener('touchend',touchEnd);window.addEventListener('touchcancel',cancel);
  el.addEventListener('click',click,true);el.addEventListener('contextmenu',context);el.addEventListener('dragstart',context);window.addEventListener('blur',cancel);window.addEventListener('keydown',keydown);
  return()=>{clear(true);el.removeEventListener('pointerdown',mouseDown);window.removeEventListener('pointermove',mouseMove);window.removeEventListener('pointerup',mouseUp);window.removeEventListener('pointercancel',cancel);el.removeEventListener('touchstart',touchStart);el.removeEventListener('touchmove',touchMove);window.removeEventListener('touchend',touchEnd);window.removeEventListener('touchcancel',cancel);el.removeEventListener('click',click,true);el.removeEventListener('contextmenu',context);el.removeEventListener('dragstart',context);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',keydown);};
 },[sortable,keyIdentity]);
 if(!onReorder)return <div className={className}>{children}</div>;
 return <><div className="order-toolbar"><p>{saving?'순서 저장 중…':drag?'원하는 카드 위에 놓으세요':mode?'손잡이를 끌거나 화살표로 옮기세요':'카드를 살짝 길게 눌러 순서를 바꿔요'}</p><button type="button" className="subtle-button" onClick={()=>setMode(!mode)} disabled={saving}>{saving?<Loader2 size={15} className="spinner"/>:mode?<Check size={15}/>:<GripVertical size={15}/>} {mode?'완료':'순서 변경'}</button></div><div ref={root} className={className+' sortable-cards'+(drag?' is-dragging':'')} aria-busy={saving}>{cards.map((card,index)=>{const key=keys[index];return cloneElement(card,{className:(card.props.className||'')+(drag?.key===key?' being-dragged':'')+(drag&&drag.over===key&&drag.key!==key?' drop-target':''),'data-sort-key':key},<>{mode&&<div className="card-order-controls"><button type="button" className="card-drag-handle" aria-label={`카드 ${index+1} 이동 손잡이`} title="끌어 이동하거나 방향키를 누르세요" disabled={saving} onKeyDown={e=>{if(['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(e.key)){e.preventDefault();const next=index+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1);if(keys[next])void commit(key,keys[next]);}}}><GripVertical size={19}/><span>{index+1}</span></button><button type="button" aria-label={`카드 ${index+1} 앞으로 이동`} disabled={saving||index===0} onClick={()=>void commit(key,keys[index-1])}><ArrowLeft size={16}/></button><button type="button" aria-label={`카드 ${index+1} 뒤로 이동`} disabled={saving||index===keys.length-1} onClick={()=>void commit(key,keys[index+1])}><ArrowRight size={16}/></button></div>}{card.props.children}</>);})}</div><span className="sr-only" role="status">{announcement}</span></>;
}
