using RealestateAPI.Shared.Interfaces;
using RealestateAPI.Shared.Services;
using RealestateAPI.Shared.Middleware;

using RealestateAPI.Office.Services;
using RealestateAPI.Realestater.Services;
using RealestateAPI.Admin.Services;
using RealestateAPI.Customer.Services;
using System.Reflection;
using RealestateAPI.Property.Services;
using RealestateAPI.System.Services;
using RealestateAPI.Vendor.Services;
using RealestateAPI.Interview.Services;
using RealestateAPI.Contract.Services;
using RealestateAPI.Schedule.Services;
using System.Text.Json.Serialization;
using RealestateAPI.Hub.Services;
using RealestateAPI.Report.Services;
using RealestateAPI.Memo.Services;
using RealestateAPI.Sms.Services;
using RealestateAPI.Search.Services;
using RealestateAPI.Community.Services;
using RealestateAPI.Domains;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    // XML �ּ� ���� ��� ����
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    c.IncludeXmlComments(xmlPath, includeControllerXmlComments: true);
});






builder.Services.AddHttpContextAccessor(); // app.uid 주입용(요청별 로그인 userId 접근)
builder.Services.AddScoped<IPostgresDataService, PostgresDataService>();
builder.Services.AddScoped<RealestateAPI.Upload.Services.IUploadStagingService, RealestateAPI.Upload.Services.UploadStagingService>();

builder.Services.AddScoped<IOfficeServices, OfficeServices>();
builder.Services.AddScoped<IRealestaterServices, RealestaterServices>();
builder.Services.AddScoped<IRtScheduleServices, RtScheduleServices>();
builder.Services.AddScoped<IMenuServices, MenuServices>();
builder.Services.AddScoped<IInterviewServices, InterviewServices>();
builder.Services.AddScoped<ICustomersServices, CustomersServices>();
builder.Services.AddScoped<ICustomerMemoService, CustomerMemoService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<ICustomersTradeServices, CustomersTradeServices>();
builder.Services.AddScoped<IPropertyServices, PropertyServices>();
builder.Services.AddScoped<RealestateAPI.Search.Services.ISearchService, RealestateAPI.Search.Services.SearchService>();
builder.Services.AddScoped<RealestateAPI.Neobot.Services.INeobotService, RealestateAPI.Neobot.Services.NeobotService>();
builder.Services.AddScoped<RealestateAPI.Expiry.Services.IExpiryService, RealestateAPI.Expiry.Services.ExpiryService>();
builder.Services.AddScoped<RealestateAPI.Community.Services.ICommunityService, RealestateAPI.Community.Services.CommunityService>();
builder.Services.AddScoped<RealestateAPI.Community.Services.ICommunityJobService, RealestateAPI.Community.Services.CommunityJobService>();
builder.Services.AddScoped<IPropertyMemoService, PropertyMemoService>();
builder.Services.AddScoped<ILayoutService, LayoutService>();
builder.Services.AddScoped<ISysCodeServices, SysCodeServices>();
builder.Services.AddScoped<IInterviewServices, InterviewServices>();

builder.Services.AddScoped<IVendorService, VendorService>();

builder.Services.AddScoped<INoticeService, NoticeService>();
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<RealestateAPI.Admin.Services.IEventEntryService, RealestateAPI.Admin.Services.EventEntryService>();
builder.Services.AddScoped<ICustomerCenterService, CustomerCenterService>();
// 관리자 웹(admin, :3003) 전용
builder.Services.AddScoped<RealestateAPI.Admin.Services.IMembershipService, RealestateAPI.Admin.Services.MembershipService>();
builder.Services.AddScoped<RealestateAPI.Admin.Services.IAdminDanjiService, RealestateAPI.Admin.Services.AdminDanjiService>();
builder.Services.AddHttpClient<RealestateAPI.Admin.Services.INaverSyncService, RealestateAPI.Admin.Services.NaverSyncService>();
builder.Services.AddScoped<RealestateAPI.Admin.Services.IAdminMemberService, RealestateAPI.Admin.Services.AdminMemberService>();
builder.Services.AddHttpClient<RealestateAPI.Admin.Services.IPaymentService, RealestateAPI.Admin.Services.PaymentService>();

builder.Services.AddScoped<IContractServices, ContractServices>();
builder.Services.AddScoped<RealestateAPI.Contract.Services.IContractMasterService, RealestateAPI.Contract.Services.ContractMasterService>();
builder.Services.AddScoped<RealestateAPI.Contract.Services.IContractTemplateService, RealestateAPI.Contract.Services.ContractTemplateService>();

builder.Services.AddScoped<RealestateAPI.Common.Services.IFileService, RealestateAPI.Common.Services.FileService>();
builder.Services.AddScoped<RealestateAPI.Realestater.Services.IStaffMenuPermService, RealestateAPI.Realestater.Services.StaffMenuPermService>();

builder.Services.AddScoped<IErrorLogService, ErrorLogService>();
builder.Services.AddScoped<IApiLogService, ApiLogService>();

builder.Services.AddScoped<IHubService, HubService>();

builder.Services.AddScoped<IScheduleServices, ScheduleServices>();

builder.Services.AddScoped<IMemoServices, MemoServices>();
builder.Services.AddScoped<ISmsServices, SmsServices>();

builder.Services.AddScoped<ISystemService, SystemService>();

builder.Services.AddScoped<IDanjiServices, DanjiServices>();

builder.Services.AddScoped<RealestateAPI.AppVersion.Services.IVersionService, RealestateAPI.AppVersion.Services.VersionService>();

builder.Services.AddHttpClient<IApiService, ApiService>();


builder.Services.AddCors(options => {
    options.AddPolicy("AllowAll", builder => {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

// 실시간 쪽지 알림 (SignalR)
builder.Services.AddSignalR();


builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        // 숫자→문자 전역 허용(프론트가 rtNo 등 식별자를 숫자로 보내도 string? 바인딩 성공). 문자→숫자는 NumberHandling 으로 처리.
        options.JsonSerializerOptions.Converters.Add(new RealestateAPI.Shared.Json.FlexibleStringConverter());
        options.JsonSerializerOptions.NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString;
    });



var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors("AllowAll");
app.UseHttpsRedirection();

// 글로벌 예외 처리 미들웨어 (가장 먼저 등록)
app.UseMiddleware<RealestateAPI.Shared.Middleware.AppUserContextMiddleware>(); // 요청별 userId/IP → HttpContext.Items
app.UseMiddleware<GlobalExceptionMiddleware>();

// API 요청 로깅 미들웨어
app.UseMiddleware<ApiLoggingMiddleware>();

app.UseAuthorization();

app.MapControllers();
app.MapHub<RealestateAPI.Hub.Realtime.NoteHub>("/hubs/note");

// ── 헬스체크(로드밸런서용) — DB 미의존, 빠른 200 응답 ──
app.MapMethods("/health", new[] { "GET", "HEAD" }, () => Results.Ok(new { status = "ok" }));
app.MapMethods("/healthz", new[] { "GET", "HEAD" }, () => Results.Ok(new { status = "ok" }));
// DB 연결까지 확인하는 준비상태(readiness) — 필요 시 LB가 사용
app.MapGet("/health/ready", async (RealestateAPI.Shared.Interfaces.IPostgresDataService db) =>
{
    try
    {
        var rows = await db.QueryAsyncPg<dynamic>("DEV", "SELECT 1 AS ok", new List<Npgsql.NpgsqlParameter>());
        return (rows != null && rows.Count > 0) ? Results.Ok(new { status = "ready" }) : Results.StatusCode(503);
    }
    catch { return Results.StatusCode(503); }
});

app.Run();
