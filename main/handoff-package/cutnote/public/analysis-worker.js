// Runs locally in a dedicated browser worker. No video pixels are sent to a remote API.
const MODEL='Xenova/mobileclip_s0';
const REVISION='757d59c9c6870a76a4b0306f05f5061bca15c39f';
const framing=[
 ['클로즈업','a close-up shot of a face or an object filling most of the frame'],
 ['미디엄샷','a medium shot showing a person from the waist up'],
 ['풀샷','a full body shot showing a person from head to toe'],
 ['와이드샷','a wide establishing shot of a landscape, street or interior with small subjects'],
 ['디테일샷','an extreme close-up macro shot of a small detail or texture'],
 ['구도 확인 필요','an abstract graphic, title screen or image without a clear photographic subject'],
];
const angles=[
 ['아이레벨','a photo filmed at eye level, looking straight at the subject'],
 ['로우앵글','a dramatic low angle shot, looking up from below at the subject'],
 ['하이앵글','a high angle or overhead top down shot, looking down at the subject'],
];
const effects=[
 ['특수효과 미검출','a clean natural sharp photograph with no visible special visual effects'],
 ['glitch','a digitally glitched frame with broken blocks, displaced strips and RGB channel separation'],
 ['vhs','an old VHS videotape frame with horizontal scan lines and analog tracking distortion'],
 ['film grain','a very grainy photograph with clearly visible film grain texture'],
 ['motion blur','a photo with strong directional motion blur and streaking movement'],
 ['soft focus','a dreamy soft focus photograph with diffuse blurred highlights'],
 ['double exposure','a double exposure photograph showing two transparent images superimposed'],
 ['split screen','a split screen frame with multiple separate camera views side by side'],
 ['bloom','an image with strong glowing light halos and bloom around bright highlights'],
];
const progress=(message,percent)=>self.postMessage({type:'progress',message,percent});
function pick(rows,labels,threshold,margin,fallback){const avg=labels.map((item,i)=>({tag:item[0],score:rows.reduce((s,row)=>s+row[i],0)/rows.length,index:i})).sort((a,b)=>b.score-a.score);const top=avg[0];const votes=rows.filter(row=>row.indexOf(Math.max(...row))===top.index).length;return top.score>=threshold&&top.score-avg[1].score>=margin&&votes>=Math.ceil(rows.length/2)?top.tag:fallback;}
self.onmessage=async(event)=>{
 try{
  const frames=event.data.frames;if(!Array.isArray(frames)||frames.length<1||frames.length>5)throw new Error('Invalid frames');
  progress('AI 분석 모델 준비 중 · 처음 한 번은 약 55MB를 내려받아요.',18);
  const {env,AutoTokenizer,AutoProcessor,CLIPTextModelWithProjection,CLIPVisionModelWithProjection,RawImage,dot,softmax}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
  env.allowLocalModels=false;env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;
  const downloads=new Map();const report=(p)=>{if(p.status==='progress'&&p.total){downloads.set(p.file,{loaded:p.loaded,total:p.total});let loaded=0,total=0;for(const d of downloads.values()){loaded+=d.loaded;total+=d.total;}const ratio=total?loaded/total:0;progress(`AI 모델 준비 중 · ${Math.round(ratio*100)}%`,18+Math.round(ratio*37));}};
  const options={revision:REVISION,dtype:'q8',device:'wasm',progress_callback:report};
  const [tokenizer,processor,textModel,visionModel]=await Promise.all([AutoTokenizer.from_pretrained(MODEL,{revision:REVISION}),AutoProcessor.from_pretrained(MODEL,{revision:REVISION}),CLIPTextModelWithProjection.from_pretrained(MODEL,options),CLIPVisionModelWithProjection.from_pretrained(MODEL,options)]);
  progress('색감 확인 완료 · 구도와 효과를 분석하고 있어요.',57);
  const all=[...framing,...angles,...effects];const textInputs=tokenizer(all.map(x=>x[1]),{padding:'max_length',truncation:true});const{text_embeds}=await textModel(textInputs);const texts=text_embeds.normalize().tolist();await textModel.dispose();
  const frameRows=[],angleRows=[],effectRows=[];
  for(let i=0;i<frames.length;i++){const f=frames[i];const image=new RawImage(new Uint8ClampedArray(f.data),f.width,f.height,4);const inputs=await processor(image);const{image_embeds}=await visionModel(inputs);const embedding=image_embeds.normalize().tolist()[0];const similarities=texts.map(t=>100*dot(embedding,t));frameRows.push(softmax(similarities.slice(0,framing.length)));angleRows.push(softmax(similarities.slice(framing.length,framing.length+angles.length)));effectRows.push(softmax(similarities.slice(framing.length+angles.length)));progress(`구도·효과 분석 중 · ${i+1}/${frames.length} 장면`,60+Math.round((i+1)/frames.length*35));}
  await visionModel.dispose();
  const shotTag=pick(frameRows,framing,.40,.09,'구도 확인 필요');const shot=[shotTag];const angle=pick(angleRows,angles,.66,.22,'');if(shotTag!=='구도 확인 필요'&&angle&&angle!=='아이레벨')shot.push(angle);
  const effect=pick(effectRows,effects,.43,.10,'효과 확인 필요');
  const notes=[`제공된 ${frames.length}개 이미지를 분석한 자동 제안이에요. 저장 전에 태그를 확인해주세요.`,`슬로모션·전환 속도 등 시간에 따른 효과는 정지 장면만으로 판별하지 않아요.`];if(shotTag==='구도 확인 필요'||effect==='효과 확인 필요')notes.push('확신이 낮은 항목은 확인 필요로 표시했어요.');if(effect==='특수효과 미검출')notes.push('분석한 장면에서 뚜렷한 특수효과를 찾지 못했어요. 효과가 없다는 보장은 아니에요.');
  self.postMessage({type:'result',shot,effect:[effect],notes});
 }catch(error){console.error('Automatic classification failed',error);self.postMessage({type:'error',detail:error instanceof Error?error.message:String(error),message:'구도·효과 분석을 완료하지 못했어요. 색감 결과는 유지했어요. 모델 다운로드와 인터넷 연결을 확인하고 다시 시도해주세요.'});}
};
