using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace SeeingAI.WebApp.Services;

public sealed record IncidentRequest(string? Scenario);

public sealed record IncidentSimulationResult(
    string Scenario,
    string ErrorType,
    string ErrorMessage,
    string RootCauseCategory,
    string ImpactLevel,
    int EstimatedAffectedUsers,
    bool PotentialDataLoss,
    string SuggestedFix,
    string CorrelationId,
    DateTimeOffset OccurredAt,
    IDictionary<string, string> Properties);

public sealed class IncidentSimulationService
{
    private readonly ILogger<IncidentSimulationService> _logger;
    private readonly ActivitySource _activitySource;

    public IncidentSimulationService(ILogger<IncidentSimulationService> logger, ActivitySource activitySource)
    {
        _logger = logger;
        _activitySource = activitySource;
    }

    public IncidentSimulationResult TriggerIncident(IncidentRequest request)
    {
        var scenario = string.IsNullOrWhiteSpace(request?.Scenario)
            ? "Seeing AI Production Incident"
            : request.Scenario.Trim();

        var correlationId = Guid.NewGuid().ToString();
        var occurredAt = DateTimeOffset.UtcNow;

        var properties = new Dictionary<string, string>
        {
            ["issueType"] = "Database Connectivity",
            ["errorType"] = "ConnectionPoolExhaustedException",
            ["context"] = scenario,
            ["sourceFile"] = "AnalysisRepository.cs",
            ["sourceLine"] = "156",
            ["serverComponent"] = "SQLConnectionManager",
            ["environment"] = "production",
            ["region"] = "westus2",
            ["instanceId"] = Environment.MachineName,
            ["correlationId"] = correlationId,
            ["alertTriggered"] = "true",
            ["dashboardLink"] = "https://portal.azure.com/#blade/AppInsightsExtension/FailuresBlade"
        };

        using var activity = _activitySource.StartActivity("IncidentSimulation", ActivityKind.Producer);
        if (activity != null)
        {
            activity.SetTag("incident.scenario", scenario);
            activity.SetTag("incident.errorType", properties["errorType"]);
            activity.SetTag("incident.correlationId", correlationId);
            activity.SetTag("incident.impactLevel", "Critical");
            activity.SetTag("incident.affectedUsers", 3285);
        }

        const string errorMessage = "Database connection pool exhausted. Active connections: 100/100. Wait timeout exceeded.";

        _logger.LogError(
            new EventId(5001, "ProductionIncident"),
            "🚨 Production incident triggered: {Message} (CorrelationId: {CorrelationId})",
            errorMessage,
            correlationId);

        _logger.LogInformation("Incident properties {@Properties}", properties);

        return new IncidentSimulationResult(
            Scenario: scenario,
            ErrorType: properties["errorType"],
            ErrorMessage: errorMessage,
            RootCauseCategory: "Database Connectivity",
            ImpactLevel: "Critical",
            EstimatedAffectedUsers: 3285,
            PotentialDataLoss: false,
            SuggestedFix: "Recycle the connection pool and scale out the SQL database tier.",
            CorrelationId: correlationId,
            OccurredAt: occurredAt,
            Properties: properties);
    }
}
