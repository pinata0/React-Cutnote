import fs from "node:fs";
import path from "node:path";

// Historical converter: inputs and outputs stay beside this archived tool.
const projectRoot = import.meta.dirname;
const sourcePath = path.join(projectRoot, "분류 후보군_개정판.md");
const outputDir = projectRoot;
const outputPath = path.join(outputDir, "taxonomy.v2.yaml");

const source = fs.readFileSync(sourcePath, "utf8");
const lines = source.split(/\r?\n/);

const namespaceDescriptions = {
  visual_style: "화면 전체에서 관찰되는 미학적·매체적 스타일",
  generation_method: "효과를 생성한 것으로 추정되는 알고리즘 또는 시스템",
  production_technique: "촬영·애니메이션·후반 제작 과정에서 사용된 것으로 추정되는 기법",
  transformation: "픽셀, 형태, 시간축에 직접 적용된 시각 변형",
  motion_style: "피사체 또는 화면 요소가 보이는 방식과 시간적 리듬",
  texture: "화면 또는 표면에서 관찰되는 재질과 질감",
  geometry_pattern: "반복 구조, 도형, 공간 패턴",
  compositing: "레이어 결합과 전경·배경 상호작용",
};

const displayNames = {
  visual_style: "Visual Style",
  generation_method: "Generation Method",
  production_technique: "Production Technique",
  transformation: "Transformation",
  motion_style: "Motion Style",
  texture: "Texture / Surface Style",
  geometry_pattern: "Geometry / Pattern",
  compositing: "Compositing / Layer Interaction",
};

const aliasOverrides = {
  "transformation.rgb_split": ["RGB Shift", "RGB Separation", "Color Split", "Channel Separation", "색분리", "RGB 분리"],
  "visual_style.rgb_split": ["RGB Shift Style", "RGB Separation Style"],
  "visual_style.vhs": ["Video Home System", "비디오테이프", "VHS 룩"],
  "visual_style.digital_glitch": ["Digital Error", "디지털 글리치"],
  "motion_style.jitter": ["Micro Shake", "떨림"],
  "texture.grainy": ["Grain", "Film Grain Texture", "입자감"],
  "compositing.ghosting": ["Ghost Image", "잔상 합성"],
};

const parentOverrides = {
  "visual_style.digital_glitch": "visual_style.glitch",
  "visual_style.analog_glitch": "visual_style.glitch",
  "visual_style.datamosh": "visual_style.digital_glitch",
  "visual_style.pixel_sorting": "visual_style.digital_glitch",
  "visual_style.compression_artifact": "visual_style.digital_glitch",
  "visual_style.block_artifact": "visual_style.digital_glitch",
  "visual_style.signal_error": "visual_style.analog_glitch",
  "visual_style.scanline": "visual_style.analog_glitch",
  "visual_style.static": "visual_style.analog_glitch",
};

const namespaces = [];
const tags = [];
let currentNamespace = null;

for (let index = 0; index < lines.length; index += 1) {
  const namespaceMatch = lines[index].match(/^- namespace: `([^`]+)`/);
  if (namespaceMatch) {
    const id = namespaceMatch[1];
    const rootMatch = lines[index + 1]?.match(/^- root_id: `([^`]+)`/);
    const observableMatch = lines[index + 2]?.match(/^- default_observable: `([^`]+)`/);
    currentNamespace = {
      id,
      display_name: displayNames[id] ?? id,
      root_id: rootMatch?.[1] ?? `${id}.root`,
      default_observable: observableMatch?.[1] === "true",
      description: namespaceDescriptions[id] ?? "",
    };
    namespaces.push(currentNamespace);
    continue;
  }

  if (!currentNamespace) continue;

  const headingMatch = lines[index].match(/^## (.+)$/);
  if (!headingMatch) continue;

  const idMatch = lines[index + 1]?.match(/^- id: `([^`]+)`/);
  const aliasesMatch = lines[index + 2]?.match(/^- aliases: (.+)$/);
  const parentMatch = lines[index + 3]?.match(/^- parent: `([^`]+)`/);
  const observableMatch = lines[index + 4]?.match(/^- observable: (true|false)$/);
  if (!idMatch || !parentMatch || !observableMatch) continue;

  const id = idMatch[1];
  tags.push({
    id,
    namespace: currentNamespace.id,
    display_name: headingMatch[1],
    aliases: aliasOverrides[id] ?? (aliasesMatch?.[1] === "[]" ? [] : []),
    parent: parentOverrides[id] ?? parentMatch[1],
    observable: observableMatch[1] === "true",
    auto_accept_allowed: observableMatch[1] === "true",
  });
}

const additions = {
  color: {
    display_name: "Color",
    description: "주조색, 색온도, 채도, 명암 등 화면에서 직접 관찰되는 색채 특성",
    tags: [
      ["red", "Red", ["red tone", "붉은색", "적색"]],
      ["orange", "Orange", ["orange tone", "주황색"]],
      ["yellow", "Yellow", ["yellow tone", "노란색"]],
      ["green", "Green", ["green tone", "초록색"]],
      ["cyan", "Cyan", ["청록색", "시안"]],
      ["blue", "Blue", ["blue tone", "bluish", "파란색", "푸른색"]],
      ["purple", "Purple", ["violet", "보라색"]],
      ["pink", "Pink", ["magenta", "분홍색"]],
      ["monochrome", "Monochrome", ["black and white", "grayscale", "흑백"]],
      ["warm", "Warm", ["warm tone", "warm color", "웜톤", "따뜻한 색감"]],
      ["cool", "Cool", ["cool tone", "cool color", "쿨톤", "차가운 색감"]],
      ["high_saturation", "High Saturation", ["saturated", "vivid", "고채도"]],
      ["desaturated", "Desaturated", ["low saturation", "muted color", "저채도"]],
      ["high_contrast", "High Contrast", ["strong contrast", "고대비"]],
      ["low_contrast", "Low Contrast", ["flat contrast", "저대비"]],
      ["dark", "Dark", ["low key", "어두운"]],
      ["bright", "Bright", ["high key", "밝은"]],
      ["pastel_palette", "Pastel Palette", ["pastel colors", "파스텔 색감"]],
      ["neon_palette", "Neon Palette", ["neon colors", "네온 색감"]],
      ["duotone_palette", "Duotone Palette", ["two color palette", "이중 색조"]],
    ],
  },
  shot_type: {
    display_name: "Shot Type",
    description: "주 피사체가 프레임 안에서 차지하는 크기와 구도",
    tags: [
      ["extreme_close_up", "Extreme Close-Up", ["ECU", "익스트림 클로즈업"]],
      ["close_up", "Close-Up", ["CU", "클로즈업"]],
      ["medium_close_up", "Medium Close-Up", ["MCU", "미디엄 클로즈업"]],
      ["medium_shot", "Medium Shot", ["MS", "미디엄 숏"]],
      ["medium_full_shot", "Medium Full Shot", ["cowboy shot", "미디엄 풀 숏"]],
      ["full_shot", "Full Shot", ["FS", "full body", "풀 숏", "전신"]],
      ["wide_shot", "Wide Shot", ["WS", "long shot", "와이드 숏"]],
      ["extreme_wide_shot", "Extreme Wide Shot", ["EWS", "extreme long shot", "익스트림 와이드 숏"]],
      ["over_the_shoulder", "Over-the-Shoulder", ["OTS", "오버 더 숄더"]],
      ["point_of_view", "Point of View", ["POV", "시점 숏"]],
    ],
  },
  camera_motion: {
    display_name: "Camera Motion",
    description: "피사체 움직임과 구분되는 카메라 또는 가상 카메라의 이동",
    tags: [
      ["static", "Static Camera", ["locked-off", "고정 카메라"]],
      ["pan", "Pan", ["panning", "팬"]],
      ["tilt", "Tilt", ["tilting", "틸트"]],
      ["dolly_in", "Dolly In", ["push in", "트랙 인", "달리 인"]],
      ["dolly_out", "Dolly Out", ["pull out", "트랙 아웃", "달리 아웃"]],
      ["truck_left", "Truck Left", ["track left", "좌측 트래킹"]],
      ["truck_right", "Truck Right", ["track right", "우측 트래킹"]],
      ["pedestal_up", "Pedestal Up", ["camera rise", "카메라 상승"]],
      ["pedestal_down", "Pedestal Down", ["camera lower", "카메라 하강"]],
      ["crane", "Crane", ["jib", "크레인 숏"]],
      ["orbit", "Orbit", ["arc shot", "오빗", "회전 이동"]],
      ["handheld", "Handheld Camera", ["hand-held", "핸드헬드"]],
      ["steadicam", "Steadicam", ["stabilized follow", "스테디캠"]],
      ["whip_pan", "Whip Pan", ["swish pan", "휩 팬"]],
      ["dolly_zoom", "Dolly Zoom", ["vertigo effect", "zolly", "달리 줌"]],
    ],
  },
  subject: {
    display_name: "Subject",
    description: "클립에서 시각적으로 확인되는 주요 피사체 유형",
    tags: [
      ["person", "Person", ["human", "사람", "인물"]],
      ["face", "Face", ["facial", "얼굴"]],
      ["hand", "Hand", ["hands", "손"]],
      ["crowd", "Crowd", ["group of people", "군중"]],
      ["product", "Product", ["object showcase", "제품"]],
      ["vehicle", "Vehicle", ["car", "transport", "차량"]],
      ["building", "Building", ["architecture", "건물", "건축"]],
      ["city", "City", ["urban", "cityscape", "도시"]],
      ["landscape", "Landscape", ["scenery", "풍경"]],
      ["nature", "Nature", ["natural scene", "자연"]],
      ["animal", "Animal", ["creature", "동물"]],
      ["food", "Food", ["dish", "음식"]],
      ["typography", "Typography", ["text", "lettering", "타이포그래피", "텍스트"]],
      ["abstract", "Abstract Subject", ["non-representational", "추상"]],
      ["screen_interface", "Screen / Interface", ["UI", "device screen", "화면", "인터페이스"]],
    ],
  },
};

for (const [id, definition] of Object.entries(additions)) {
  namespaces.push({
    id,
    display_name: definition.display_name,
    root_id: `${id}.root`,
    default_observable: true,
    description: definition.description,
  });
  for (const [slug, displayName, aliases] of definition.tags) {
    tags.push({
      id: `${id}.${slug}`,
      namespace: id,
      display_name: displayName,
      aliases,
      parent: `${id}.root`,
      observable: true,
      auto_accept_allowed: true,
    });
  }
}

const relations = [
  ["visual_style.rgb_split", "transformation.rgb_split", "related_to"],
  ["visual_style.chromatic_aberration", "transformation.chromatic_aberration", "related_to"],
  ["visual_style.datamosh", "transformation.datamosh", "related_to"],
  ["visual_style.pixel_sorting", "transformation.pixel_sorting", "related_to"],
  ["motion_style.handheld", "camera_motion.handheld", "related_to"],
  ["motion_style.dolly_zoom", "camera_motion.dolly_zoom", "related_to"],
  ["motion_style.orbit", "camera_motion.orbit", "related_to"],
];

const namespaceIds = new Set();
for (const namespace of namespaces) {
  if (namespaceIds.has(namespace.id)) throw new Error(`Duplicate namespace: ${namespace.id}`);
  namespaceIds.add(namespace.id);
}

const tagIds = new Set();
for (const tag of tags) {
  if (tagIds.has(tag.id)) throw new Error(`Duplicate tag: ${tag.id}`);
  if (!namespaceIds.has(tag.namespace)) throw new Error(`Unknown namespace for ${tag.id}: ${tag.namespace}`);
  if (!tag.id.startsWith(`${tag.namespace}.`)) throw new Error(`Namespace mismatch: ${tag.id}`);
  if (!tag.observable && tag.auto_accept_allowed) throw new Error(`Inferred tag cannot auto-accept: ${tag.id}`);
  tagIds.add(tag.id);
}

const rootIds = new Set(namespaces.map((namespace) => namespace.root_id));
for (const tag of tags) {
  if (!rootIds.has(tag.parent) && !tagIds.has(tag.parent)) {
    throw new Error(`Unknown parent for ${tag.id}: ${tag.parent}`);
  }
}

for (const [sourceTagId, targetTagId] of relations) {
  if (!tagIds.has(sourceTagId)) throw new Error(`Unknown relation source: ${sourceTagId}`);
  if (!tagIds.has(targetTagId)) throw new Error(`Unknown relation target: ${targetTagId}`);
}

const q = (value) => JSON.stringify(value);
const yaml = [];
yaml.push('version: "2.0.0"');
yaml.push('source_document: "분류 후보군_개정판.md"');
yaml.push('description: "영상 효과 레퍼런스 서비스의 canonical 태그 사전"');
yaml.push("");
yaml.push("namespaces:");
for (const namespace of namespaces) {
  yaml.push(`  - id: ${q(namespace.id)}`);
  yaml.push(`    display_name: ${q(namespace.display_name)}`);
  yaml.push(`    root_id: ${q(namespace.root_id)}`);
  yaml.push(`    default_observable: ${namespace.default_observable}`);
  yaml.push(`    description: ${q(namespace.description)}`);
}
yaml.push("");
yaml.push("tags:");
for (const tag of tags) {
  yaml.push(`  - id: ${q(tag.id)}`);
  yaml.push(`    namespace: ${q(tag.namespace)}`);
  yaml.push(`    display_name: ${q(tag.display_name)}`);
  yaml.push(`    aliases: [${tag.aliases.map(q).join(", ")}]`);
  yaml.push(`    parent: ${q(tag.parent)}`);
  yaml.push(`    observable: ${tag.observable}`);
  yaml.push(`    auto_accept_allowed: ${tag.auto_accept_allowed}`);
}
yaml.push("");
yaml.push("relations:");
for (const [sourceTagId, targetTagId, relationType] of relations) {
  yaml.push(`  - source_tag_id: ${q(sourceTagId)}`);
  yaml.push(`    target_tag_id: ${q(targetTagId)}`);
  yaml.push(`    relation_type: ${q(relationType)}`);
}
yaml.push("");

const generated = yaml.join("\n");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(outputPath, "utf8") !== generated) {
    throw new Error("Archived taxonomy differs from converter output; review the historical sources before regenerating.");
  }
  console.log(`Verified ${path.relative(projectRoot, outputPath)} (no files written)`);
} else {
  fs.writeFileSync(outputPath, generated, "utf8");
  console.log(`Generated ${path.relative(projectRoot, outputPath)}`);
}
console.log(`${namespaces.length} namespaces, ${tags.length} tags, ${relations.length} relations`);
