FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY SnapshotService/SnapshotService.csproj SnapshotService/
RUN dotnet restore SnapshotService/SnapshotService.csproj

COPY SnapshotService/ SnapshotService/
RUN dotnet publish SnapshotService/SnapshotService.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SnapshotService.dll"]
