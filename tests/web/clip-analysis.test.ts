import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {aiTagging,decideTag,mergeTagging} from '../../apps/web/lib/tagging';
import {segmentDrafts,readSegments} from '../../apps/web/features/segments/segment-drafts';
import {refreshSegmentTags} from '../../apps/web/features/segments/segment-tagging';

// Execute the actual hook body, with deterministic React state/effect and network
// boundaries. Deferred requests deliberately ignore AbortSignal to test guards too.
const source=readFileSync('apps/web/features/library/use-clip-analysis.ts','utf8');
const workspace=readFileSync('apps/web/features/library/use-library-workspace.ts','utf8');
function declaration(source:string,name:string){
 const tree=ts.createSourceFile('source.ts',source,ts.ScriptTarget.Latest,true);
 let result='';
 function visit(node:ts.Node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)result=node.getText(tree);ts.forEachChild(node,visit);}
 visit(tree);assert(result,`Missing ${name}`);return result.replace(/^export /,'');
}
function compile(source:string){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;}
function deferred(){let resolve!:(value:any)=>void,reject!:(error:Error)=>void;const promise=new Promise<any>((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
const tick=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
function harness(options:Record<string,unknown>={}){
 const states:any[]=[],cleanups:(()=>void)[]=[],requests:any[]=[],frames:any[]=[],completed:any[]=[],titles:any[]=[],posters:any[]=[],timers=new Set<number>();
 const context={AbortController,File,FormData,Blob,Error,URL,crypto,
  useState:(initial:any)=>{const index=states.length;states.push(initial);return[initial,(next:any)=>{states[index]=typeof next==='function'?next(states[index]):next;}];},
  useRef:(current:any)=>({current}),useEffect:(run:()=>()=>void)=>cleanups.push(run()),
  request:(url:string,options:any)=>{const d=deferred();requests.push({url,options,...d});return d.promise;},
  analyzeWholeVideo:(source:any,signal:AbortSignal,progress:any)=>{const d=deferred();frames.push({source,signal,progress,...d});return d.promise;},
  setTimeout:()=>{timers.add(1);return 1;},clearTimeout:(id:number)=>timers.delete(id),
  proxyMedia:(url:string)=>url,videoProvider:()=>({kind:'youtube'}),
  fetch:async()=>({ok:true,blob:async()=>new Blob()}),
  createImageBitmap:async()=>({width:640,height:360,close(){}}),
  document:{createElement:()=>({getContext:()=>({drawImage(){}}),toBlob:(callback:any)=>posters.push(callback)})},
 };
 const hook=vm.runInNewContext(compile(declaration(source,'useClipAnalysis'))+'\nuseClipAnalysis;',context);
 const posterValues:any[]=[];
 const actions=hook({editing:{id:'existing'},automatic:(v:any)=>titles.push(v),completeAnalysis:(v:any)=>completed.push(v),setPoster:(v:any)=>posterValues.push(v),setAiStatus:()=>{},...options});
 return{actions,states,cleanups,requests,frames,completed,titles,posters,posterValues,timers};
}
let passed=0;
async function test(name:string,run:()=>void|Promise<void>){await run();passed++;console.log('PASS',name);}

await test('PC links never resolve or call Google/Gemini from the editor',async()=>{
 const h=harness({pcMode:true,editing:null});await h.actions.classifyUrl('https://youtu.be/abcdefghijk');assert.equal(h.requests.length,0);assert.equal(h.frames.length,0);
 const local=harness({pcMode:true,editing:{id:'local',localVideo:true}});const pending=local.actions.classifyUrl('https://youtu.be/abcdefghijk');assert.equal(local.requests.length,1);assert.equal(local.requests[0].url,'/api/jobs');assert.equal(JSON.parse(local.requests[0].options.body).kind,'analyze');local.requests[0].resolve({});await pending;assert.equal(local.frames.length,0);
});

await test('superseded status response never starts analysis',async()=>{
 const h=harness(),a=h.actions.classify('old'),b=h.actions.classify('new');
 assert(h.requests[0].options.signal.aborted);
 h.requests[0].resolve({configured:true,provider:'openai'});await a;assert.equal(h.frames.length,0);
 h.requests[1].resolve({configured:true,provider:'openai'});await tick();h.frames[0].resolve('new result');await b;
 assert.deepEqual(h.completed,['new result']);
});
await test('old frame progress, failure and result cannot overwrite the next analysis',async()=>{
 const h=harness(),a=h.actions.classify('old');h.requests[0].resolve({configured:true,provider:'openai'});await tick();
 const b=h.actions.classify('new');h.requests[1].resolve({configured:true,provider:'openai'});await tick();
 const progress=h.states[1];h.frames[0].progress({percent:99});assert.equal(h.states[1],progress);
 h.frames[0].reject(new Error('stale error'));await a;assert.equal(h.states[3],'');assert.equal(h.states[2],true);
 h.frames[1].resolve('current');await b;assert.deepEqual(h.completed,['current']);assert.equal(h.states[2],false);
 const c=h.actions.classify('cancel');h.requests[2].resolve({configured:true,provider:'openai'});await tick();h.actions.stopAnalysis();h.frames[2].resolve('late');await c;
 assert.deepEqual(h.completed,['current']);
});
await test('cancelled Gemini response is ignored and receives the same signal',async()=>{
 const h=harness(),a=h.actions.classify('saved-video');h.requests[0].resolve({configured:true,provider:'gemini'});await tick();
 assert.equal(h.requests[1].url,'/api/ai/analyze');assert.equal(h.requests[1].options.signal,h.requests[0].options.signal);
 assert.equal(JSON.parse(h.requests[1].options.body).clipId,'existing');h.actions.stopAnalysis();h.requests[1].resolve('late');await a;
 assert.equal(h.completed.length,0);assert.equal(h.states[2],false);assert(h.requests[1].options.signal.aborted);
});
await test('old URL resolution cannot change title or start provider lookup',async()=>{
 const h=harness(),a=h.actions.classifyUrl('https://example.org/old');h.actions.stopAnalysis();h.requests[0].resolve({link:{title:'old'}});await a;
 assert.equal(h.titles.length,0);assert.equal(h.requests.length,1);
});
await test('poster callback and provider result are discarded after unmount',async()=>{
 const h=harness(),a=h.actions.classifyUrl('https://example.org/video');h.requests[0].resolve({link:{title:'video',previewUrl:'https://example.org/poster'}});await tick();
 assert.equal(h.posters.length,1);h.requests[1].resolve({configured:true,provider:'gemini'});await tick();
 h.actions.linkTimerRef.current=1;h.timers.add(1);h.cleanups.forEach(cleanup=>cleanup());
 h.posters[0](new Blob(['late']));h.requests[2].resolve('late');await a;
 assert.equal(h.posterValues.length,0);assert.equal(h.completed.length,0);assert.equal(h.timers.size,0);assert(h.requests[2].options.signal.aborted);
});
await test('completion preserves manual fields, segment metadata and user review decisions',()=>{
 const tagging=aiTagging([{tagId:'color.blue',aiScore:.99,evidenceMs:[500]}],5);
 let reviewed=decideTag(tagging,'color.blue','rejected');
 const original={id:'seg',title:'manual segment',startSeconds:0,endSeconds:5,effects:[],note:'keep',tagging:reviewed,tags:{color:['custom'],shot:[],effect:[]}};
 let drafts=segmentDrafts([original]),draft={title:'manual title',notes:'old',color:'',shot:'',effect:'',sourceUrl:''};
 const context={mergeTagging,refreshSegmentTags,readSegments,segmentDrafts,manualSegments:{current:true},manualFields:{current:new Set(['title'])},setAnalysis:()=>{},setAnalysisProgress:()=>{},setTagging:(fn:any)=>reviewed=fn(reviewed),setSegments:(fn:any)=>drafts=fn(drafts),setDraft:(fn:any)=>draft=fn(draft)};
 const complete=vm.runInNewContext(compile(declaration(workspace,'automatic')+'\n'+declaration(workspace,'completeAnalysis'))+'\ncompleteAnalysis;',context);
 complete({title:'AI title',memo:'new memo',report:{tagging,segments:[{...original,title:'AI segment',tagging}]}});
 assert.equal(draft.title,'manual title');assert.equal(draft.notes,'new memo');assert.equal(reviewed.assignments[0].status,'rejected');
 const [segment]=readSegments(drafts);assert.equal(segment.title,'manual segment');assert.equal(segment.note,'keep');assert.equal(segment.tagging?.assignments[0].status,'rejected');assert.deepEqual(segment.tags?.color,['custom']);
});
await test('AI connection only resumes analysis in the same editor session',()=>{
 let resumed=0;const pendingAnalysis={current:null as any},formSession={current:2};
 const connected=vm.runInNewContext(compile(declaration(workspace,'connected'))+'\nconnected;',{pendingAnalysis,formSession,setAiStatus:()=>{},toast:{success:()=>{}}});
 pendingAnalysis.current={session:1,run:()=>resumed++};connected({provider:'openai'});assert.equal(resumed,0);
 pendingAnalysis.current={session:2,run:()=>resumed++};connected({provider:'openai'});assert.equal(resumed,1);assert.equal(pendingAnalysis.current,null);
});
console.log(JSON.stringify({passed,networkCalls:0}));
