using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace RealestateAPI.Community.Models
{
    // rt_no는 VARCHAR이지만 프론트가 숫자로 보내는 경우가 있어, 숫자/문자 모두 문자열로 역직렬화
    public class FlexibleStringConverter : JsonConverter<string?>
    {
        public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            switch (reader.TokenType)
            {
                case JsonTokenType.String: return reader.GetString();
                case JsonTokenType.Number:
                    return reader.TryGetInt64(out var l) ? l.ToString() : reader.GetDecimal().ToString();
                case JsonTokenType.Null: return null;
                case JsonTokenType.True: return "true";
                case JsonTokenType.False: return "false";
                default: return null;
            }
        }

        public override void Write(Utf8JsonWriter writer, string? value, JsonSerializerOptions options)
        {
            if (value == null) writer.WriteNullValue(); else writer.WriteStringValue(value);
        }
    }

    public class CommunityPost
    {
        public long PostId { get; set; }
        public string Tab { get; set; } = "";
        public string Title { get; set; } = "";
        public string? Content { get; set; }
        public string? Fields { get; set; }         // JSON 문자열(매물/게시자 정형 항목)
        public string? Author { get; set; }
        public int ViewCnt { get; set; }
        public DateTime? RegDt { get; set; }
        public string? RegId { get; set; }
    }

    public class CommunityListResult
    {
        public List<CommunityPost> Items { get; set; } = new();
    }

    public class CommunityCreateDto
    {
        public string Tab { get; set; } = "";
        public string Title { get; set; } = "";
        public string? Content { get; set; }
        public string? Fields { get; set; }         // JSON 문자열(매물/게시자 정형 항목)
        public string? Author { get; set; }
        public long? OffNo { get; set; }
        [JsonConverter(typeof(FlexibleStringConverter))]
        public string? RtNo { get; set; }
        public string? RegId { get; set; }
    }

    // ── 구인·구직 게시판(정형 입력) ──
    public class CommunityJob
    {
        public long PostId { get; set; }
        public string Kind { get; set; } = "";      // 구인 | 구직
        public string Title { get; set; } = "";
        public string? Author { get; set; }
        public string? Fields { get; set; }         // JSON 문자열(정형 항목 전체)
        public int ViewCnt { get; set; }
        public DateTime? RegDt { get; set; }
        public string? RegId { get; set; }
    }

    public class CommunityJobListResult
    {
        public List<CommunityJob> Items { get; set; } = new();
    }

    public class CommunityJobCreateDto
    {
        public string Kind { get; set; } = "";
        public string Title { get; set; } = "";
        public string? Author { get; set; }
        public string? Fields { get; set; }         // JSON 문자열
        public string? Pwd { get; set; }
        public long? OffNo { get; set; }
        [JsonConverter(typeof(FlexibleStringConverter))]
        public string? RtNo { get; set; }
        public string? RegId { get; set; }
    }
}
