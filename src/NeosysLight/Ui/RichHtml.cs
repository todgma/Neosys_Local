using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Documents;
using System.Windows.Media;

namespace Neosys.Local.App.Ui;

/// <summary>
/// 물건특징·상담내용 한 줄 리치텍스트 ↔ HTML. 기존 contentEditable(RichLine)이 저장하던 형태를 그대로 읽고 쓴다:
/// 글자색 &lt;span style="color: red"&gt;, 줄바꿈 &lt;div&gt;/&lt;br&gt;, HTML 엔터티. 그 밖의 태그는 무시(글자만 남김).
/// </summary>
public static partial class RichHtml
{
    // 기존 글자색 드롭다운 값(빨강·파랑·초록·주황·보라) — 저장할 때 이 이름으로 되돌린다
    private static readonly Dictionary<string, Color> Named = new(StringComparer.OrdinalIgnoreCase)
    {
        ["red"] = Colors.Red, ["blue"] = Colors.Blue, ["green"] = Color.FromRgb(0x00, 0x80, 0x00),
        ["orange"] = Color.FromRgb(0xFF, 0xA5, 0x00), ["purple"] = Color.FromRgb(0x80, 0x00, 0x80),
    };

    public static Brush BrushOf(string css) => new SolidColorBrush(ParseColor(css) ?? Colors.Black);

    private static Color? ParseColor(string? css)
    {
        css = css?.Trim();
        if (string.IsNullOrEmpty(css)) return null;
        if (Named.TryGetValue(css, out var n)) return n;
        try { return (Color)ColorConverter.ConvertFromString(css); }
        catch { return null; }
    }

    private static string CssOf(Color c)
    {
        foreach (var (name, v) in Named) if (v == c) return name;
        return $"#{c.R:x2}{c.G:x2}{c.B:x2}";
    }

    [GeneratedRegex(@"<(/?)([a-zA-Z0-9]+)([^>]*)>|([^<]+)", RegexOptions.Singleline)]
    private static partial Regex Token();

    [GeneratedRegex(@"color\s*:\s*([^;""']+)", RegexOptions.IgnoreCase)]
    private static partial Regex StyleColor();

    [GeneratedRegex(@"color\s*=\s*[""']?([^""'\s>]+)", RegexOptions.IgnoreCase)]
    private static partial Regex FontColor();

    /// <summary>저장된 HTML(또는 일반 글자)을 문서에 채운다. 첫 문단은 접두([날짜] [작성자] 연락처 :) 뒤에 이어진다.</summary>
    public static void Load(FlowDocument doc, string? html)
    {
        doc.Blocks.Clear();
        var para = new Paragraph();
        doc.Blocks.Add(para);
        if (string.IsNullOrEmpty(html)) return;

        var colors = new Stack<Color?>();
        Color? Current() => colors.Count > 0 ? colors.Peek() : null;
        void NewLine()
        {
            para = new Paragraph();
            doc.Blocks.Add(para);
        }
        void Text(string s)
        {
            if (s.Length == 0) return;
            var run = new Run(s);
            if (Current() is { } c) run.Foreground = new SolidColorBrush(c);
            para.Inlines.Add(run);
        }

        // 태그가 없는 예전(일반 글자) 내용: 줄바꿈 그대로
        if (!html.Contains('<'))
        {
            var lines = WebUtility.HtmlDecode(html).Replace("\r\n", "\n").Split('\n');
            for (var i = 0; i < lines.Length; i++)
            {
                if (i > 0) NewLine();
                Text(lines[i]);
            }
            return;
        }

        var started = false;   // 첫 <div>는 이전 글자가 있을 때만 새 줄
        foreach (Match m in Token().Matches(html))
        {
            if (m.Groups[4].Success)
            {
                var s = WebUtility.HtmlDecode(m.Groups[4].Value).Replace(' ', ' ').Replace("\r", "").Replace("\n", "");
                Text(s);
                if (s.Length > 0) started = true;
                continue;
            }
            var closing = m.Groups[1].Value == "/";
            var tag = m.Groups[2].Value.ToLowerInvariant();
            var attrs = m.Groups[3].Value;
            switch (tag)
            {
                case "br":
                    NewLine();
                    started = true;
                    break;
                case "div" or "p":
                    if (!closing && (started || para.Inlines.Count > 0)) NewLine();
                    started = true;
                    break;
                case "span" or "font":
                    if (closing) { if (colors.Count > 0) colors.Pop(); break; }
                    var cm = tag == "span" ? StyleColor().Match(attrs) : FontColor().Match(attrs);
                    colors.Push(cm.Success ? ParseColor(cm.Groups[1].Value) ?? Current() : Current());
                    break;
            }
        }
        // contentEditable이 끝에 붙이는 <br>로 생긴 빈 줄은 지운다(사용자가 넣은 빈 줄 <div><br></div>은 남김)
        if (doc.Blocks.Count > 1 && doc.Blocks.LastBlock is Paragraph last && last.Inlines.Count == 0
            && html.EndsWith("<br>", StringComparison.OrdinalIgnoreCase) && !html.EndsWith("<div><br></div>", StringComparison.OrdinalIgnoreCase))
            doc.Blocks.Remove(last);
    }

    /// <summary>문서 → HTML(기존 contentEditable 형태: 첫 줄은 그대로, 다음 줄부터 &lt;div&gt;). 글자가 없으면 빈 문자열.</summary>
    public static string ToHtml(FlowDocument doc, Brush? defaultFore = null)
    {
        var plain = new TextRange(doc.ContentStart, doc.ContentEnd).Text.Trim();
        if (plain.Length == 0) return "";
        var def = (defaultFore as SolidColorBrush)?.Color;
        var sb = new StringBuilder();
        var first = true;
        foreach (var block in doc.Blocks)
        {
            if (block is not Paragraph p) continue;
            var line = new StringBuilder();
            foreach (var inline in p.Inlines) Inline(line, inline, def);
            if (first) sb.Append(line);
            else sb.Append("<div>").Append(line.Length == 0 ? "<br>" : line.ToString()).Append("</div>");
            first = false;
        }
        return sb.ToString();
    }

    private static void Inline(StringBuilder sb, Inline inline, Color? def)
    {
        switch (inline)
        {
            case Run r:
                var text = WebUtility.HtmlEncode(r.Text);
                var c = (r.Foreground as SolidColorBrush)?.Color;
                if (r.ReadLocalValue(TextElement.ForegroundProperty) != System.Windows.DependencyProperty.UnsetValue && c is { } col && col != def)
                    sb.Append("<span style=\"color: ").Append(CssOf(col)).Append(";\">").Append(text).Append("</span>");
                else sb.Append(text);
                break;
            case LineBreak:
                sb.Append("<br>");
                break;
            case Span s:
                // 색이 걸린 Span(글자색 적용 결과)은 안쪽 글자에 색을 물려준다
                var sc = s.ReadLocalValue(TextElement.ForegroundProperty) != System.Windows.DependencyProperty.UnsetValue ? (s.Foreground as SolidColorBrush)?.Color : null;
                var inner = new StringBuilder();
                foreach (var i in s.Inlines) Inline(inner, i, sc ?? def);
                if (sc is { } spanColor && spanColor != def) sb.Append("<span style=\"color: ").Append(CssOf(spanColor)).Append(";\">").Append(inner).Append("</span>");
                else sb.Append(inner);
                break;
        }
    }

    [GeneratedRegex("<[^>]*>")]
    private static partial Regex AnyTag();

    /// <summary>목록·보고서용 글자만(태그 제거, 줄바꿈은 공백)</summary>
    public static string ToPlain(string? html)
    {
        if (string.IsNullOrEmpty(html)) return "";
        if (!html.Contains('<')) return html;
        var s = Regex.Replace(html, @"<br\s*/?>|</?(div|p)[^>]*>", " ", RegexOptions.IgnoreCase);
        return Regex.Replace(WebUtility.HtmlDecode(AnyTag().Replace(s, "")).Replace(' ', ' '), @"\s{2,}", " ").Trim();
    }
}
