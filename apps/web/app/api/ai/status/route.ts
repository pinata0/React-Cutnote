import {aiStatus} from '@/lib/ai/settings';
import {json} from '@/lib/server';
import {workspaceContext} from '@/lib/workspace-context';
export async function GET(req:Request){const workspace=workspaceContext(req);try{const status=await aiStatus();return json({...status,canConnect:status.canConnect&&workspace.keyManagement==='here',workspace});}catch{return json({configured:false,canConnect:false,workspace,error:'AI 연결 상태를 확인하지 못했어요.'},503);}}
