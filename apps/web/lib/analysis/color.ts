export type PixelFrame={data:Uint8ClampedArray;width:number;height:number};
export function classifyColor(frames:PixelFrame[]):string[]{
 let count=0,gray=0,saturation=0,light=0,chromatic=0;const hues:Record<string,number>={red:0,orange:0,yellow:0,green:0,cyan:0,blue:0,purple:0,pink:0};
 for(const frame of frames)for(let i=0;i<frame.data.length;i+=16){const r=frame.data[i]/255,g=frame.data[i+1]/255,b=frame.data[i+2]/255;if(frame.data[i+3]<128)continue;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,s=max?d/max:0;count++;saturation+=s;light+=.2126*r+.7152*g+.0722*b;if(d<.035)gray++;if(s<.18||max<.10||max>.97&&min>.88)continue;let h=0;if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h=(h*60+360)%360;const name=h<15||h>=345?'red':h<45?'orange':h<70?'yellow':h<165?'green':h<195?'cyan':h<255?'blue':h<290?'purple':'pink';hues[name]+=s*max;chromatic+=s*max;}
 if(!count)return[];const tags:string[]=[];const avgSat=saturation/count,avgLight=light/count;
 if(gray/count>.94&&avgSat<.07)tags.push('흑백');else if(chromatic/count>.07){const ranked=Object.entries(hues).sort((a,b)=>b[1]-a[1]);for(const[name,value]of ranked.slice(0,2))if(value/chromatic>.24)tags.push(name);const warm=(hues.red+hues.orange+hues.yellow)/chromatic,cool=(hues.cyan+hues.blue+hues.purple)/chromatic;if(warm>.65)tags.push('warm');else if(cool>.65)tags.push('cool');}
 if(avgSat>.52)tags.push('고채도');else if(avgSat<.2)tags.push('저채도');if(avgLight<.22)tags.push('어두운 톤');else if(avgLight>.77)tags.push('밝은 톤');if(!tags.length)tags.push('중성 톤');return tags.slice(0,4);
}
