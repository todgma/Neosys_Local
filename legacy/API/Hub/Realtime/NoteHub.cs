using Microsoft.AspNetCore.SignalR;

namespace RealestateAPI.Hub.Realtime
{
    /// <summary>
    /// 쪽지 실시간 알림 허브.
    /// 클라이언트는 연결 시 쿼리스트링 ?userId=... 로 접속하며,
    /// 서버는 사용자 ID별 그룹(user:{userId})으로 푸시한다.
    /// (동접 1,000+ 규모 무리 없음 — 알림 빈도 낮음)
    /// </summary>
    public class NoteHub : Microsoft.AspNetCore.SignalR.Hub
    {
        public static string GroupName(string userId) => $"user:{userId}";

        public override async Task OnConnectedAsync()
        {
            var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString();
            if (!string.IsNullOrWhiteSpace(userId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(userId));
            }
            await base.OnConnectedAsync();
        }
    }
}
