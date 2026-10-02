from pathlib import Path
import json, math, re, shutil
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parent.parent
kit = root / 'outputs/cutnote-logo-kit'
kit.mkdir(parents=True, exist_ok=True)
source = root / 'outputs/cutnote-android/app/src/main/res/drawable/ic_cutnote.xml'
android = '{http://schemas.android.com/apk/res/android}'
paths = [(p.attrib[android+'fillColor'], p.attrib[android+'pathData']) for p in ET.parse(source).getroot()]
icon = '\n'.join(f'<path fill="{fill}" d="{path}"/>' for fill, path in paths)

def svg(width, height, viewbox, content, label):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="{viewbox}" role="img" aria-label="{label}">\n<title>{label}</title>\n{content}\n</svg>\n'

(kit/'cutnote-app-icon.svg').write_text(svg(2048, 2048, '0 0 48 48', icon, '컷노트 앱 아이콘'), encoding='utf-8')
outline = json.loads((root/'work/logo-outline.json').read_text())
x0, y0, x1, y1 = outline['bounds']
height = 336
scale = 168 / (y1-y0)
text_x = 350
width = math.ceil(text_x+(x1-x0)*scale+40)
tx = text_x-x0*scale
ty = (height-168)/2+y1*scale

def lockup(fill):
    return f'<g transform="translate(40 40) scale({256/48:.8f})">{icon}</g>\n<path fill="{fill}" transform="matrix({scale:.8f} 0 0 {-scale:.8f} {tx:.8f} {ty:.8f})" d="{outline["path"]}"/>'

for name, fill, label in [('dark', '#191919', '밝은 배경용'), ('white', '#FFFFFF', '어두운 배경용')]:
    (kit/f'cutnote-lockup-{name}.svg').write_text(svg(3000, round(3000*height/width), f'0 0 {width} {height}', lockup(fill), f'컷노트 가로형 로고 · {label}'), encoding='utf-8')

favicon = (root/'outputs/cutnote/public/favicon.svg').read_text()
# Keep the existing favicon geometry exactly; only specify export dimensions.
favicon = favicon.replace('<svg ', '<svg width="2048" height="2048" ', 1)
(kit/'cutnote-web-icon.svg').write_text(favicon, encoding='utf-8')
web_body = re.sub(r'^.*?<svg[^>]*>|</svg>\s*$', '', favicon, flags=re.S)

preview = f'''<rect width="1800" height="1240" fill="#F7F7F8"/>
<text x="64" y="103" fill="#191919" font-family="Helvetica,Arial,sans-serif" font-weight="700" font-size="48" letter-spacing="3">CUTNOTE</text>
<text x="66" y="150" fill="#666666" font-family="Helvetica,Arial,sans-serif" font-size="18" letter-spacing="2">APP LOGO FILES</text>
<rect x="1450" y="82" width="42" height="42" rx="14" fill="#FEE500"/><rect x="1502" y="82" width="42" height="42" rx="14" fill="#191919"/>
<text x="1570" y="109" fill="#666666" font-family="Helvetica,Arial,sans-serif" font-size="16">YELLOW + INK</text>
<rect x="64" y="210" width="804" height="380" rx="24" fill="#FFFFFF" stroke="#E5E5E8"/>
<rect x="900" y="210" width="836" height="380" rx="24" fill="#191919"/>
<text x="98" y="260" fill="#777777" font-family="Helvetica,Arial,sans-serif" font-size="14" letter-spacing="1.4">01 / LIGHT BACKGROUND</text>
<text x="934" y="260" fill="#BBBBBB" font-family="Helvetica,Arial,sans-serif" font-size="14" letter-spacing="1.4">02 / DARK BACKGROUND</text>
<g transform="translate(96 286) scale({740/width:.8f})">{lockup('#191919')}</g>
<g transform="translate(948 286) scale({740/width:.8f})">{lockup('#FFFFFF')}</g>
<rect x="64" y="622" width="804" height="512" rx="24" fill="#FFFFFF" stroke="#E5E5E8"/>
<rect x="900" y="622" width="836" height="512" rx="24" fill="#FFFFFF" stroke="#E5E5E8"/>
<text x="98" y="675" fill="#777777" font-family="Helvetica,Arial,sans-serif" font-size="14" letter-spacing="1.4">03 / APP ICON</text>
<text x="934" y="675" fill="#777777" font-family="Helvetica,Arial,sans-serif" font-size="14" letter-spacing="1.4">04 / CURRENT WEB FAVICON</text>
<g transform="translate(328 728) scale({276/48:.8f})">{icon}</g>
<g transform="translate(1180 740) scale({256/40:.8f})">{web_body}</g>
<text x="98" y="1087" fill="#666666" font-family="Helvetica,Arial,sans-serif" font-size="16">BOOKMARK + PLAY</text>
<text x="934" y="1087" fill="#666666" font-family="Helvetica,Arial,sans-serif" font-size="16">CLAPPERBOARD / SEPARATE WEB ASSET</text>
<text x="66" y="1198" fill="#777777" font-family="Helvetica,Arial,sans-serif" font-size="15" letter-spacing="1.2">PNG / TRANSPARENT    ·    SVG / OUTLINED WORDMARK    ·    #FEE500 + #191919</text>'''
(root/'work/cutnote-logo-preview.svg').write_text(svg(1800, 1240, '0 0 1800 1240', preview, '컷노트 로고 파일 미리보기'), encoding='utf-8')

readme = '''# 컷노트 로고 파일

이 묶음의 대표 로고는 **현재 Android 앱에서 실제 사용 중인 북마크 + 재생 아이콘**을 기준으로 만들었습니다. 앱 원본의 형태·비율·색상을 그대로 유지했습니다. 앱이나 웹 코드는 변경하지 않았습니다.

## 바로 사용하기

- 발표 슬라이드·문서: `cutnote-lockup-dark.png`를 흰색이나 밝은 배경에 올립니다.
- 어두운 발표 배경: `cutnote-lockup-white.png`를 사용합니다. 글자만 흰색이며 아이콘은 원래 색상입니다.
- 아이콘만 필요할 때: `cutnote-app-icon.png`를 사용합니다.
- 확대 인쇄·디자인 편집: 같은 이름의 SVG를 사용합니다. 한글 ‘컷노트’는 글자 윤곽선(path)으로 변환되어 별도 폰트 설치가 필요 없습니다. 폰트 파일 자체는 포함하지 않았습니다.
- 모든 PNG 로고의 배경은 투명합니다. `preview.png`만 배경을 포함한 확인용 이미지입니다.

## 파일

| 파일 | 내용 |
|---|---|
| `cutnote-app-icon.svg` / `.png` | 앱 아이콘, PNG 2048×2048 |
| `cutnote-lockup-dark.svg` / `.png` | 앱 아이콘 + 검정 ‘컷노트’, PNG 가로 3000px |
| `cutnote-lockup-white.svg` / `.png` | 앱 아이콘 + 흰색 ‘컷노트’, PNG 가로 3000px |
| `cutnote-web-icon.svg` / `.png` | 현재 웹 favicon 별도 보관본, PNG 2048×2048 |
| `preview.png` | 밝은/어두운 배경에서의 가로형 로고와 두 아이콘 비교 |

## 색상과 원본

- 노랑: `#FEE500`
- 검정: `#191919`
- 어두운 배경용 글자: `#FFFFFF`
- 앱 아이콘 원본: `outputs/cutnote-android/app/src/main/res/drawable/ic_cutnote.xml`
- 웹 favicon 원본: `outputs/cutnote/public/favicon.svg`

**앱 아이콘과 현재 웹 아이콘은 서로 다른 형태입니다.** 앱은 북마크와 재생 삼각형이고, 웹은 클래퍼보드 형태입니다. `cutnote-web-icon`은 기존 웹 favicon을 따로 보관한 파일이며, 웹 상단 Lucide 아이콘을 대체하거나 로고를 통합한 결과가 아닙니다. 가로형 ‘컷노트’ 배치는 발표용으로 구성한 것으로 기존 UI 글꼴 자체를 복제한 파일은 아닙니다.

가로·세로 비율을 고정해 크기를 조절하고, 로고 주변의 여백을 유지해 주세요. SVG에는 외부 이미지·폰트 참조가 없습니다.
'''
(kit/'README.md').write_text(readme, encoding='utf-8')
print(json.dumps({'kit':str(kit), 'lockupViewBox':[width,height], 'wordmarkFont':outline['font'], 'sourceIconPathCount':len(paths)},ensure_ascii=False))
