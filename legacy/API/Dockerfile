# ============================================================
# 백엔드 API (.NET 8, ASP.NET) Docker — 포트 5002
# ============================================================

# 1. Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# 복원(캐시 최적화: csproj 먼저)
COPY RealestateAPI.csproj ./
RUN dotnet restore RealestateAPI.csproj

# 소스 복사 후 퍼블리시
COPY . .
RUN dotnet publish RealestateAPI.csproj -c Release -o /app/publish /p:UseAppHost=false

# 2. Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish ./

# 컨테이너는 HTTP 5002로 수신 (TLS는 앞단 LB/프록시에서 종료)
ENV ASPNETCORE_URLS=http://+:5002
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_RUNNING_IN_CONTAINER=true

EXPOSE 5002

ENTRYPOINT ["dotnet", "RealestateAPI.dll"]
