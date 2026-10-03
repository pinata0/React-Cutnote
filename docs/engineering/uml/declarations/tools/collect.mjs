// Run from repository root. Reads selected source only; never loads private state.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
const root=process.cwd(),out='docs/engineering/uml/declarations';
const require=createRequire(path.resolve('apps/web/package.json'));
const ts=require('typescript');
const statuses=new Map(),reasons=new Map(),roles=new Map(),skipped=[];
const sourceExt=/\.(?:[cm]?[jt]sx?|java|sql)$/;
function visit(p,fn){if(!fs.existsSync(p))throw Error('Missing selection path '+p);const s=fs.lstatSync(p);if(s.isSymbolicLink())return;if(s.isDirectory()){for(const n of fs.readdirSync(p))if(!['node_modules','dist','.next','.wrangler','.cutnote-pc','meta','tests'].includes(n))visit(p+'/'+n,fn);}else fn(p);}
for(const line of fs.readFileSync('docs/engineering/uml/selection.md','utf8').split('\n')){
 if(!line.startsWith('| ['))continue;const cells=line.split('|').map(s=>s.trim()),status=cells[2];
 if(!['포함','보조'].includes(status))continue;
 for(const m of cells[1].matchAll(/\]\(<\.\.\/\.\.\/\.\.\/([^>]+)>\)/g)){
  const selected=m[1];if(!selected.startsWith('apps/'))continue;
  visit(selected,p=>{
   if(!sourceExt.test(p)||/\.test\.|\/tests\//.test(p)){skipped.push(p);return;}
   if(statuses.get(p)==='포함')return;
   statuses.set(p,status);roles.set(p,cells[5]);reasons.set(p,cells[6]);
  });
 }
}
const rows=[],unions=[],parsed=[],java=[],sql=[];
const core=new Map([
 ['apps/web/lib/clips.ts:Clip','domain'],['apps/web/lib/segments.ts:ClipSegment','domain'],
 ['apps/web/lib/tagging.ts:Tagging','domain'],['apps/web/lib/tagging.ts:TagAssignment','domain'],
 ['apps/web/lib/jobs/types.ts:PcJob','jobs'],['apps/web/lib/jobs/types.ts:LocalAsset','storage'],
 ['apps/web/lib/jobs/server.ts:JobRow','jobs'],['apps/web/lib/server.ts:ClipRow','storage'],
 ['apps/web/lib/ai/openai.ts:FrameInput','analysis'],['apps/web/lib/analysis/whole-video.ts:TimedFrame','analysis'],
 ['apps/web/features/segments/segment-tagging.ts:SegmentTarget','analysis'],['apps/web/lib/analysis/types.ts:AnalysisReport','analysis'],
 ['apps/web/features/connections/ai-connection.tsx:AiStatus','connection'],['apps/web/lib/workspace-context.ts:WorkspaceContext','connection'],
 ['apps/android/app/src/main/java/app/cutnote/mobile/ShareRequest.java:ShareRequest','connection'],
]);
function area(file){if(file.includes('/android/')||/connector|connections\/|workspace-context|mobile-share|chatgpt-auth/.test(file))return'connection';if(file.includes('/pc/')||/\/jobs\/|pc-ingest|mobile-save/.test(file))return'jobs';if(/\/db\/|\/drizzle\/|init-local-db|drizzle.config|\/server.ts$|media-response|segment-media|library-order-server/.test(file))return'storage';if(/\/ai\/|\/analysis\/|discovery|use-clip-analysis|video-export|links\//.test(file))return'analysis';return'domain';}
function add(file,line,name,kind,detail='',module=file){const key=file+':'+name;rows.push({file,line,name,kind,detail:detail.replace(/\s+/g,' ').trim(),module,area:core.get(key)||area(file),show:core.has(key),status:statuses.get(file),role:roles.get(file)||'선정 소스'});}
for(const file of [...statuses.keys()].sort()){
 if(file.endsWith('.java')){java.push(file);continue;}if(file.endsWith('.sql')){sql.push(file);continue;}
 const code=fs.readFileSync(file,'utf8'),sf=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,file.endsWith('x')?ts.ScriptKind.TSX:/\.[cm]?js$/.test(file)?ts.ScriptKind.JS:ts.ScriptKind.TS);
 if(sf.parseDiagnostics.length)throw Error('TS/JS syntax errors '+file);
 parsed.push(file);
 const line=n=>sf.getLineAndCharacterOfPosition(n.getStart(sf)).line+1;
 const text=n=>n?.getText(sf)||'';
 function scope(n){const names=[];for(let p=n.parent;p&&!ts.isSourceFile(p);p=p.parent){if((ts.isFunctionDeclaration(p)||ts.isClassDeclaration(p)||ts.isInterfaceDeclaration(p)||ts.isTypeAliasDeclaration(p)||ts.isModuleDeclaration(p)||ts.isMethodDeclaration(p))&&p.name)names.unshift(text(p.name));if(ts.isVariableDeclaration(p))names.unshift(text(p.name));}return names.join('.');}
 const name=(n,own)=>[scope(n),own].filter(Boolean).join('.');
 function names(n){if(ts.isIdentifier(n))return[n.text];if(ts.isArrayBindingPattern(n)||ts.isObjectBindingPattern(n))return n.elements.flatMap(e=>ts.isBindingElement(e)?names(e.name):[]);return[text(n)];}
 function moduleVariable(n){return ts.isVariableDeclarationList(n.parent)&&ts.isVariableStatement(n.parent.parent)&&(ts.isSourceFile(n.parent.parent.parent)||ts.isModuleBlock(n.parent.parent.parent));}
 function unionLabel(n){let p=n.parent;for(;p&&!ts.isSourceFile(p);p=p.parent){if(ts.isPropertySignature(p)||ts.isParameter(p)||ts.isVariableDeclaration(p)||ts.isTypeAliasDeclaration(p))return name(p,text(p.name))+' @union L'+line(n);if(ts.isCallExpression(p))return scope(n)+'.'+text(p.expression)+' @union L'+line(n);}return'inline union L'+line(n);}
 function scan(n){
  if(ts.isTypeAliasDeclaration(n))add(file,line(n),name(n,text(n.name)),'TS type alias (erased)',text(n.type));
  else if(ts.isInterfaceDeclaration(n))add(file,line(n),name(n,text(n.name)),'TS interface (erased)',n.members.map(x=>text(x.name)).filter(Boolean).join(', '));
  else if(ts.isEnumDeclaration(n))add(file,line(n),name(n,text(n.name)),n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ConstKeyword)?'TS const enum':'TS enum (runtime)',n.members.map(x=>text(x.name)).join(', '));
  else if(ts.isClassDeclaration(n)||ts.isClassExpression(n))add(file,line(n),name(n,n.name?text(n.name):'anonymous class L'+line(n)),'TS/JS class (runtime)',n.heritageClauses?.map(text).join(' ')||'');
  else if(ts.isPropertyDeclaration(n))add(file,line(n),name(n,text(n.name)),'class field (runtime)',text(n.type));
  else if(ts.isConstructorDeclaration(n))add(file,line(n),name(n,'constructor'),'constructor (runtime)',n.parameters.map(x=>text(x.name)).join(', '));
  else if(ts.isFunctionDeclaration(n))add(file,line(n),name(n,n.name?text(n.name):'default function L'+line(n)),'function (runtime)',n.parameters.map(x=>text(x.name)).join(', '));
  else if(ts.isMethodDeclaration(n)||ts.isGetAccessorDeclaration(n)||ts.isSetAccessorDeclaration(n))add(file,line(n),name(n,text(n.name)),'method/accessor (runtime)',n.parameters.map(x=>text(x.name)).join(', '));
  else if(ts.isVariableDeclaration(n)){
   const init=n.initializer,hook=init&&ts.isCallExpression(init)&&/^(useState|useReducer)$/.test(text(init.expression));
   const literalList=init&&ts.isArrayLiteralExpression(init)&&init.elements.length&&init.elements.every(e=>ts.isStringLiteral(e));
   const fn=init&&(ts.isArrowFunction(init)||ts.isFunctionExpression(init));
   if(moduleVariable(n)||hook||literalList||fn)for(const own of names(n.name)){
    const table=init&&ts.isCallExpression(init)&&text(init.expression)==='sqliteTable';
    let detail=text(n.type)||(hook?'React state binding':literalList?init.elements.map(e=>e.text).join(' / '):fn?'parameters: '+init.parameters.map(x=>text(x.name)).join(', '):table?'DB table '+text(init.arguments[0]):'');
    if(table&&init.arguments[1]&&ts.isObjectLiteralExpression(init.arguments[1]))detail+='; fields: '+init.arguments[1].properties.map(x=>text(x.name)).join(', ');
    add(file,line(n),name(n,own),table?'Drizzle table object (runtime)':fn?'function binding (runtime)':hook?'React state/setter (runtime)':moduleVariable(n)?'module variable/constant (runtime)':'literal-list constant (runtime)',detail);
   }
  }else if(ts.isUnionTypeNode(n)&&n.types.some(t=>ts.isLiteralTypeNode(t)&&ts.isStringLiteral(t.literal))){
   add(file,line(n),unionLabel(n),'inline literal union (erased)',text(n));
  }else if(ts.isExportAssignment(n))add(file,line(n),'default export L'+line(n),'export expression (runtime)',ts.SyntaxKind[n.expression.kind]);
  else if(ts.isExportDeclaration(n))add(file,line(n),'re-export L'+line(n),'export binding (reference)',text(n.exportClause)||'*');
  ts.forEachChild(n,scan);
 }
 scan(sf);
 const exports=new Set();
 for(const st of sf.statements)if(st.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)){
  if(st.name)exports.add(text(st.name));
  if(ts.isVariableStatement(st))for(const d of st.declarationList.declarations)for(const v of names(d.name))exports.add(v);
 }
 for(const row of rows.filter(r=>r.file===file&&exports.has(r.name)))row.detail='export; '+row.detail;
}
if(java.length){const r=spawnSync('java',[out+'/tools/JavaDeclarations.java',...java],{encoding:'utf8',maxBuffer:16*1024*1024,windowsHide:true});if(r.status!==0)throw Error('Java parser failed: '+r.stderr);for(const line of r.stdout.trim().split('\n')){const x=JSON.parse(line);add(path.relative(root,x.file).replaceAll('\\','/'),x.line,x.name,x.kind,x.detail,x.module);}parsed.push(...java);}
const db=new DatabaseSync(':memory:');for(const f of sql.sort()){db.exec(fs.readFileSync(f,'utf8'));parsed.push(f);}
const tableRecords=[];
const tables=db.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
for(const t of tables){const columns=db.prepare('PRAGMA table_info('+t.name+')').all();const f='apps/web/db/schema.ts';const schema=fs.readFileSync(f,'utf8');const offset=schema.indexOf("sqliteTable('"+t.name+"'");const sourceLine=schema.slice(0,offset).split('\n').length;tableRecords.push({name:t.name,columns,foreignKeys:db.prepare('PRAGMA foreign_key_list('+t.name+')').all(),indexes:db.prepare('PRAGMA index_list('+t.name+')').all()});add(f,sourceLine,t.name,'SQLite table (persistent schema)',columns.map(c=>`${c.name}:${c.type}${c.pk?' PK':''}${c.notnull?' NOT NULL':''}`).join('; '));}
db.close();
rows.sort((a,b)=>a.file.localeCompare(b.file)||a.line-b.line||a.name.localeCompare(b.name));
const esc=s=>String(s).replaceAll('|','&#124;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('`','&#96;').replaceAll('\n',' ').replace(/\b[A-Za-z_$][\w$]*(?:secret|token|api_key)[\w$]*\b|\b(?:secret|token)\b/gi, word=>'<code>'+word+'</code>');
const titles={domain:'도메인·공통 및 UI 요청 경계',jobs:'작업·다운로드·PC 실행',analysis:'분석·검색·제공자 입력',storage:'저장·DB·레코드',connection:'연결·Android·호스팅'};
for(const [areaId,title]of Object.entries(titles)){
 let doc=`# ${title}: 선언 목록\n\n[전체 안내](README.md) · [핵심 타입 초안](diagrams.md)\n\n## 조사 질문과 이유\n\n이 영역에 어떤 실제 타입·함수·상태 선언이 있는가? 코드에 없는 클래스를 추가하지 않고 핵심 관계를 고르기 위한 목록이다.\n\n## 확인 위치와 조사 결과\n\n현재 선정 파일의 선언을 파서로 수집했다. 동일 이름도 파일·범위가 다르면 별개 선언이다. 타입/메서드의 일부 표시만으로 실제 호출 또는 객체 소유권을 단정하지 않는다. 값 전문 대신 식별자·타입·역할을 기록한다.\n\n| 이름 | 종류 | 정의 파일 | 모듈/package | 역할 | UML 표시 여부 | 표시/생략 이유 |\n|---|---|---|---|---|---|---|\n`;
 for(const r of rows.filter(x=>x.area===areaId)){
  const short=r.detail.length>220?r.detail.slice(0,217)+'...':r.detail;
  doc+=`| ${esc(r.name)} | ${esc(r.kind)} | [${r.file}:${r.line}](<../../../../${r.file}>) | ${esc(r.module)} | ${esc(r.role)}${short?' — '+esc(short):''} | ${r.show?'표시':'생략(표 보존)'} | ${r.show?'공개 계약·영속 변환·핵심 값 구조':r.status==='보조'?'1단계 보조 파일; 활성 호출·도구 경계 구분':'세부 함수·필드·상태/보조 타입; 핵심 관계만 도식화'} |\n`;
 }
 doc+='\n## 다이어그램과 읽는 방법\n\n[핵심 타입 초안](diagrams.md)의 해당 영역을 읽는다. 표시 열은 실제 선언과 그림 요소의 대응이며 생략 선언도 위 표에서 보존한다. 함수·지역 상태는 클래스 관계로 확대하지 않는다.\n\n## 판단·학습 포인트와 미확인\n\n선언 종류·수집 범위·미확인 사항은 [수집 기준](README.md)을 따른다. 표시한 타입의 실제 관계 근거는 [초안](diagrams.md)에 있다.\n';
 fs.writeFileSync(out+'/'+areaId+'.md',doc);
}
let manifest='# 선언 수집 대상 파일 대조\n\n[선언 안내](README.md)\n\n선정표의 포함/보조 애플리케이션 소스를 실제 파일로 펼쳤다. 0건인 파일도 남긴다. 테스트·설치 shell·설정 JSON·문서·생성 snapshot·바이너리·개인 상태는 내용 추출 대상이 아니다. SQL은 메모리 DB에만 적용한다.\n\n| 파일 | 1단계 구분 | 처리 | 선언 수 |\n|---|---|---|---|\n';
for(const [f,status]of [...statuses].sort())manifest+=`| [${f}](<../../../../${f}>) | ${status} | ${f.endsWith('.sql')?'memory SQLite migration':f.endsWith('.java')?'javac parse (no analyze)':'TypeScript AST parse'} | ${rows.filter(x=>x.file===f).length} |\n`;
fs.writeFileSync(out+'/files.md',manifest);
let records='# 실제 DB 테이블과 레코드 구조\n\n[선언 안내](README.md) · [저장 선언](storage.md)\n\n선정된 0000~0009 migration을 빈 메모리 SQLite에 적용한 뒤 PRAGMA로 읽었다. 사용자 DB·.wrangler 상태에 연결하지 않았다. schema.ts의 Drizzle 객체와 영속 테이블은 같은 것이 아니다.\n\n';
for(const table of tableRecords){records+='## '+table.name+'\n\n| 컬럼 | SQLite 타입 | NOT NULL | PK 순서 | 기본값 |\n|---|---|---|---|---|\n';for(const c of table.columns)records+=`| ${esc(c.name)} | ${c.type} | ${c.notnull?'예':'아니오'} | ${c.pk} | ${esc(c.dflt_value??'없음')} |\n`;records+='\nFK: '+(table.foreignKeys.length?table.foreignKeys.map(f=>`${f.from} → ${f.table}.${f.to}; onDelete=${f.on_delete}`).join(', '):'없음')+'.\n\n인덱스: '+table.indexes.map(i=>i.name+(i.unique?' (unique)':'')).join(', ')+'.\n\n';}
records+='TEXT JSON 컬럼은 SQLite 테이블의 자식 객체가 아니다. ClipRow/JobRow/SegmentMediaRow는 해당 행을 읽는 TypeScript 별칭이고 serialize/publicJob 등에서 공개 DTO로 바꾼다. PK 순서는 복합 키 순서를 나타낸다. SQLite의 PRAGMA NOT NULL 값과 PRIMARY KEY 의미를 혼동하지 않는다.\n';
fs.writeFileSync(out+'/records.md',records);
fs.mkdirSync('.security-checks/uml-declarations',{recursive:true});
fs.writeFileSync('.security-checks/uml-declarations/result.json',JSON.stringify({rows,parsed,tables:tables.map(t=>t.name),counts:Object.fromEntries(Object.keys(titles).map(k=>[k,rows.filter(x=>x.area===k).length]))},null,2));
console.log(JSON.stringify({files:parsed.length,declarations:rows.length,byArea:Object.fromEntries(Object.keys(titles).map(k=>[k,rows.filter(x=>x.area===k).length])),tables:tables.map(t=>t.name),kinds:Object.fromEntries([...new Set(rows.map(r=>r.kind))].map(k=>[k,rows.filter(r=>r.kind===k).length]))},null,2));
