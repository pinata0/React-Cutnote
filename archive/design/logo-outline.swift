import Foundation
import CoreText
import CoreGraphics

let font = CTFontCreateWithName("AppleSDGothicNeo-Bold" as CFString, 1000, nil)
let characters = Array("컷노트".utf16)
var glyphs = [CGGlyph](repeating: 0, count: characters.count)
guard CTFontGetGlyphsForCharacters(font, characters, &glyphs, characters.count), !glyphs.contains(0) else {
    fatalError("Korean glyphs unavailable")
}
var advances = [CGSize](repeating: .zero, count: glyphs.count)
CTFontGetAdvancesForGlyphs(font, .horizontal, glyphs, &advances, glyphs.count)
let outline = CGMutablePath()
var position: CGFloat = 0
for i in glyphs.indices {
    guard let path = CTFontCreatePathForGlyph(font, glyphs[i], nil) else { fatalError("Missing outline") }
    outline.addPath(path, transform: CGAffineTransform(translationX: position, y: 0))
    position += advances[i].width - 20
}
func number(_ value: CGFloat) -> String { String(format: "%.3f", Double(value)) }
func point(_ value: CGPoint) -> String { number(value.x) + "," + number(value.y) }
var commands = [String]()
outline.applyWithBlock { pointer in
    let element = pointer.pointee
    switch element.type {
    case .moveToPoint: commands.append("M" + point(element.points[0]))
    case .addLineToPoint: commands.append("L" + point(element.points[0]))
    case .addQuadCurveToPoint: commands.append("Q" + point(element.points[0]) + " " + point(element.points[1]))
    case .addCurveToPoint: commands.append("C" + point(element.points[0]) + " " + point(element.points[1]) + " " + point(element.points[2]))
    case .closeSubpath: commands.append("Z")
    @unknown default: fatalError("Unsupported outline element")
    }
}
let bounds = outline.boundingBoxOfPath
let result: [String: Any] = [
    "font": CTFontCopyPostScriptName(font) as String,
    "family": CTFontCopyFamilyName(font) as String,
    "text": "컷노트", "path": commands.joined(separator: " "),
    "bounds": [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY].map(Double.init)
]
let data = try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys])
try data.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
print("Outlined Korean glyphs: \(glyphs.count); font: \(CTFontCopyPostScriptName(font))")
