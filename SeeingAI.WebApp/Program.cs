using System.Diagnostics;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using SeeingAI.WebApp.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages();

builder.Services.AddSingleton(_ => new ActivitySource("SeeingAI.IncidentSimulation"));
builder.Services.AddSingleton<IncidentSimulationService>();
builder.Services.AddSingleton<ImageAnalysisService>();

builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService("SeeingAI.WebApp"))
    .WithTracing(tracing => tracing.AddSource("SeeingAI.IncidentSimulation"))
    .UseAzureMonitor();

builder.Logging.AddOpenTelemetry(logging =>
{
    logging.IncludeScopes = true;
    logging.IncludeFormattedMessage = true;
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseRouting();

app.UseAuthorization();

app.MapStaticAssets();
app.MapRazorPages()
   .WithStaticAssets();

app.MapPost("/api/incidents/trigger", (IncidentSimulationService simulator, IncidentRequest request) =>
{
    var result = simulator.TriggerIncident(request);
    return Results.Ok(result);
})
.WithName("TriggerIncident")
.WithSummary("Simulate a production incident and emit telemetry");

app.MapPost("/api/seeingai/analyze", async Task<IResult> (HttpRequest request, ImageAnalysisService analyzer, ILogger<ImageAnalysisService> logger) =>
{
    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("image");

    if (file is null || file.Length == 0)
    {
        return Results.BadRequest(new { message = "No image supplied for analysis." });
    }

    try
    {
        var result = await analyzer.AnalyzeAsync(file);
        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Image analysis failed for {FileName}", file.FileName);
        throw;
    }
})
.WithName("AnalyzeImage")
.WithSummary("Analyze an image and deliberately surface failure scenarios");

app.Run();
