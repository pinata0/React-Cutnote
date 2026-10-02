'use client';
import {Star,Loader2} from 'lucide-react';
export function FavoriteButton({favorite,title,busy,onToggle,compact=false}:{favorite:boolean;title:string;busy?:boolean;onToggle:()=>void;compact?:boolean}){
 const label=`${title} 즐겨찾기 ${favorite?'해제':'추가'}`;
 return <button type="button" className={'favorite-button '+(favorite?'is-favorite ':'')+(compact?'favorite-compact':'')} aria-label={label} aria-pressed={favorite} disabled={busy} title={label} onClick={onToggle}>{busy?<Loader2 size={19} className="spinner"/>:<Star size={19} fill={favorite?'currentColor':'none'}/>} {!compact&&<span>{favorite?'즐겨찾기됨':'즐겨찾기'}</span>}</button>;
}
