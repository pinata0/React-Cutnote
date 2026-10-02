import {pendingSegmentTags} from './segment-tagging';
import {filterClips,type Clip,type Tags,type TagFilter,type SearchOptions} from '../../lib/clips';
import {segmentTags,withLegacyStatus,type ClipSegment} from '../../lib/segments';
export type SegmentResult={clip:Clip;segment:ClipSegment;tags:Tags};
export function filterSegments(clips:Clip[],query:string,filters:TagFilter[],options:SearchOptions={}):SegmentResult[]{return clips.flatMap(clip=>withLegacyStatus(clip.segments||[],clip.tagging).flatMap(segment=>{const tags=segmentTags(segment);const candidate:Clip={id:segment.id,title:segment.title||'',sourceUrl:'',videoUrl:null,posterUrl:null,createdAt:clip.createdAt,tags,notes:segment.note,tagging:segment.tagging,segments:[segment]};const searchOptions=options.review==='suggested'&&pendingSegmentTags(segment)>0?{...options,review:'all' as const}:options;return filterClips([candidate],query,filters,searchOptions).length?[{clip,segment,tags}]:[];}));}
