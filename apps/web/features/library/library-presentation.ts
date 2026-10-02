import {Palette,Scan,Sparkles} from 'lucide-react';
import type {Category} from '@/lib/clips';
export const groups=[{key:'color' as Category,name:'색감',icon:Palette,examples:['blue','warm','흑백']},{key:'shot' as Category,name:'구도',icon:Scan,examples:['풀샷','클로즈업','로우앵글']},{key:'effect' as Category,name:'효과',icon:Sparkles,examples:['glitch','slow motion','film grain']}];
export const date=(value:string)=>new Date(value).toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'});
