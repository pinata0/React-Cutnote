import {localSegments} from '@/lib/jobs/server';
import {findClip,json,unavailable} from '@/lib/server';
import {segmentMediaList,cleanSegmentMedia} from '@/lib/segment-media';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){try{const{id}=await params,row=await findClip(id);if(!row){await cleanSegmentMedia(id);return json({error:'영상을 찾지 못했어요.'},404);}const segments=row.local_asset?(await localSegments(row)).map(({asset,...item})=>{void asset;return item;}):await segmentMediaList(row);await cleanSegmentMedia(id);return json({segments});}catch(e){return unavailable(e);}}
