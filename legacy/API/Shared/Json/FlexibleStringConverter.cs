using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace RealestateAPI.Shared.Json
{
    /// <summary>
    /// 숫자/불리언이 와도 string 으로 역직렬화한다.
    ///  · 프론트가 rtNo 등 식별자를 숫자로 보내는데 DTO 속성이 string? 인 경우 400(바인딩 실패)을 전역 방지.
    ///  · Program.cs 의 JsonOptions.Converters 에 등록 → 모든 string 속성에 적용.
    ///  · 쓰기(직렬화)는 문자열 그대로.
    /// </summary>
    public class FlexibleStringConverter : JsonConverter<string?>
    {
        public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            switch (reader.TokenType)
            {
                case JsonTokenType.String:
                    return reader.GetString();
                case JsonTokenType.Number:
                    return reader.TryGetInt64(out var l) ? l.ToString() : reader.GetDecimal().ToString();
                case JsonTokenType.True:
                    return "true";
                case JsonTokenType.False:
                    return "false";
                case JsonTokenType.Null:
                    return null;
                default:
                    reader.Skip(); // 객체/배열 등은 문자열로 담을 수 없음 → 무시
                    return null;
            }
        }

        public override void Write(Utf8JsonWriter writer, string? value, JsonSerializerOptions options)
        {
            if (value == null) writer.WriteNullValue();
            else writer.WriteStringValue(value);
        }
    }
}
